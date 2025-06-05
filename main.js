// electron-os-app/main.js
const { app, BrowserWindow, ipcMain, Menu, shell, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const mongoose = require('mongoose');
const { jsPDF } = require('jspdf');

// Modelos Mongoose
const Client = require('./Models/client_schema.js');
const ServiceOrder = require('./Models/os_schema.js');

// Utilitários de DB (Mongoose)
const { connectDB, disconnectDB, ObjectId, subscribeToConnectionStatus } = require('./utils/db');

let mainWindow;
let dbConnectionStatus = false;

function navigateToPage(pagePath) {
    if (mainWindow && !mainWindow.isDestroyed()) {
        const fullPath = path.join(__dirname, `views/${pagePath}`);
        console.log(`Menu: Navegando para ${fullPath}`);
        mainWindow.loadFile(fullPath);
    } else {
        console.error("Menu: mainWindow não está definida ou foi destruída para navigateToPage.");
    }
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1366,
        height: 768,
        webPreferences: { 
            preload: path.join(__dirname, 'preload.js'), 
            contextIsolation: true,
            nodeIntegration: false,
            enableRemoteModule: false,
            sandbox: false,
            webSecurity: true,
            allowRunningInsecureContent: false,
            spellcheck: false,
            defaultEncoding: 'UTF-8'
        },
        icon: path.join(__dirname, 'assets/icons/app_logo_grande.png')
    });

    // Configurar CSP headers
    mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
        callback({
            responseHeaders: {
                ...details.responseHeaders,
                'Content-Security-Policy': [
                    "default-src 'self';",
                    "connect-src 'self' https://viacep.com.br;",
                    "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://unpkg.com;",
                    "script-src-elem 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://unpkg.com;",
                    "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net;",
                    "img-src 'self' data:;",
                    "font-src 'self' https://cdn.jsdelivr.net https://unpkg.com;"
                ].join(' ')
            }
        });
    });

    // Habilitar DevTools para debug
    if (process.env.NODE_ENV === 'development') {
        mainWindow.webContents.openDevTools();
    }

    mainWindow.loadFile(path.join(__dirname, 'views/index.html'));

    // Configurar zoom padrão
    mainWindow.webContents.setZoomFactor(1.0);

    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    connectDB()
        .then(() => {
            dbConnectionStatus = true;
            if (mainWindow && !mainWindow.isDestroyed() && mainWindow.webContents && !mainWindow.webContents.isDestroyed()) {
                mainWindow.webContents.send('db-status-updated', { connected: true });
            }
        })
        .catch((err) => {
            console.error("Falha inicial ao conectar ao DB (Mongoose):", err);
            dbConnectionStatus = false;
            if (mainWindow && !mainWindow.isDestroyed() && mainWindow.webContents && !mainWindow.webContents.isDestroyed()) {
                mainWindow.webContents.send('db-status-updated', { connected: false });
            }
        });

    subscribeToConnectionStatus((isConnected) => {
        dbConnectionStatus = isConnected;
        if (mainWindow && !mainWindow.isDestroyed() && mainWindow.webContents && !mainWindow.webContents.isDestroyed()) {
            mainWindow.webContents.send('db-status-updated', { connected: isConnected });
        }
    });
}

function formatarCPFParaRelatorio(cpf) {
    if (!cpf) return '';
    const cpfLimpo = cpf.toString().replace(/\D/g, '');
    if (cpfLimpo.length === 11) return cpfLimpo.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    return cpf;
}
function formatarTelefoneParaRelatorio(tel) {
    if (!tel) return '';
    const telLimpo = tel.toString().replace(/\D/g, '');
    if (telLimpo.length === 11) return `(${telLimpo.substring(0,2)}) ${telLimpo.substring(2,7)}-${telLimpo.substring(7,11)}`;
    if (telLimpo.length === 10) return `(${telLimpo.substring(0,2)}) ${telLimpo.substring(2,6)}-${telLimpo.substring(6,10)}`;
    return tel;
}

function generateClientsReportHTML(clients) {
    let rows = '';
    clients.forEach(client => {
        rows += `<tr> <td>${client.name || ''}</td> <td>${client.cpf ? formatarCPFParaRelatorio(client.cpf) : ''}</td> <td>${client.phone ? formatarTelefoneParaRelatorio(client.phone) : ''}</td> <td>${client.email || ''}</td> <td>${client.city || ''}${client.state ?` - ${client.state}`: ''}</td> </tr>`;
    });
    return `<html><head><meta charset="UTF-8"><title>Relatório de Clientes</title><style>body{font-family:Arial,sans-serif;margin:20px;font-size:10pt;}table{width:100%;border-collapse:collapse;margin-top:15px;}th,td{border:1px solid #ccc;padding:6px;text-align:left;}th{background-color:#f0f0f0;font-weight:bold;}h1{text-align:center;font-size:16pt;margin-bottom:5px;}p{font-size:9pt;text-align:center;margin-bottom:20px;}</style></head> <body><h1>Relatório de Clientes</h1><p>Gerado em: ${new Date().toLocaleString('pt-BR')}</p> <table><thead><tr><th>Nome</th><th>CPF</th><th>Telefone</th><th>Email</th><th>Cidade/UF</th></tr></thead><tbody>${rows}</tbody></table></body></html>`;
}

function generateServiceOrdersReportHTML(orders, title) {
    let rows = '';
    orders.forEach(os => {
        rows += `<tr> <td>${os.osNumber || ''}</td> <td>${os.entryDate ? new Date(os.entryDate).toLocaleDateString('pt-BR') : ''}</td> <td>${os.clientName || ''}</td> <td>${os.equipment || ''}</td> <td>${os.status || ''}</td> <td>${os.totalCost !== undefined ? parseFloat(os.totalCost).toFixed(2) : '0.00'}</td> </tr>`;
    });
    return `<html><head><meta charset="UTF-8"><title>${title}</title><style>body{font-family:Arial,sans-serif;margin:20px;font-size:10pt;}table{width:100%;border-collapse:collapse;margin-top:15px;}th,td{border:1px solid #ccc;padding:6px;text-align:left;}th{background-color:#f0f0f0;font-weight:bold;}h1{text-align:center;font-size:16pt;margin-bottom:5px;}p{font-size:9pt;text-align:center;margin-bottom:20px;}</style></head> <body><h1>${title}</h1><p>Gerado em: ${new Date().toLocaleString('pt-BR')}</p> <table><thead><tr><th>Nº OS</th><th>Entrada</th><th>Cliente</th><th>Equipamento</th><th>Status</th><th>Total (R$)</th></tr></thead><tbody>${rows}</tbody></table></body></html>`;
}

const menuTemplate = [
    {
        label: 'Arquivo',
        submenu: [
            { label: 'Configurações', click: () => navigateToPage('settings.html') },
            { type: 'separator' },
            { label: 'Sair', accelerator: 'CmdOrCtrl+Q', click: () => app.quit() }
        ]
    },
    {
        label: 'Relatórios',
        submenu: [
            { label: 'Clientes', click: () => mainWindow?.webContents.send('btnRelatorioClientes') },
            { label: 'OS Abertas', click: () => mainWindow?.webContents.send('btnRelatorioOsAbertas') },
            { label: 'OS Finalizadas', click: () => mainWindow?.webContents.send('btnRelatorioOsFinalizadas') }
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
            {
                label: 'Repositório GitHub', click: async () => {
                    try { await shell.openExternal('https://github.com/thiagogm/projeto-electron-os-app'); }
                    catch (e) { console.error("Falha ao abrir link externo:", e); }
                }
            },
            { type: 'separator' },
            {
                label: 'Sobre', click: () => {
                    if (!mainWindow || mainWindow.isDestroyed()) return;
                    const aboutWindow = new BrowserWindow({
                        width: 500, height: 500, resizable: false, title: 'Sobre o VoltDesk',
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
    if (mainWindow && !mainWindow.isDestroyed()) {
        const pagePath = pageFile.endsWith('.html') ? pageFile : `${pageFile}.html`;
        mainWindow.loadFile(path.join(__dirname, `views/${pagePath}`));
    }
});
ipcMain.handle('get-initial-db-status', async () => ({ connected: dbConnectionStatus }));

async function getNextOsNumberFromDB_Native() {
    try {
        const counter = await mongoose.connection.collection('counters').findOneAndUpdate(
            { _id: "osNumber" },
            { $inc: { sequence_value: 1 } },
            { upsert: true, returnDocument: "after" }
        );
        // Compatibilidade máxima com diferentes versões do driver
        let nextNumber = 1;
        if (counter && counter.value && typeof counter.value.sequence_value === 'number') {
            nextNumber = counter.value.sequence_value;
        } else if (counter && counter.lastErrorObject && counter.lastErrorObject.value && typeof counter.lastErrorObject.value.sequence_value === 'number') {
            nextNumber = counter.lastErrorObject.value.sequence_value;
        } else if (counter && typeof counter.sequence_value === 'number') {
            nextNumber = counter.sequence_value;
        }
        const osNumber = `OS-${nextNumber.toString().padStart(5, '0')}`;
        console.log(`[getNextOsNumber] Próximo número da OS gerado: ${osNumber}`);
        return osNumber;
    } catch (error) {
        console.error('[getNextOsNumber] Erro ao gerar número da OS:', error);
        return `OS-ERR-DB-${Date.now().toString().slice(-3)}`;
    }
}
ipcMain.handle('get-next-os-number', getNextOsNumberFromDB_Native);

// --- CRUD Ordens de Serviço (OS) ---
ipcMain.handle('add-os', async (event, osData) => {
    if (!dbConnectionStatus) return { success: false, message: 'Banco de dados não conectado.' };
    try {
        if (osData.clientId && typeof osData.clientId === 'string' && !ObjectId.isValid(osData.clientId)) {
            return { success: false, message: 'ID do Cliente fornecido para a OS é inválido.' };
        }
        const clientExists = await Client.findById(osData.clientId).lean().exec();
        if (!clientExists) {
            return { success: false, message: 'Cliente associado não encontrado.' };
        }

        // Gere o número da OS aqui, SEMPRE pelo backend!
        const osNumber = await getNextOsNumberFromDB_Native();

        const newOsPayload = {
            ...osData,
            osNumber, // sobrescreve qualquer valor vindo do frontend
            clientName: osData.clientName || clientExists.name,
            clientCpf: osData.clientCpf || clientExists.cpf,
            clientPhone: osData.clientPhone || clientExists.phone
        };

        const serviceOrder = new ServiceOrder(newOsPayload);
        const savedOs = await serviceOrder.save();
        return { success: true, id: savedOs._id.toString(), osNumber: savedOs.osNumber, message: 'OS cadastrada!' };
    } catch (error) {
        console.error("Erro Mongoose ao adicionar OS:", error);
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return { success: false, message: `Validação OS: ${messages.join('. ')}` };
        }
        if (error.code === 11000) return { success: false, message: `Erro: Nº OS (${osData.osNumber}) já existe.` };
        return { success: false, message: `Erro interno OS: ${error.message}` };
    }
});

ipcMain.handle('get-os-list-paginated', async (event) => {
    if (!dbConnectionStatus) return { success: false, data: [], message: 'DB não conectado.' };
    try {
        const osList = await ServiceOrder.find().sort({ osNumber: -1 }).lean().exec();
        const dataWithStringIds = osList.map(os => ({ 
            ...os, 
            _id: os._id.toString(), 
            clientId: os.clientId?.toString() 
        }));
        return { success: true, data: dataWithStringIds };
    } catch (error) {
        console.error("Erro Mongoose ao buscar OS:", error);
        return { success: false, data: [], message: `Erro ao buscar OS: ${error.message}` };
    }
});

ipcMain.handle('get-os-by-id', async (event, osId) => {
    if (!dbConnectionStatus) return { success: false, data: null, message: 'DB não conectado.' };
    try {
        if (!ObjectId.isValid(osId)) return { success: false, data: null, message: 'ID da OS inválido.' };
        const serviceOrder = await ServiceOrder.findById(osId).lean().exec();
        if (!serviceOrder) return { success: false, data: null, message: 'OS não encontrada.' };
        const dataWithStringIds = { ...serviceOrder, _id: serviceOrder._id.toString(), clientId: serviceOrder.clientId?.toString() };
        return { success: true, data: dataWithStringIds };
    } catch (error) {
        console.error("Erro Mongoose ao buscar OS por ID:", error);
        return { success: false, data: null, message: `Erro ao buscar OS: ${error.message}` };
    }
});

ipcMain.handle('update-os', async (event, osId, osData) => {
    if (!dbConnectionStatus) return { success: false, message: 'DB não conectado.' };
    if (!ObjectId.isValid(osId)) return { success: false, message: 'ID da OS inválido.' };
    try {
        const serviceOrderToUpdate = await ServiceOrder.findById(osId);
        if (!serviceOrderToUpdate) return { success: false, message: 'OS não encontrada para update.' };

        if (osData.clientId && typeof osData.clientId === 'string' && !ObjectId.isValid(osData.clientId)) {
            return { success: false, message: 'ID do Cliente inválido para update OS.' };
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
                serviceOrderToUpdate.clientName = 'Cliente (ID não encontrado)';
                serviceOrderToUpdate.clientCpf = undefined; 
                serviceOrderToUpdate.clientPhone = undefined;
            }
        }
        const updatedOs = await serviceOrderToUpdate.save();
        const leanUpdatedOs = updatedOs.toObject();
        return { success: true, message: 'OS atualizada!', data: { ...leanUpdatedOs, _id: leanUpdatedOs._id.toString(), clientId: leanUpdatedOs.clientId?.toString() } };
    } catch (error) {
        console.error("Erro Mongoose ao atualizar OS:", error);
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return { success: false, message: `Validação OS: ${messages.join('. ')}` };
        }
        if (error.code === 11000) return { success: false, message: 'Erro: Nº OS já existe (update).' };
        return { success: false, message: `Erro interno ao atualizar OS: ${error.message}` };
    }
});

ipcMain.handle('delete-os', async (event, osId) => {
    if (!dbConnectionStatus) return { success: false, message: 'DB não conectado.' };
    if (!ObjectId.isValid(osId)) return { success: false, message: 'ID da OS inválido.' };
    try {
        const result = await ServiceOrder.findByIdAndDelete(osId).exec();
        if (!result) return { success: false, message: 'OS não encontrada para exclusão.' };
        return { success: true, message: 'OS excluída!' };
    } catch (error) {
        console.error("Erro Mongoose ao excluir OS:", error);
        return { success: false, message: `Erro ao excluir OS: ${error.message}` };
    }
});

// --- CRUD Clientes ---
ipcMain.handle('add-client', async (event, clientData) => {
    if (!dbConnectionStatus) return { success: false, message: 'DB não conectado.' };
    try {
        const newClient = new Client(clientData);
        const savedClient = await newClient.save();
        return { success: true, id: savedClient._id.toString(), message: 'Cliente cadastrado!' };
    } catch (error) {
        console.error("Erro Mongoose ao adicionar cliente:", error);
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return { success: false, message: `Validação Cliente: ${messages.join('. ')}` };
        }
        if (error.code === 11000) return { success: false, duplicateCpf: true, message: 'Erro: CPF já existe.' };
        return { success: false, message: `Erro interno ao adicionar cliente: ${error.message}` };
    }
});

ipcMain.handle('get-clients-paginated', async (event, { page = 1, limit = 10, searchTerm = '' }) => {
    if (!dbConnectionStatus) return { success: false, data: [], totalCount: 0, message: 'DB não conectado.' };
    try {
        const skip = (Number(page) - 1) * Number(limit);
        let query = {};
        if (searchTerm) {
            const regex = new RegExp(searchTerm.replace(/[-[\]{}()\*+?.,\\^$|\#\\s]/g, '\\$&'), 'i');
            const cpfLimpo = searchTerm.replace(/\\D/g, '');
            query.$or = [{ name: { $regex: regex } }];
            if (cpfLimpo.length > 0 && /^\\d+$/.test(cpfLimpo)) {
                query.$or.push({ cpf: { $regex: `^${cpfLimpo}` } });
            }
        }
        const clients = await Client.find(query).sort({ name: 1 }).skip(skip).limit(Number(limit)).lean().exec();
        const totalCount = await Client.countDocuments(query).exec();
        const dataWithStringIds = clients.map(client => ({ ...client, _id: client._id.toString() }));
        return { success: true, data: dataWithStringIds, totalCount };
    } catch (error) {
        console.error("Erro Mongoose ao buscar clientes paginados:", error);
        return { success: false, data: [], totalCount: 0, message: `Erro ao buscar clientes: ${error.message}` };
    }
});

ipcMain.handle('get-client-by-id', async (event, clientId) => {
    if (!dbConnectionStatus) return { success: false, data: null, message: 'DB não conectado.' };
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
    if (!dbConnectionStatus) return { success: false, message: 'DB não conectado.' };
    if (!ObjectId.isValid(clientId)) return { success: false, message: 'ID do Cliente inválido.' };
    try {
        const clientToUpdate = await Client.findById(clientId);
        if (!clientToUpdate) return { success: false, message: 'Cliente não encontrado para update.' };

        Object.keys(clientData).forEach(key => {
            if (key !== '_id') clientToUpdate[key] = clientData[key];
        });

        if (clientToUpdate.isModified('cpf') && clientData.cpf) {
            const cpfLimpoParaVerificacao = (clientData.cpf || '').replace(/\D/g, '');
            if (cpfLimpoParaVerificacao) {
                const existingClient = await Client.findOne({ cpf: cpfLimpoParaVerificacao, _id: { $ne: new ObjectId(clientId) } }).exec();
                if (existingClient) {
                    return { success: false, duplicateCpf: true, message: 'Este CPF já pertence a outro cliente.' };
                }
            }
        }
        const updatedClient = await clientToUpdate.save();
        const leanUpdatedClient = updatedClient.toObject();
        return { success: true, message: 'Cliente atualizado!', data: { ...leanUpdatedClient, _id: leanUpdatedClient._id.toString() } };
    } catch (error) {
        console.error("Erro Mongoose ao atualizar cliente:", error);
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return { success: false, message: `Validação Cliente: ${messages.join('. ')}` };
        }
        if (error.code === 11000) return { success: false, duplicateCpf: true, message: 'Erro: CPF já existe (update).' };
        return { success: false, message: `Erro interno ao atualizar cliente: ${error.message}` };
    }
});

ipcMain.handle('delete-client', async (event, clientId) => {
    if (!dbConnectionStatus) return { success: false, message: 'DB não conectado.' };
    if (!ObjectId.isValid(clientId)) return { success: false, message: 'ID do Cliente inválido.' };
    try {
        const osCount = await ServiceOrder.countDocuments({ clientId: new ObjectId(clientId) }).exec();
        if (osCount > 0) {
            return { success: false, message: `Cliente possui ${osCount} OS associada(s) e não pode ser excluído.` };
        }
        const result = await Client.findByIdAndDelete(clientId).exec();
        if (!result) return { success: false, message: 'Cliente não encontrado para exclusão.' };
        return { success: true, message: 'Cliente excluído!' };
    } catch (error) {
        console.error("Erro Mongoose ao excluir cliente:", error);
        return { success: false, message: `Erro ao excluir cliente: ${error.message}` };
    }
});

ipcMain.handle('find-client-by-cpf', async (event, cpf) => {
    if (!dbConnectionStatus) return null;
    try {
        const client = await Client.findOne({ cpf: cpf.replace(/\\D/g, '') }).lean().exec();
        if (client && client._id) {
            return { ...client, _id: client._id.toString() };
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
        let isCpfSearch = cpfLimpo.length > 0 && /^\d+$/.test(cpfLimpo);
        if (isCpfSearch) {
            // Busca por CPF usando aggregate para remover máscara
            const clients = await Client.aggregate([
                {
                    $addFields: {
                        cpfSemMascara: { $replaceAll: { input: "$cpf", find: ".", replacement: "" } }
                    }
                },
                {
                    $match: {
                        cpfSemMascara: { $regex: `^${cpfLimpo}` }
                    }
                },
                { $limit: 10 }
            ]);
            return clients.map(client => ({ ...client, _id: client._id.toString() }));
        } else {
            // Busca por nome
            const clients = await Client.find({ name: { $regex: regex } }).sort({ name: 1 }).limit(10).lean().exec();
            return clients.map(client => ({ ...client, _id: client._id.toString() }));
        }
    } catch (error) {
        console.error("Erro Mongoose ao buscar clientes (search-clients):", error);
        return [];
    }
});

ipcMain.handle('fetch-cep', async (event, cep) => {
    try {
        const fetchModule = await import('node-fetch');
        const fetch = fetchModule.default;
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

// Relatório de Clientes
ipcMain.handle('generate-client-report', async () => {
    try {
        const doc = new jsPDF('p', 'mm', 'a4');
        const dataAtual = new Date().toLocaleDateString('pt-BR');
        doc.setFontSize(10);
        doc.text(`Data: ${dataAtual}`, 170, 15);
        doc.setFontSize(18);
        doc.text("Relatório de clientes", 15, 30);
        doc.setFontSize(12);
        let y = 50;
        doc.text("Nome", 14, y);
        doc.text("Telefone", 85, y);
        doc.text("E-mail", 130, y);
        y += 5;
        doc.setLineWidth(0.5);
        doc.line(10, y, 200, y);
        y += 10;

        const clientes = await Client.find().sort({ name: 1 });
        clientes.forEach((c) => {
            if (y > 280) {
                doc.addPage();
                y = 20;
                doc.text("Nome", 14, y);
                doc.text("Telefone", 85, y);
                doc.text("E-mail", 130, y);
                y += 5;
                doc.setLineWidth(0.5);
                doc.line(10, y, 200, y);
                y += 10;
            }
            doc.text(c.name || '', 15, y);
            doc.text(c.phone || '', 85, y);
            doc.text(c.email || '', 130, y);
            y += 10;
        });

        const pages = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pages; i++) {
            doc.setPage(i);
            doc.setFontSize(10);
            doc.text(`Página ${i} de ${pages}`, 105, 290, { align: 'center' });
        }

        const tempDir = app.getPath('temp');
        const filePath = path.join(tempDir, 'clientes.pdf');
        doc.save(filePath);
        await shell.openPath(filePath);
        return { success: true, filePath };
    } catch (error) {
        console.error(error);
        return { success: false, error: error.message };
    }
});

// Relatório de OS Finalizadas
ipcMain.handle('generate-os-finalizadas-report', async () => {
    try {
        const doc = new jsPDF('p', 'mm', 'a4');
        const dataAtual = new Date().toLocaleDateString('pt-BR');
        doc.setFontSize(10);
        doc.text(`Data: ${dataAtual}`, 170, 15);
        doc.setFontSize(18);
        doc.text("Relatório de OS Finalizadas", 15, 30);
        doc.setFontSize(12);
        let y = 50;
        doc.text("Nº OS", 14, y);
        doc.text("Cliente", 40, y);
        doc.text("Equipamento", 90, y);
        doc.text("Total (R$)", 160, y);
        y += 5;
        doc.setLineWidth(0.5);
        doc.line(10, y, 200, y);
        y += 10;

        const osList = await ServiceOrder.find({ status: 'Finalizada' }).sort({ osNumber: 1 });
        osList.forEach((os) => {
            if (y > 280) {
                doc.addPage();
                y = 20;
                doc.text("Nº OS", 14, y);
                doc.text("Cliente", 40, y);
                doc.text("Equipamento", 90, y);
                doc.text("Total (R$)", 160, y);
                y += 5;
                doc.setLineWidth(0.5);
                doc.line(10, y, 200, y);
                y += 10;
            }
            doc.text(String(os.osNumber || ''), 15, y);
            doc.text(os.clientName || '', 40, y);
            doc.text(os.equipment || '', 90, y);
            doc.text((os.totalCost || 0).toFixed(2), 160, y);
            y += 10;
        });

        const pages = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pages; i++) {
            doc.setPage(i);
            doc.setFontSize(10);
            doc.text(`Página ${i} de ${pages}`, 105, 290, { align: 'center' });
        }

        const tempDir = app.getPath('temp');
        const filePath = path.join(tempDir, 'os_finalizadas.pdf');
        doc.save(filePath);
        await shell.openPath(filePath);
        return { success: true, filePath };
    } catch (error) {
        console.error(error);
        return { success: false, error: error.message };
    }
});

// Relatório de OS Abertas
ipcMain.handle('generate-os-abertas-report', async () => {
    try {
        const doc = new jsPDF('p', 'mm', 'a4');
        const dataAtual = new Date().toLocaleDateString('pt-BR');
        doc.setFontSize(10);
        doc.text(`Data: ${dataAtual}`, 170, 15);
        doc.setFontSize(18);
        doc.text("Relatório de OS Abertas", 15, 30);
        doc.setFontSize(12);
        let y = 50;
        doc.text("Nº OS", 14, y);
        doc.text("Cliente", 40, y);
        doc.text("Equipamento", 90, y);
        doc.text("Status", 160, y);
        y += 5;
        doc.setLineWidth(0.5);
        doc.line(10, y, 200, y);
        y += 10;

        const osList = await ServiceOrder.find({ status: 'Aberta' }).sort({ osNumber: 1 });
        osList.forEach((os) => {
            if (y > 280) {
                doc.addPage();
                y = 20;
                doc.text("Nº OS", 14, y);
                doc.text("Cliente", 40, y);
                doc.text("Equipamento", 90, y);
                doc.text("Status", 160, y);
                y += 5;
                doc.setLineWidth(0.5);
                doc.line(10, y, 200, y);
                y += 10;
            }
            doc.text(String(os.osNumber || ''), 15, y);
            doc.text(os.clientName || '', 40, y);
            doc.text(os.equipment || '', 90, y);
            doc.text(os.status || '', 160, y);
            y += 10;
        });

        const pages = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pages; i++) {
            doc.setPage(i);
            doc.setFontSize(10);
            doc.text(`Página ${i} de ${pages}`, 105, 290, { align: 'center' });
        }

        const tempDir = app.getPath('temp');
        const filePath = path.join(tempDir, `os_abertas_${Date.now()}.pdf`);
        doc.save(filePath);
        await shell.openPath(filePath);
        return { success: true, filePath };
    } catch (error) {
        console.error(error);
        return { success: false, error: error.message };
    }
});

// Handler para diálogo de confirmação
ipcMain.handle('show-confirm-dialog', async (event, options) => {
    const { type = 'question', title = 'Confirmação', message, buttons = ['Cancelar', 'Confirmar'], defaultId = 1, cancelId = 0 } = options;
    
    const result = await dialog.showMessageBox({
        type,
        title,
        message,
        buttons,
        defaultId,
        cancelId,
        noLink: true
    });

    return {
        response: result.response,
        confirmed: result.response === defaultId
    };
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



