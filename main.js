// electron-os-app/main.js
const { app, BrowserWindow, ipcMain, Menu, shell } = require('electron');
const path = require('path');
const mongoose = require('mongoose');

const Client = require('./Models/client_schema.js');
const ServiceOrder = require('./Models/os_schema.js');
const { connectDB, disconnectDB, ObjectId, subscribeToConnectionStatus } = require('./utils/db');

let mainWindow;
let dbConnectionStatus = false;

function navigateToPage(pagePath) {
    if (mainWindow) {
        const fullPath = path.join(__dirname, `views/${pagePath}`);
        console.log(`Menu: Navegando para ${fullPath}`);
        mainWindow.loadFile(fullPath);
    } else {
        console.error("Menu: mainWindow não está definida para navigateToPage.");
    }
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1366, height: 768,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true, nodeIntegration: false, enableRemoteModule: false
        },
        icon: path.join(__dirname, 'assets/icons/app_logo_grande.png')
    });
    mainWindow.loadFile(path.join(__dirname, 'views/index.html'));
    mainWindow.on('closed', () => { mainWindow = null; });

    connectDB()
        .then(() => {
            dbConnectionStatus = true;
            if (mainWindow && !mainWindow.isDestroyed() && mainWindow.webContents) {
                mainWindow.webContents.send('db-status-updated', { connected: true });
            }
        })
        .catch((err) => {
            console.error("Falha inicial ao conectar ao DB (Mongoose):", err);
            dbConnectionStatus = false;
            if (mainWindow && !mainWindow.isDestroyed() && mainWindow.webContents) {
                mainWindow.webContents.send('db-status-updated', { connected: false });
            }
        });
    subscribeToConnectionStatus((isConnected) => {
        dbConnectionStatus = isConnected;
        if (mainWindow && !mainWindow.isDestroyed() && mainWindow.webContents) {
            mainWindow.webContents.send('db-status-updated', { connected: isConnected });
        }
    });
}

const menuTemplate = [
    {
        label: 'Arquivo', 
        submenu: [
            // { label: 'Configurações', click: () => navigateToPage('settings.html') },
            { type: 'separator' },
            { label: 'Sair', accelerator: 'CmdOrCtrl+Q', click: () => app.quit() }
        ]
    },
    {
        label: 'Relatórios',
        submenu: [
            { label: 'Clientes', click: () => navigateToPage('relatorios/rel_clientes.html') },
            { label: 'OS Abertas', click: () => navigateToPage('relatorios/rel_os_abertas.html') },
            { label: 'OS Finalizadas', click: () => navigateToPage('relatorios/rel_os_finalizadas.html') }
        ]
    },
    {
        label: 'Ferramentas',
        submenu: [
            { label: 'Recarregar Janela', accelerator: 'CmdOrCtrl+R', click: () => mainWindow?.webContents.reloadIgnoringCache() },
            { label: 'Forçar Recarregamento', accelerator: 'CmdOrCtrl+Shift+R', click: () => mainWindow?.webContents.reload() },
            { type: 'separator' },
            { label: 'Zoom+', accelerator: 'CmdOrCtrl+=', click: () => mainWindow && (mainWindow.webContents.zoomFactor += 0.1) },
            { label: 'Zoom-', accelerator: 'CmdOrCtrl+-', click: () => mainWindow && (mainWindow.webContents.zoomFactor -= 0.1) },
            { label: 'Zoom Padrão', accelerator: 'CmdOrCtrl+0', click: () => mainWindow && (mainWindow.webContents.zoomFactor = 1) },
            { type: 'separator' },
            { label: 'Alternar DevTools', accelerator: 'CmdOrCtrl+Shift+I', click: () => mainWindow?.webContents.toggleDevTools() }
        ]
    },
    {
        label: 'Ajuda',
        role: 'help',
        submenu: [
            { label: 'Repositório GitHub', click: async () => await shell.openExternal('https://github.com/thiagogm/projeto-electron-os-app') },
            { type: 'separator' },
            {
                label: 'Sobre', click: () => {
                    const aboutWindow = new BrowserWindow({
                        width: 450, height: 350, resizable: false, title: 'Sobre o Sistema OS',
                        parent: mainWindow, modal: true,
                        webPreferences: { preload: path.join(__dirname, 'preload_empty.js'), contextIsolation: true },
                        icon: path.join(__dirname, 'assets/icons/app_logo_grande.png')
                    });
                    aboutWindow.loadFile(path.join(__dirname, 'views/sobre.html'));
                    aboutWindow.setMenu(null);
                }
            }
        ]
    }
];

// --- Handlers IPC ---
ipcMain.on('navigate-to', (event, pageFile) => {
    if (mainWindow) mainWindow.loadFile(path.join(__dirname, `views/${pageFile}`));
});
ipcMain.handle('get-initial-db-status', async () => ({ connected: dbConnectionStatus }));

async function getNextOsNumberFromDB_Native() {
    if (!dbConnectionStatus) return 'OS-FALLBACK-00001';
    const db = mongoose.connection.db; 
    if (!db) return 'OS-NODB-00001';
    try {
        const counterCollection = db.collection('counters');
        const result = await counterCollection.findOneAndUpdate(
            { _id: 'osNumber' }, { $inc: { sequence_value: 1 } },
            { returnDocument: 'after', upsert: true }
        );
        const nextVal = result?.value?.sequence_value ?? 1;
        return `OS-${String(nextVal).padStart(5, '0')}`;
    } catch (error) {
        console.error("Erro ao gerar próximo número de OS:", error);
        return `OS-ERR${Date.now().toString().slice(-4)}`;
    }
}
ipcMain.handle('get-next-os-number', getNextOsNumberFromDB_Native);

// --- CRUD Ordens de Serviço (OS) ---
ipcMain.handle('add-os', async (event, osData) => {
    if (!dbConnectionStatus) return { success: false, message: 'Banco de dados não conectado.' };
    try {
        console.log("[main.js add-os] osData.clientId recebido:", osData.clientId, "Tipo:", typeof osData.clientId);
        // Garantir que clientId seja um ObjectId válido se for uma string
        if (osData.clientId && typeof osData.clientId === 'string' && ObjectId.isValid(osData.clientId)) {
            osData.clientId = new ObjectId(osData.clientId);
        } else if (osData.clientId && typeof osData.clientId !== 'object') { // Se não for string válida nem objeto ObjectId
             console.error("[main.js add-os] clientId inválido:", osData.clientId);
             return { success: false, message: 'ID do Cliente inválido para a OS.' };
        }

        const serviceOrder = new ServiceOrder(osData);
        const savedOs = await serviceOrder.save();
        return { success: true, id: savedOs._id.toString(), osNumber: savedOs.osNumber, message: 'Ordem de Serviço cadastrada!' };
    } catch (error) {
        console.error("Erro Mongoose ao adicionar OS:", error);
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return { success: false, message: `Erro de validação na OS: ${messages.join('. ')}` };
        }
        if (error.code === 11000) return { success: false, message: `Erro: Número da OS (${osData.osNumber}) já existe.` };
        return { success: false, message: `Erro ao adicionar OS: ${error.message}` };
    }
});

ipcMain.handle('get-os-list-paginated', async (event, { page = 1, limit = 10, searchTerm = '', filters = {} }) => {
    if (!dbConnectionStatus) return { success: false, data: [], totalCount: 0, message: 'Banco de dados não conectado.' };
    try {
        const skip = (Number(page) - 1) * Number(limit);
        let query = {};
        if (filters.status) query.status = filters.status;
        if (searchTerm) {
            const regex = new RegExp(searchTerm.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&'), 'i');
            query.$or = [ { osNumber: { $regex: regex } }, { clientName: { $regex: regex } }, { equipment: { $regex: regex } } ];
        }
        const osList = await ServiceOrder.find(query).sort({ entryDate: -1 }).skip(skip).limit(Number(limit)).lean().exec();
        const totalCount = await ServiceOrder.countDocuments(query).exec();
        // Garantir que _id seja string para todos os itens
        const dataWithStringIds = osList.map(os => ({ ...os, _id: os._id.toString(), clientId: os.clientId?.toString() }));
        return { success: true, data: dataWithStringIds, totalCount };
    } catch (error) {
        console.error("Erro Mongoose ao buscar OS com paginação:", error);
        return { success: false, data: [], totalCount: 0, message: `Erro ao buscar OS: ${error.message}` };
    }
});

ipcMain.handle('get-os-by-id', async (event, osId) => {
    if (!dbConnectionStatus) return { success: false, data: null, message: 'Banco de dados não conectado.' };
    try {
        if (!ObjectId.isValid(osId)) return { success: false, data: null, message: 'ID da OS inválido.' };
        const serviceOrder = await ServiceOrder.findById(osId).lean().exec();
        if (!serviceOrder) return { success: false, data: null, message: 'OS não encontrada.' };
        // Garantir que _id e clientId sejam strings
        const dataWithStringIds = { ...serviceOrder, _id: serviceOrder._id.toString(), clientId: serviceOrder.clientId?.toString() };
        return { success: true, data: dataWithStringIds };
    } catch (error) {
        console.error("Erro Mongoose ao buscar OS por ID:", error);
        return { success: false, data: null, message: `Erro ao buscar OS: ${error.message}` };
    }
});

ipcMain.handle('update-os', async (event, osId, osData) => {
    if (!dbConnectionStatus) return { success: false, message: 'Banco de dados não conectado.' };
    if (!ObjectId.isValid(osId)) return { success: false, message: 'ID da OS inválido.' };
    try {
        const serviceOrderToUpdate = await ServiceOrder.findById(osId);
        if (!serviceOrderToUpdate) return { success: false, message: 'OS não encontrada para atualização.' };

        // Garantir que clientId seja ObjectId se fornecido como string
        if (osData.clientId && typeof osData.clientId === 'string' && ObjectId.isValid(osData.clientId)) {
            osData.clientId = new ObjectId(osData.clientId);
        } else if (osData.clientId && typeof osData.clientId !== 'object') {
            return { success: false, message: 'ID do Cliente inválido para a OS (update).' };
        }
        
        Object.keys(osData).forEach(key => {
            if (key !== '_id') serviceOrderToUpdate[key] = osData[key];
        });
        if (osData.clientId && serviceOrderToUpdate.isModified('clientId')) {
            const client = await Client.findById(osData.clientId).lean().exec();
            if (client) {
                serviceOrderToUpdate.clientName = client.name;
                serviceOrderToUpdate.clientCpf = client.cpf;
                serviceOrderToUpdate.clientPhone = client.phone;
            } else {
                serviceOrderToUpdate.clientName = 'Cliente não encontrado';
            }
        }
        const updatedOs = await serviceOrderToUpdate.save();
        return { success: true, message: 'Ordem de Serviço atualizada!', data: { ...updatedOs.toObject(), _id: updatedOs._id.toString() } };
    } catch (error) {
        console.error("Erro Mongoose ao atualizar OS:", error);
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return { success: false, message: `Erro de validação na OS: ${messages.join('. ')}` };
        }
        return { success: false, message: `Erro ao atualizar OS: ${error.message}` };
    }
});

ipcMain.handle('delete-os', async (event, osId) => {
    if (!dbConnectionStatus) return { success: false, message: 'Banco de dados não conectado.' };
    if (!ObjectId.isValid(osId)) return { success: false, message: 'ID da OS inválido.' };
    try {
        const result = await ServiceOrder.findByIdAndDelete(osId).exec();
        if (!result) return { success: false, message: 'OS não encontrada para exclusão.' };
        return { success: true, message: 'Ordem de Serviço excluída!' };
    } catch (error) {
        console.error("Erro Mongoose ao excluir OS:", error);
        return { success: false, message: `Erro ao excluir OS: ${error.message}` };
    }
});

// --- CRUD Clientes ---
ipcMain.handle('add-client', async (event, clientData) => {
    if (!dbConnectionStatus) return { success: false, message: 'Banco de dados não conectado.' };
    try {
        const newClient = new Client(clientData);
        const savedClient = await newClient.save();
        return { success: true, id: savedClient._id.toString(), message: 'Cliente cadastrado com sucesso!' };
    } catch (error) {
        console.error("Erro Mongoose ao adicionar cliente:", error);
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return { success: false, message: `Erro de validação: ${messages.join('. ')}` };
        }
        if (error.code === 11000) return { success: false, duplicateCpf: true, message: 'Erro: CPF já existe.' };
        return { success: false, message: `Erro interno ao adicionar cliente: ${error.message}` };
    }
});

ipcMain.handle('get-clients-paginated', async (event, { page = 1, limit = 10, searchTerm = '' }) => {
    if (!dbConnectionStatus) return { success: false, data: [], totalCount: 0, message: 'Banco de dados não conectado.' };
    try {
        const skip = (Number(page) - 1) * Number(limit);
        let query = {};
        if (searchTerm) {
            const regex = new RegExp(searchTerm.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&'), 'i');
            const cpfLimpo = searchTerm.replace(/\D/g, '');
            query.$or = [{ name: { $regex: regex } }];
            if (cpfLimpo.length > 0 && /^\d+$/.test(cpfLimpo)) {
                 query.$or.push({ cpf: { $regex: `^${cpfLimpo}` } });
            }
        }
        const clients = await Client.find(query).sort({ name: 1 }).skip(skip).limit(Number(limit)).lean().exec();
        const totalCount = await Client.countDocuments(query).exec();
        const dataWithStringIds = clients.map(client => ({ ...client, _id: client._id.toString() }));
        return { success: true, data: dataWithStringIds, totalCount };
    } catch (error) {
        console.error("Erro Mongoose ao buscar clientes com paginação:", error);
        return { success: false, data: [], totalCount: 0, message: `Erro ao buscar clientes: ${error.message}` };
    }
});

ipcMain.handle('get-client-by-id', async (event, clientId) => {
    if (!dbConnectionStatus) return { success: false, data: null, message: 'Banco de dados não conectado.' };
    try {
        if (!ObjectId.isValid(clientId)) return { success: false, data: null, message: 'ID do Cliente inválido.' };
        const client = await Client.findById(clientId).lean().exec();
        if (!client) return { success: false, data: null, message: 'Cliente não encontrado.' };
        const dataWithStringId = { ...client, _id: client._id.toString() };
        return { success: true, data: dataWithStringId };
    } catch (error) {
        console.error("Erro Mongoose ao buscar cliente por ID:", error);
        return { success: false, data: null, message: `Erro ao buscar cliente: ${error.message}` };
    }
});

ipcMain.handle('update-client', async (event, clientId, clientData) => {
    if (!dbConnectionStatus) return { success: false, message: 'Banco de dados não conectado.' };
    if (!ObjectId.isValid(clientId)) return { success: false, message: 'ID do Cliente inválido.' };
    try {
        const clientToUpdate = await Client.findById(clientId);
        if (!clientToUpdate) return { success: false, message: 'Cliente não encontrado para atualização.' };

        Object.keys(clientData).forEach(key => {
            if (key !== '_id') clientToUpdate[key] = clientData[key];
        });
        
        if (clientToUpdate.isModified('cpf') && clientData.cpf) { // Verifica se CPF foi modificado e existe
            const existingClient = await Client.findOne({ cpf: clientToUpdate.cpf, _id: { $ne: new ObjectId(clientId) } }).exec();
            if (existingClient) {
                return { success: false, duplicateCpf: true, message: 'Este CPF já pertence a outro cliente.' };
            }
        }
        const updatedClient = await clientToUpdate.save();
        return { success: true, message: 'Cliente atualizado!', data: { ...updatedClient.toObject(), _id: updatedClient._id.toString() } };
    } catch (error) {
        console.error("Erro Mongoose ao atualizar cliente:", error);
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return { success: false, message: `Erro de validação: ${messages.join('. ')}` };
        }
        if (error.code === 11000) return { success: false, duplicateCpf: true, message: 'Erro: CPF já existe (update).' };
        return { success: false, message: `Erro interno ao atualizar cliente: ${error.message}` };
    }
});

ipcMain.handle('delete-client', async (event, clientId) => {
    if (!dbConnectionStatus) return { success: false, message: 'Banco de dados não conectado.' };
    if (!ObjectId.isValid(clientId)) return { success: false, message: 'ID do Cliente inválido.' };
    try {
        const osCount = await ServiceOrder.countDocuments({ clientId: new ObjectId(clientId) }).exec();
        if (osCount > 0) {
            return { success: false, message: `Cliente possui ${osCount} OS associada(s) e não pode ser excluído.` };
        }
        const result = await Client.findByIdAndDelete(clientId).exec();
        if (!result) return { success: false, message: 'Cliente não encontrado para exclusão.' };
        return { success: true, message: 'Cliente excluído com sucesso!' };
    } catch (error) {
        console.error("Erro Mongoose ao excluir cliente:", error);
        return { success: false, message: `Erro ao excluir cliente: ${error.message}` };
    }
});

ipcMain.handle('find-client-by-cpf', async (event, cpf) => {
    if (!dbConnectionStatus) return null; 
    try {
        const client = await Client.findOne({ cpf: cpf.replace(/\D/g, '') }).lean().exec();
        if (client && client._id) {
            return { ...client, _id: client._id.toString() }; // Garante que _id é string
        }
        return null;
    } catch (error) {
        console.error("Erro Mongoose ao buscar cliente por CPF:", error);
        return null;
    }
});

ipcMain.handle('search-clients', async (event, searchTerm) => {
    if (!dbConnectionStatus) return [];
    try {
        const regex = new RegExp(searchTerm.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&'), 'i');
        const cpfLimpo = searchTerm.replace(/\D/g, '');
        let queryConditions = [{ name: { $regex: regex } }];
        if (cpfLimpo.length > 0 && /^\d+$/.test(cpfLimpo)) {
             queryConditions.push({ cpf: { $regex: `^${cpfLimpo}` } });
        }
        const query = { $or: queryConditions };
        const clients = await Client.find(query).sort({name: 1}).limit(10).lean().exec();
        // Garantir que _id seja string para todos os clientes retornados
        return clients.map(client => ({ ...client, _id: client._id.toString() }));
    } catch (error) {
        console.error("Erro Mongoose ao buscar clientes (search-clients):", error);
        return [];
    }
});

ipcMain.handle('fetch-cep', async (event, cep) => {
    try {
        const fetch = (await import('node-fetch')).default;
        const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
        if (!response.ok) {
            console.error(`Erro na API ViaCEP: ${response.status} ${response.statusText} para CEP ${cep}`);
            return { erro: true, message: `Falha ao buscar CEP: ${response.statusText}` };
        }
        return await response.json();
    } catch (error) {
        console.error("Erro ao chamar API ViaCEP (fetch-cep):", error);
        return { erro: true, message: `Erro de conexão ao buscar CEP: ${error.message}` };
    }
});

// --- Lógica App Electron ---
app.whenReady().then(() => {
    const menu = Menu.buildFromTemplate(menuTemplate);
    Menu.setApplicationMenu(menu);
    createWindow();
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});
app.on('will-quit', async () => { await disconnectDB(); });
