// Configuração de navegação global
document.addEventListener('DOMContentLoaded', () => {
    // Configurar navegação
    const navHome = document.getElementById('navHome');
    const navClients = document.getElementById('navClients');
    
    if (navHome) {
        navHome.addEventListener('click', (e) => {
            e.preventDefault();
            if (window.electronAPI && typeof window.electronAPI.navigateTo === 'function') {
                window.electronAPI.navigateTo('index.html');
            }
        });
    }
    
    if (navClients) {
        navClients.addEventListener('click', (e) => {
            e.preventDefault();
            if (window.electronAPI && typeof window.electronAPI.navigateTo === 'function') {
                window.electronAPI.navigateTo('cadastro_cliente.html');
            }
        });
    }

    // Inicializar Feather Icons globalmente
    if (typeof feather !== 'undefined') {
        feather.replace();
    } else {
        console.warn('Feather Icons não está disponível');
    }
}); 