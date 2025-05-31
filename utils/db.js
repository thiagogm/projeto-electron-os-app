// electron-os-app/utils/db.js
const { MongoClient, ObjectId } = require('mongodb');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017';
const DB_NAME = 'app_os_db';

let client;
let db;
let connectionStatusSubscribers = [];

async function connectDB() {
    if (db) return db;
    try {
        client = new MongoClient(MONGO_URI);
        await client.connect();
        db = client.db(DB_NAME);
        console.log('MongoDB conectado com sucesso!');
        notifySubscribers(true);
        return db;
    } catch (error) {
        console.error('Falha ao conectar ao MongoDB:', error);
        notifySubscribers(false);
        // Tentar reconectar após um tempo pode ser uma estratégia
        // setTimeout(connectDB, 5000);
        throw error; // Re-throw para que o chamador saiba que falhou
    }
}

async function disconnectDB() {
    if (client) {
        await client.close();
        client = null;
        db = null;
        console.log('MongoDB desconectado.');
        notifySubscribers(false);
    }
}

function getDB() {
    if (!db) {
        console.warn("DB não conectado. Tentando conectar...");
        // Não é ideal chamar connectDB aqui de forma síncrona,
        // mas para simplificar o exemplo. O ideal é garantir a conexão antes.
        connectDB().catch(err => console.error("Tentativa de conexão automática falhou", err));
    }
    return db;
}

function subscribeToConnectionStatus(callback) {
    connectionStatusSubscribers.push(callback);
    // Notificar imediatamente com o status atual se já conectado/desconectado
    if (db) callback(true); else callback(false);
}

function notifySubscribers(isConnected) {
    connectionStatusSubscribers.forEach(callback => callback(isConnected));
}

module.exports = { connectDB, disconnectDB, getDB, ObjectId, subscribeToConnectionStatus };