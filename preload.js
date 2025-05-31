// electron-os-app/preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    // Funções do Menu
    quitApp: () => ipcRenderer.send('quit-app'),
    reloadWindow: () => ipcRenderer.send('reload-window'),
    toggleDevTools: () => ipcRenderer.send('toggle-dev-tools'),
    zoomIn: () => ipcRenderer.send('zoom-in'),
    zoomOut: () => ipcRenderer.send('zoom-out'),
    zoomReset: () => ipcRenderer.send('zoom-reset'),
    openExternal: (url) => ipcRenderer.send('open-external', url),

    // Navegação
    navigateTo: (page) => ipcRenderer.send('navigate-to', page),

    // DB Status
    onDbStatusUpdate: (callback) => ipcRenderer.on('db-status-updated', (_event, status) => callback(status)),
    getInitialDbStatus: () => ipcRenderer.invoke('get-initial-db-status'),


    // Cliente IPC
    addClient: (client) => ipcRenderer.invoke('add-client', client),
    getClients: (query = {}) => ipcRenderer.invoke('get-clients', query),
    getClientById: (clientId) => ipcRenderer.invoke('get-client-by-id', clientId),
    updateClient: (clientId, clientData) => ipcRenderer.invoke('update-client', clientId, clientData),
    deleteClient: (clientId) => ipcRenderer.invoke('delete-client', clientId),
    findClientByCpf: (cpf) => ipcRenderer.invoke('find-client-by-cpf', cpf), // Para validação de duplicidade
    searchClients: (searchTerm) => ipcRenderer.invoke('search-clients', searchTerm),
    

    // OS IPC (a serem implementadas)
    addOS: (osData) => ipcRenderer.invoke('add-os', osData),
    getOsList: (filters = {}) => ipcRenderer.invoke('get-os-list', filters), // Adicionado para buscar OS
    getOsById: (osId) => ipcRenderer.invoke('get-os-by-id', osId),
    updateOs: (osId, osData) => ipcRenderer.invoke('update-os', osId, osData),
    deleteOs: (osId) => ipcRenderer.invoke('delete-os', osId),
    // updateOsStatus: (osId, status) => ipcRenderer.invoke('update-os-status', osId, status), // Status é atualizado via updateOs
    getNextOsNumber: () => ipcRenderer.invoke('get-next-os-number'), // Para gerar número da OS

    // Reutilizando busca de clientes para associar à OS
    searchClients: (searchTerm) => ipcRenderer.invoke('search-clients', searchTerm),
    getClientById: (clientId) => ipcRenderer.invoke('get-client-by-id', clientId), // Já existe, mas será usado aqui

    // Utilitários
    fetchCep: async (cep) => {
        try {
            const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
            if (!response.ok) throw new Error('CEP não encontrado');
            return await response.json();
        } catch (error) {
            console.error("Erro ao buscar CEP:", error);
            return { erro: true };
        }
    }
});