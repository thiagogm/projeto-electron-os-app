// electron-os-app/preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    // Navegação
    navigateTo: (pageFile) => ipcRenderer.send('navigate-to', pageFile),

    // Status do DB
    onDbStatusUpdate: (callback) => {
        const listener = (_event, status) => callback(status);
        ipcRenderer.on('db-status-updated', listener);
        return () => ipcRenderer.removeListener('db-status-updated', listener); // Para cleanup
    },
    getInitialDbStatus: () => ipcRenderer.invoke('get-initial-db-status'),

    // Clientes
    addClient: (clientData) => ipcRenderer.invoke('add-client', clientData),
    getClientsPaginated: (options) => ipcRenderer.invoke('get-clients-paginated', options),
    getClientById: (clientId) => ipcRenderer.invoke('get-client-by-id', clientId),
    updateClient: (clientId, clientData) => ipcRenderer.invoke('update-client', clientId, clientData),
    deleteClient: (clientId) => ipcRenderer.invoke('delete-client', clientId),
    findClientByCpf: (cpf) => ipcRenderer.invoke('find-client-by-cpf', cpf),
    searchClients: (searchTerm) => ipcRenderer.invoke('search-clients', searchTerm),

    // Ordens de Serviço (OS)
    addOS: (osData) => ipcRenderer.invoke('add-os', osData),
    getOsListPaginated: (options) => ipcRenderer.invoke('get-os-list-paginated', options),
    getOsById: (osId) => ipcRenderer.invoke('get-os-by-id', osId),
    updateOs: (osId, osData) => ipcRenderer.invoke('update-os', osId, osData),
    deleteOs: (osId) => ipcRenderer.invoke('delete-os', osId),
    getNextOsNumber: () => ipcRenderer.invoke('get-next-os-number'),

    // Utilitários
    fetchCep: (cep) => ipcRenderer.invoke('fetch-cep', cep),

    // Ações Gerais do Electron (se chamadas pela UI)
    quitApp: () => ipcRenderer.send('quit-app-from-ui'),
    reloadWindow: () => ipcRenderer.send('reload-window-from-ui'),
    toggleDevTools: () => ipcRenderer.send('toggle-dev-tools-from-ui'),
    openExternal: (url) => ipcRenderer.send('open-external-from-ui', url),

    // Configurações (quando for implementar futuramente)
    // getSettings: () => ipcRenderer.invoke('get-settings'),
    // saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
    invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),

    // Relatórios PDF via jsPDF
    generateClientReport: () => ipcRenderer.invoke('generate-client-report'),
    generateOsFinalizadasReport: () => ipcRenderer.invoke('generate-os-finalizadas-report'),
    generateOsAbertasReport: () => ipcRenderer.invoke('generate-os-abertas-report'),
});
