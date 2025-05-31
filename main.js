// electron-os-app/main.js
const { app, BrowserWindow, ipcMain, Menu, shell, webContents } = require('electron');
const path = require('path');
const { connectDB, getDB, ObjectId, subscribeToConnectionStatus } = require('./utils/db');

let mainWindow;
let dbConnectionStatus = false;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false, // Importante para segurança
        },
        icon: path.join(__dirname, 'assets/Logo-VoltDesk.png') 
    });

    mainWindow.loadFile(path.join(__dirname, 'views/index.html'));
    // mainWindow.webContents.openDevTools(); // Abrir DevTools para debug

    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    // Tentar conectar ao DB ao iniciar
    connectDB()
        .then(() => {
            dbConnectionStatus = true;
            mainWindow.webContents.send('db-status-updated', { connected: true });
        })
        .catch(() => {
            dbConnectionStatus = false;
            mainWindow.webContents.send('db-status-updated', { connected: false });
        });

    // Assinar atualizações de status do DB para retransmitir
    subscribeToConnectionStatus((isConnected) => {
        dbConnectionStatus = isConnected;
        if (mainWindow && mainWindow.webContents) {
            mainWindow.webContents.send('db-status-updated', { connected: isConnected });
        }
    });
}

// --- Construção do Menu Personalizado ---
const menuTemplate = [
    {
        label: 'Cadastro',
        submenu: [
            { label: 'Sair', click: () => app.quit() }
        ]
    },
    {
        label: 'Relatório',
        submenu: [
            { label: 'Clientes', click: () => navigateToPage('relatorios/rel_clientes.html') },
            { label: 'OS Abertas', click: () => navigateToPage('relatorios/rel_os_abertas.html') },
            { label: 'OS Finalizadas', click: () => navigateToPage('relatorios/rel_os_finalizadas.html') }
        ]
    },
    {
        label: 'Ferramentas',
        submenu: [
            { label: 'Aplicar Zoom', accelerator: 'CmdOrCtrl+=', click: () => mainWindow.webContents.zoomFactor += 0.1 },
            { label: 'Reduzir Zoom', accelerator: 'CmdOrCtrl+-', click: () => mainWindow.webContents.zoomFactor -= 0.1 },
            { label: 'Restaurar Zoom', accelerator: 'CmdOrCtrl+0', click: () => mainWindow.webContents.zoomFactor = 1 },
            { type: 'separator' },
            { label: 'Recarregar', accelerator: 'CmdOrCtrl+R', click: () => mainWindow.webContents.reload() },
            { label: 'Alternar Ferramentas do Desenvolvedor', accelerator: 'CmdOrCtrl+Shift+I', click: () => mainWindow.webContents.toggleDevTools() }
        ]
    },
    {
        label: 'Ajuda',
        submenu: [
            { label: 'Repositório', click: () => shell.openExternal('https://github.com/YOUR_USERNAME/electron-os-app') }, // Mude para seu repo
            {
                label: 'Sobre', click: () => {
                    // Poderia abrir uma pequena janela "Sobre"
                    const aboutWindow = new BrowserWindow({
                        width: 300,
                        height: 200,
                        title: 'Sobre',
                        parent: mainWindow,
                        modal: true,
                        webPreferences: { nodeIntegration: false, contextIsolation: true }
                    });
                    aboutWindow.loadFile(path.join(__dirname, 'views/sobre.html')); // Crie este arquivo
                    aboutWindow.setMenu(null);
                }
            }
        ]
    }
];

// --- Handlers IPC ---

// Navegação
ipcMain.on('navigate-to', (event, page) => {
    if (mainWindow) {
        mainWindow.loadFile(path.join(__dirname, `views/${page}`));
    }
});

// Menu Actions (alguns podem ser redundantes se já no template, mas bom para chamadas do renderer)
ipcMain.on('quit-app', () => app.quit());
ipcMain.on('reload-window', () => mainWindow && mainWindow.webContents.reloadIgnoringCache());
ipcMain.on('toggle-dev-tools', () => mainWindow && mainWindow.webContents.toggleDevTools());
ipcMain.on('zoom-in', () => mainWindow && (mainWindow.webContents.zoomFactor += 0.1));
ipcMain.on('zoom-out', () => mainWindow && (mainWindow.webContents.zoomFactor -= 0.1));
ipcMain.on('zoom-reset', () => mainWindow && (mainWindow.webContents.zoomFactor = 1));
ipcMain.on('open-external', (event, url) => shell.openExternal(url));

// DB Status
ipcMain.handle('get-initial-db-status', async () => {
    return { connected: dbConnectionStatus };
});

// --- Gerador de Número da OS (Simples) ---
async function getNextOsNumberFromDB() {
    const db = getDB();
    if (!db) return 'OS-00001'; // Fallback

    const counterCollection = db.collection('counters');
    const sequenceDocument = await counterCollection.findOneAndUpdate(
        { _id: 'osNumber' },
        { $inc: { sequence_value: 1 } },
        { returnDocument: 'after', upsert: true } // Cria se não existir
    );
    // Se sequenceDocument for null ou sequence_value não existir (primeira vez), inicializa
    const nextVal = sequenceDocument && sequenceDocument.sequence_value ? sequenceDocument.sequence_value : 1;
    return `OS-${String(nextVal).padStart(5, '0')}`;
}

ipcMain.handle('get-next-os-number', async () => {
    return await getNextOsNumberFromDB();
});

// --- CRUD Ordens de Serviço (OS) ---
ipcMain.handle('add-os', async (event, osData) => {
    const db = getDB();
    if (!db) return { success: false, message: 'Banco de dados não conectado.' };
    try {
        const osNumber = await getNextOsNumberFromDB(); // Pega o próximo número antes de inserir o atual
        const newOs = {
            ...osData,
            osNumber: osData.osNumber, // O número já é gerado e enviado pelo renderer
            clientId: new ObjectId(osData.clientId), // Garante que seja ObjectId
            entryDate: new Date(),
            lastUpdate: new Date(),
            status: osData.status || 'Aberta', // Status padrão
        };
        const result = await db.collection('service_orders').insertOne(newOs);
        return { success: true, id: result.insertedId, osNumber: newOs.osNumber, message: 'Ordem de Serviço cadastrada com sucesso!' };
    } catch (error) {
        console.error("Erro ao adicionar OS:", error);
        return { success: false, message: `Erro ao adicionar OS: ${error.message}` };
    }
});

ipcMain.handle('get-os-list', async (event, filters = {}) => {
    const db = getDB();
    if (!db) return [];
    try {
        // Adicionar filtros se necessário, ex: por status, cliente, data
        // Exemplo de filtro por status:
        // const query = filters.status ? { status: filters.status } : {};
        return await db.collection('service_orders').find(filters).sort({ entryDate: -1 }).toArray();
    } catch (error) {
        console.error("Erro ao buscar OS:", error);
        return [];
    }
});

ipcMain.handle('get-os-by-id', async (event, osId) => {
    const db = getDB();
    if (!db) return null;
    try {
        if (!ObjectId.isValid(osId)) return null; // Verifica se o ID é válido
        return await db.collection('service_orders').findOne({ _id: new ObjectId(osId) });
    } catch (error) {
        console.error("Erro ao buscar OS por ID:", error);
        return null;
    }
});

ipcMain.handle('update-os', async (event, osId, osData) => {
    const db = getDB();
    if (!db) return { success: false, message: 'Banco de dados não conectado.' };
    if (!ObjectId.isValid(osId)) return { success: false, message: 'ID da OS inválido.' };

    try {
        const updateData = { ...osData };
        delete updateData._id; // Não atualizar o _id

        // Se o clienteId foi passado, converta para ObjectId
        if (updateData.clientId) {
            updateData.clientId = new ObjectId(updateData.clientId);
        }

        updateData.lastUpdate = new Date();
        if (updateData.status === 'Finalizada' && !updateData.completionDate) {
            updateData.completionDate = new Date();
        }

        const result = await db.collection('service_orders').updateOne(
            { _id: new ObjectId(osId) },
            { $set: updateData }
        );
        return { success: result.modifiedCount > 0, message: 'Ordem de Serviço atualizada com sucesso!' };
    } catch (error) {
        console.error("Erro ao atualizar OS:", error);
        return { success: false, message: `Erro ao atualizar OS: ${error.message}` };
    }
});

ipcMain.handle('delete-os', async (event, osId) => {
    const db = getDB();
    if (!db) return { success: false, message: 'Banco de dados não conectado.' };
    if (!ObjectId.isValid(osId)) return { success: false, message: 'ID da OS inválido.' };

    try {
        const result = await db.collection('service_orders').deleteOne({ _id: new ObjectId(osId) });
        return { success: result.deletedCount > 0, message: 'Ordem de Serviço excluída com sucesso!' };
    } catch (error) {
        console.error("Erro ao excluir OS:", error);
        return { success: false, message: `Erro ao excluir OS: ${error.message}` };
    }
});


// --- CRUD Clientes ---
ipcMain.handle('add-client', async (event, clientData) => {
    const db = getDB();
    if (!db) return { success: false, message: 'Banco de dados não conectado.' };
    try {
        // CPF Duplicado (verificação já acontece no renderer antes de chamar, mas uma dupla checagem é boa)
        const existingClient = await db.collection('clients').findOne({ cpf: clientData.cpf });
        if (existingClient) {
            return { success: false, duplicateCpf: true, message: 'CPF já cadastrado no banco de dados.' };
        }
        const result = await db.collection('clients').insertOne({ ...clientData, createdAt: new Date() });
        return { success: true, id: result.insertedId, message: 'Cliente cadastrado com sucesso!' };
    } catch (error) {
        console.error("Erro ao adicionar cliente:", error);
        return { success: false, message: `Erro ao adicionar cliente: ${error.message}` };
    }
});

ipcMain.handle('get-clients', async (event, query = {}) => {
    const db = getDB();
    if (!db) return [];
    try {
        return await db.collection('clients').find(query).sort({ name: 1 }).toArray();
    } catch (error) {
        console.error("Erro ao buscar clientes:", error);
        return [];
    }
});

ipcMain.handle('get-client-by-id', async (event, clientId) => {
    const db = getDB();
    if (!db) return null;
    try {
        return await db.collection('clients').findOne({ _id: new ObjectId(clientId) });
    } catch (error) {
        console.error("Erro ao buscar cliente por ID:", error);
        return null;
    }
});

ipcMain.handle('update-client', async (event, clientId, clientData) => {
    const db = getDB();
    if (!db) return { success: false, message: 'Banco de dados não conectado.' };
    try {
        // Verificar CPF duplicado se o CPF foi alterado
        if (clientData.cpf) {
            const existingClient = await db.collection('clients').findOne({ cpf: clientData.cpf, _id: { $ne: new ObjectId(clientId) } });
            if (existingClient) {
                return { success: false, duplicateCpf: true, message: 'Este CPF já pertence a outro cliente.' };
            }
        }
        const result = await db.collection('clients').updateOne(
            { _id: new ObjectId(clientId) },
            { $set: { ...clientData, updatedAt: new Date() } }
        );
        return { success: result.modifiedCount > 0, message: 'Cliente atualizado com sucesso!' };
    } catch (error) {
        console.error("Erro ao atualizar cliente:", error);
        return { success: false, message: `Erro ao atualizar cliente: ${error.message}` };
    }
});

ipcMain.handle('delete-client', async (event, clientId) => {
    const db = getDB();
    if (!db) return { success: false, message: 'Banco de dados não conectado.' };
    try {
        const result = await db.collection('clients').deleteOne({ _id: new ObjectId(clientId) });
        // Adicionar lógica para verificar se OS estão associadas antes de excluir ou arquivar o cliente.
        return { success: result.deletedCount > 0, message: 'Cliente excluído com sucesso!' };
    } catch (error) {
        console.error("Erro ao excluir cliente:", error);
        return { success: false, message: `Erro ao excluir cliente: ${error.message}` };
    }
});

ipcMain.handle('find-client-by-cpf', async (event, cpf) => {
    const db = getDB();
    if (!db) return null;
    try {
        return await db.collection('clients').findOne({ cpf: cpf });
    } catch (error) {
        console.error("Erro ao buscar cliente por CPF:", error);
        return null;
    }
});

ipcMain.handle('search-clients', async (event, searchTerm) => {
    const db = getDB();
    if (!db) return [];
    try {
        const regex = new RegExp(searchTerm.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&'), 'i'); // Escapa caracteres especiais para regex
        let query;
        if (/^\d{1,11}$/.test(searchTerm.replace(/\D/g, ''))) { // Se parecer CPF (até 11 dígitos)
            query = {
                $or: [
                    { name: { $regex: regex } },
                    { cpf: { $regex: searchTerm.replace(/\D/g, '') } } // Busca por CPF sem máscara
                ]
            };
        } else {
            query = { name: { $regex: regex } };
        }
        return await db.collection('clients').find(query).limit(50).toArray();
    } catch (error) {
        console.error("Erro ao buscar clientes:", error);
        return [];
    }
});


// --- Lógica App Electron ---
app.whenReady().then(() => {
    const menu = Menu.buildFromTemplate(menuTemplate);
    Menu.setApplicationMenu(menu);
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// Certifique-se de desconectar do DB ao sair
app.on('will-quit', async () => {
    const { disconnectDB } = require('./utils/db'); // Re-require para evitar escopo
    await disconnectDB();
});