// assets/js/renderer_index.js
document.addEventListener('DOMContentLoaded', () => {
    // Seletores para o rodapé
    const currentDateTimeEl = document.getElementById('currentDateTime'); // Para data e hora
    const currentYearEl = document.getElementById('currentYear');
    const dbStatusIconEl = document.getElementById('dbStatusIcon');
    const dbStatusTextEl = document.getElementById('dbStatusText');

    // Seletores para os cards de navegação
    const goToCadastroClienteCard = document.getElementById('goToCadastroCliente');
    const goToOSCard = document.getElementById('goToOS');

    // --- Funções de Inicialização e Rodapé ---
    function updateDateTime() {
        const now = new Date();
        if (currentDateTimeEl) {
            currentDateTimeEl.textContent = now.toLocaleString('pt-BR', {
                day: '2-digit', month: '2-digit', year: 'numeric',
                hour: '2-digit', minute: '2-digit' // Adicionada a hora
            });
        }
        if (currentYearEl) {
            currentYearEl.textContent = now.getFullYear();
        }
    }

    async function updateDbStatus(status) {
        if (dbStatusIconEl && dbStatusTextEl) {
            let iconName = 'alert-triangle'; 
            let iconColorClass = 'icon-status-db-disconnected'; 
            let textColorClass = 'text-status-disconnected';
            let statusMessage = 'Desconectado';

            // Limpa classes de cor anteriores do ícone e do texto
            // (O ícone em si não tem a classe de cor, mas o elemento pai ou o próprio ícone via CSS)
            // A classe de cor será aplicada diretamente ao ícone via classList.add abaixo
            dbStatusIconEl.classList.remove('icon-status-db-connected', 'icon-status-db-disconnected');
            dbStatusTextEl.classList.remove('text-status-connected', 'text-status-disconnected', 'text-status-verifying');

            if (status && typeof status.connected !== 'undefined') {
                if (status.connected) {
                    iconName = 'database';
                    iconColorClass = 'icon-status-db-connected'; // Classe para cor verde clara no ícone
                    textColorClass = 'text-status-connected';   // Classe para cor verde clara no texto
                    statusMessage = 'Conectado';
                } else {
                    iconName = 'cloud-off';
                    iconColorClass = 'icon-status-db-disconnected'; // Classe para cor vermelha clara no ícone
                    textColorClass = 'text-status-disconnected';  // Classe para cor vermelha clara no texto
                    // statusMessage já é 'Desconectado'
                }
            } else {
                statusMessage = 'Verificando...';
                iconColorClass = 'icon-status-db-disconnected'; // Pode usar uma cor de alerta para o ícone
                textColorClass = 'text-status-verifying';       // Classe para cor laranja/amarela no texto
            }

            dbStatusIconEl.setAttribute('data-feather', iconName);
            dbStatusIconEl.classList.add(iconColorClass); 
            
            dbStatusTextEl.textContent = statusMessage;
            dbStatusTextEl.classList.add(textColorClass); 

            if (typeof feather !== 'undefined' && feather && typeof feather.replace === 'function') {
                try {
                    feather.replace(); 
                } catch (e) {
                    console.error("Erro ao re-renderizar Feather Icons em updateDbStatus:", e);
                }
            }
        } else {
            if (!dbStatusIconEl) console.warn("Elemento dbStatusIconEl não encontrado no DOM.");
            if (!dbStatusTextEl) console.warn("Elemento dbStatusTextEl não encontrado no DOM.");
        }
    }

    // Inicializa data/ano/hora e busca status inicial do DB
    updateDateTime();
    setInterval(updateDateTime, 10000); // Atualiza data e hora a cada 10 segundos para a hora mudar

    if (window.electronAPI && 
        typeof window.electronAPI.onDbStatusUpdate === 'function' && 
        typeof window.electronAPI.getInitialDbStatus === 'function') {
        
        window.electronAPI.onDbStatusUpdate(updateDbStatus);
        window.electronAPI.getInitialDbStatus()
            .then(status => {
                // console.log("Status inicial do DB recebido:", status); // Log de debug
                updateDbStatus(status);
            })
            .catch(err => {
                console.error("Erro ao obter status inicial do DB:", err);
                updateDbStatus({ connected: false }); // Assume desconectado em caso de erro
            });
    } else {
        console.warn("electronAPI ou funções de status do DB não disponíveis.");
        updateDbStatus({ connected: false }); // Fallback visual se API não estiver pronta
    }

    // --- Navegação pelos Cards ---
    if (goToCadastroClienteCard) {
        goToCadastroClienteCard.addEventListener('click', () => {
            if (window.electronAPI && typeof window.electronAPI.navigateTo === 'function') {
                window.electronAPI.navigateTo('cadastro_cliente.html');
            } else {
                console.warn("API de navegação não disponível.");
            }
        });
    } else {
        console.warn("Card 'goToCadastroCliente' não encontrado no DOM.");
    }

    if (goToOSCard) {
        goToOSCard.addEventListener('click', () => {
            if (window.electronAPI && typeof window.electronAPI.navigateTo === 'function') {
                window.electronAPI.navigateTo('os.html');
            } else {
                console.warn("API de navegação não disponível.");
            }
        });
    } else {
        console.warn("Card 'goToOSCard' não encontrado no DOM.");
    }

    // --- LÓGICA PARA OS MENUS NO HEADER FOI REMOVIDA ---

    // Inicializa Feather Icons (chamado uma vez após o DOM carregar)
    if (typeof feather !== 'undefined' && feather && typeof feather.replace === 'function') {
        try {
            // console.log("Inicializando Feather Icons a partir de renderer_index.js..."); // Debug
            feather.replace();
            // console.log("Feather Icons inicializados."); // Debug
        } catch(e) {
            console.error("Erro ao renderizar Feather Icons na carga inicial (renderer_index.js):", e);
        }
    } else {
        console.warn("Biblioteca Feather Icons (feather) não carregada ou 'replace' não é uma função.");
    }
});