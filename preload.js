// electron-os-app/preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    // Navegação
    navigateTo: (pageFile) => ipcRenderer.send('navigate-to', pageFile),

    // Status do DB
    onDbStatusUpdate: (callback) => ipcRenderer.on('db-status-updated', (_event, status) => callback(status)),
    getInitialDbStatus: () => ipcRenderer.invoke('get-initial-db-status'),

    // Clientes
    addClient: (clientData) => ipcRenderer.invoke('add-client', clientData),
    getClientsPaginated: (options) => ipcRenderer.invoke('get-clients-paginated', options),
    getClientById: (clientId) => ipcRenderer.invoke('get-client-by-id', clientId),
    updateClient: (clientId, clientData) => ipcRenderer.invoke('update-client', clientId, clientData),
    deleteClient: (clientId) => ipcRenderer.invoke('delete-client', clientId),
    findClientByCpf: (cpf) => ipcRenderer.invoke('find-client-by-cpf', cpf),
    searchClients: (searchTerm) => ipcRenderer.invoke('search-clients', searchTerm), // Usado na busca rápida

    // Ordens de Serviço (OS)
    addOS: (osData) => ipcRenderer.invoke('add-os', osData),
    getOsListPaginated: (options) => ipcRenderer.invoke('get-os-list-paginated', options),
    getOsById: (osId) => ipcRenderer.invoke('get-os-by-id', osId),
    updateOs: (osId, osData) => ipcRenderer.invoke('update-os', osId, osData),
    deleteOs: (osId) => ipcRenderer.invoke('delete-os', osId),
    getNextOsNumber: () => ipcRenderer.invoke('get-next-os-number'),

    // Utilitários
    fetchCep: (cep) => ipcRenderer.invoke('fetch-cep', cep),

    // Configurações (se implementado)
    // getSettings: () => ipcRenderer.invoke('get-settings'),
    // saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
});
