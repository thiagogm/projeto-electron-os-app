// assets/js/renderer_index.js
document.addEventListener('DOMContentLoaded', () => {
    const currentDateEl = document.getElementById('currentDate');
    const dbStatusIconEl = document.getElementById('dbStatusIcon');
    const dbStatusTextEl = document.getElementById('dbStatusText');

    // Atualizar Data
    function updateDate() {
        const now = new Date();
        currentDateEl.textContent = now.toLocaleDateString('pt-BR', {
            day: '2-digit', month: '2-digit', year: 'numeric'
        });
    }
    updateDate();
    setInterval(updateDate, 60000); // Atualiza a cada minuto

    // Status Inicial do DB e Atualizações
    async function updateDbStatus(status) {
        if (status.connected) {
            dbStatusIconEl.src = '../assets/icons/database-check.png';
            dbStatusTextEl.textContent = 'Conectado';
            dbStatusIconEl.alt = 'Database Connected';
        } else {
            dbStatusIconEl.src = '../assets/icons/database-slash.png';
            dbStatusTextEl.textContent = 'Desconectado';
            dbStatusIconEl.alt = 'Database Disconnected';
        }
    }

    window.electronAPI.onDbStatusUpdate(updateDbStatus);
    window.electronAPI.getInitialDbStatus().then(updateDbStatus);


    // Navegação
    document.getElementById('goToCadastroCliente').addEventListener('click', () => {
        window.electronAPI.navigateTo('cadastro_cliente.html');
    });

    document.getElementById('goToOS').addEventListener('click', () => {
        window.electronAPI.navigateTo('os.html'); // Você precisará criar os.html e renderer_os.js
    });
});