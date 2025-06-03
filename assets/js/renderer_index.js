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
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
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

            dbStatusIconEl.classList.remove('icon-status-db-connected', 'icon-status-db-disconnected');
            dbStatusTextEl.classList.remove('text-status-connected', 'text-status-disconnected', 'text-status-verifying');

            if (status && typeof status.connected !== 'undefined') {
                if (status.connected) {
                    iconName = 'database';
                    iconColorClass = 'icon-status-db-connected';
                    textColorClass = 'text-status-connected';
                    statusMessage = 'Conectado';
                } else {
                    iconName = 'cloud-off';
                }
            } else {
                statusMessage = 'Verificando...';
                textColorClass = 'text-status-verifying';
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
            if (!dbStatusIconEl) console.warn("Elemento dbStatusIconEl não encontrado no DOM (renderer_index.js).");
            if (!dbStatusTextEl) console.warn("Elemento dbStatusTextEl não encontrado no DOM (renderer_index.js).");
        }
    }

    updateDateTime();
    setInterval(updateDateTime, 10000);

    if (
        window.electronAPI &&
        typeof window.electronAPI.onDbStatusUpdate === 'function' &&
        typeof window.electronAPI.getInitialDbStatus === 'function'
    ) {
        window.electronAPI.onDbStatusUpdate(updateDbStatus);
        window.electronAPI.getInitialDbStatus()
            .then(status => {
                updateDbStatus(status);
            })
            .catch(err => {
                console.error("Erro ao obter status inicial do DB (renderer_index.js):", err);
                updateDbStatus({ connected: false });
            });
    } else {
        console.warn("electronAPI ou funções de status do DB não disponíveis.");
        updateDbStatus({ connected: false });
    }

    // --- Navegação pelos Cards ---
    if (goToCadastroClienteCard) {
        goToCadastroClienteCard.addEventListener('click', () => {
            if (window.electronAPI && typeof window.electronAPI.navigateTo === 'function') {
                window.electronAPI.navigateTo('cadastro_cliente.html');
            } else {
                console.warn("API de navegação não disponível (renderer_index.js).");
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
                console.warn("API de navegação não disponível (renderer_index.js).");
            }
        });
    } else {
        console.warn("Card 'goToOSCard' não encontrado no DOM.");
    }

    // --- Feedback de Relatórios ---
    if (window.electronAPI && typeof window.electronAPI.onReportGenerated === 'function') {
        const showToast = (message, type = 'success', duration = 5000) => {
            const toastContainer = document.querySelector('.toast-container');
            if (!toastContainer) {
                console.warn('Toast container não encontrado!');
                alert(message);
                return;
            }

            const toastId = 'toast-index-' + Date.now();
            const toastBgClass =
                type === 'danger' ? 'bg-danger' :
                type === 'warning' ? 'bg-warning text-dark' :
                type === 'info' ? 'bg-info text-dark' : 'bg-success';

            const toastHTML = `
                <div id="${toastId}" class="toast align-items-center text-white ${toastBgClass} border-0" role="alert" aria-live="assertive" aria-atomic="true" data-bs-delay="${duration}">
                    <div class="d-flex">
                        <div class="toast-body">${message}</div>
                        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
                    </div>
                </div>
            `;
            toastContainer.insertAdjacentHTML('beforeend', toastHTML);
            const toastElement = document.getElementById(toastId);
            if (toastElement) {
                const toast = new bootstrap.Toast(toastElement);
                toast.show();
                toastElement.addEventListener('hidden.bs.toast', () => toastElement.remove());
            }
        };

        window.electronAPI.onReportGenerated((result) => {
            console.log("Resultado da geração do relatório:", result);

            if (result && result.action === 'preview_closed') {
                showToast(`Pré-visualização do relatório de ${result.reportType || 'desconhecido'} fechada.`, 'info', 4000);
            } else if (result && result.success && result.action === 'saved') {
                showToast(`Relatório de ${result.reportType || 'desconhecido'} salvo em: ${result.filePath}.`, 'success', 7000);
            } else if (result && result.canceled) {
                showToast(`Geração/salvamento do relatório de ${result.reportType || 'desconhecido'} cancelada.`, 'info');
            } else if (result && !result.success && result.action === 'generate_busy') {
                showToast(result.error || `Pré-visualização já aberta para relatório de ${result.reportType || 'desconhecido'}.`, 'warning', 7000);
                return;
            } else if (result && !result.success) {
                showToast(`Erro ao gerar/salvar relatório: ${result.error || 'Erro desconhecido.'}`, 'danger', 7000);
            }
        });
    } else {
        console.warn("API onReportGenerated não disponível no renderer_index.js.");
    }

    // Inicializa Feather Icons
    if (typeof feather !== 'undefined' && feather && typeof feather.replace === 'function') {
        try {
            feather.replace();
        } catch (e) {
            console.error("Erro ao renderizar Feather Icons na carga inicial:", e);
        }
    } else {
        console.warn("Feather Icons não carregado ou inválido.");
    }
});
