// electron-os-app/utils/db.js
const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/app_os_db';
let connectionStatusSubscribers = [];
let currentDbConnectionState = false; // Flag interna para o estado da conexão
let connectionAttempted = false;    // Flag para saber se uma tentativa de conexão já ocorreu

// --- Listeners de Eventos da Conexão Mongoose ---
// Estes listeners ajudam a manter o currentDbConnectionState atualizado
// e a notificar os subscribers sobre mudanças de estado.

mongoose.connection.on('connected', () => {
    console.log('Mongoose: Conectado ao MongoDB em', MONGO_URI);
    currentDbConnectionState = true;
    notifySubscribers(true);
});

mongoose.connection.on('error', (err) => {
    console.error('Mongoose: Erro de conexão com MongoDB:', err);
    currentDbConnectionState = false;
    notifySubscribers(false);
    // O Mongoose tentará reconectar automaticamente por padrão (até certo ponto)
});

mongoose.connection.on('disconnected', () => {
    console.log('Mongoose: Desconectado do MongoDB.');
    currentDbConnectionState = false;
    notifySubscribers(false);
});

mongoose.connection.on('reconnected', () => {
    console.log('Mongoose: Reconectado ao MongoDB.');
    currentDbConnectionState = true;
    notifySubscribers(true);
});

// Chamado quando o processo Node.js é encerrado
process.on('SIGINT', async () => {
    await mongoose.connection.close();
    console.log('Mongoose: Conexão com MongoDB fechada devido ao término da aplicação.');
    process.exit(0);
});


/**
 * Conecta-se ao MongoDB usando Mongoose.
 * Retorna a instância nativa do DB da conexão Mongoose se precisar.
 */
async function connectDB() {
    connectionAttempted = true;
    // 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
    if (mongoose.connection.readyState === 1) {
        console.log('Mongoose: Já conectado.');
        currentDbConnectionState = true; // Garante que o estado esteja correto
        notifySubscribers(true); // Notifica caso algum subscriber tenha se inscrito antes da conexão inicial
        return mongoose.connection.db;
    }
    // Evita múltiplas tentativas de conexão simultâneas se já estiver conectando
    if (mongoose.connection.readyState === 2) {
        console.log('Mongoose: Conexão já em progresso.');
        // Espera a conexão existente ser resolvida
        return new Promise((resolve, reject) => {
            mongoose.connection.once('connected', () => resolve(mongoose.connection.db));
            mongoose.connection.once('error', err => reject(err));
        });
    }

    try {
        console.log('Mongoose: Tentando conectar a', MONGO_URI);
        await mongoose.connect(MONGO_URI, {
            // Opções como useNewUrlParser, useUnifiedTopology, useCreateIndex, useFindAndModify
            // não são mais necessárias no Mongoose 6+ e podem causar erros se usadas.
            // Mongoose 6+ usa por padrão as configurações que essas opções habilitavam.
            // serverSelectionTimeoutMS: 5000, // Exemplo: tempo para tentar selecionar um servidor
        });
        // O listener 'connected' já tratará o log e a notificação.
        // currentDbConnectionState e notifySubscribers serão chamados pelo listener 'connected'.
        return mongoose.connection.db;
    } catch (error) {
        // O listener 'error' já tratará o log e a notificação.
        // No entanto, precisamos 'throw error' para que a Promise de connectDB() seja rejeitada
        // e o .catch() no main.js (em createWindow) possa pegar.
        // currentDbConnectionState e notifySubscribers serão chamados pelo listener 'error'.
        throw error;
    }
}

/**
 * Desconecta do MongoDB.
 */
async function disconnectDB() {
    if (mongoose.connection.readyState >= 1 && mongoose.connection.readyState !== 3) { // Se conectado ou conectando
        try {
            await mongoose.disconnect();
            // O listener 'disconnected' já tratará o log e a notificação.
        } catch (error) {
            console.error("Mongoose: Erro ao desconectar:", error);
        }
    } else {
        console.log("Mongoose: Já estava desconectado ou desconectando.");
    }
}

/**
 * Retorna a instância do Mongoose (a própria biblioteca).
 * Útil se você precisar acessar mongoose.Schema, mongoose.Types, etc., em outros lugares,
 * embora seja comum importar 'mongoose' diretamente onde necessário.
 * @returns {mongoose} A instância do Mongoose.
 */
function getMongooseInstance() {
    return mongoose;
}

/**
 * Permite que outras partes do aplicativo se inscrevam para receber atualizações de status da conexão.
 * @param {function(boolean): void} callback - Função a ser chamada quando o status da conexão mudar.
 */
function subscribeToConnectionStatus(callback) {
    if (typeof callback === 'function') {
        connectionStatusSubscribers.push(callback);
        // Notifica o novo subscriber com o estado atual imediatamente.
        // Se nenhuma tentativa de conexão foi feita, assume-se desconectado.
        callback(connectionAttempted ? currentDbConnectionState : false);
    }
}

/**
 * Notifica todos os subscribers sobre uma mudança no status da conexão.
 * Esta função é chamada internamente pelos listeners de evento do Mongoose e connectDB/disconnectDB.
 * @param {boolean} isConnected - O novo status da conexão.
 */
function notifySubscribers(isConnected) {
    // Não é mais necessário atualizar currentDbConnectionState aqui,
    // pois os listeners de evento do mongoose já o fazem.
    // Esta função apenas itera e chama os callbacks.
    // No entanto, para consistência, se chamada diretamente, podemos manter:
    currentDbConnectionState = isConnected; 
    
    connectionStatusSubscribers.forEach(callback => {
        if (typeof callback === 'function') {
            try {
                callback(isConnected);
            } catch (error) {
                console.error("Erro ao notificar subscriber do status do DB:", error);
            }
        }
    });
}

module.exports = {
    connectDB,
    disconnectDB,
    getMongooseInstance,
    ObjectId: mongoose.Types.ObjectId, // Exporta ObjectId do Mongoose para consistência
    subscribeToConnectionStatus
    // Não exportamos mais 'getDB' nos moldes antigos.
    // Se for absolutamente necessário o objeto 'db' nativo, ele é retornado por connectDB()
    // ou acessível via mongoose.connection.db após a conexão.
};