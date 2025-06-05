// Funções utilitárias
function updateDateTime() {
    const now = new Date();
    const dateTimeElement = document.getElementById('currentDateTime');
    if (dateTimeElement) {
        dateTimeElement.textContent = now.toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
}

function updateDbStatus(status) {
    const dbStatusElement = document.getElementById('dbStatus');
    if (dbStatusElement) {
        dbStatusElement.textContent = status.connected ? 'Conectado' : 'Desconectado';
        dbStatusElement.className = status.connected ? 'text-success' : 'text-danger';
        
        // Atualizar ícone se existir
        const dbStatusIcon = document.getElementById('dbStatusIcon');
        if (dbStatusIcon) {
            dbStatusIcon.setAttribute('data-feather', status.connected ? 'database' : 'cloud-off');
            dbStatusIcon.className = status.connected ? 'icon-status-db-connected' : 'icon-status-db-disconnected';
            if (window.feather) feather.replace();
        }
    }
}

// Função para mostrar toast
function showToast(message, type = 'info', duration = 3000) {
    // Verificar se o Bootstrap está disponível
    if (typeof bootstrap === 'undefined') {
        console.error('Bootstrap não está disponível para toast. Usando fallback...');
        alert(message);
        return;
    }

    // Usar o container de toasts que já existe no HTML
    const toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) {
        console.error('Container de toasts não encontrado');
        alert(message);
        return;
    }

    // Criar o toast
    const toastId = 'toast-' + Date.now();
    const toastHtml = `
        <div id="${toastId}" class="toast" role="alert" aria-live="assertive" aria-atomic="true">
            <div class="toast-header bg-${type} text-white">
                <strong class="me-auto">Notificação</strong>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast" aria-label="Fechar"></button>
            </div>
            <div class="toast-body">
                ${message}
            </div>
        </div>
    `;

    toastContainer.insertAdjacentHTML('beforeend', toastHtml);
    const toastElement = document.getElementById(toastId);
    
    try {
        const toast = new bootstrap.Toast(toastElement, {
            autohide: true,
            delay: duration
        });

        toastElement.addEventListener('hidden.bs.toast', () => {
            toastElement.remove();
        });

        toast.show();
    } catch (error) {
        console.error('Erro ao mostrar toast:', error);
        alert(message);
        if (toastElement) {
            toastElement.remove();
        }
    }
}

// Função para mostrar diálogo de confirmação
async function showConfirmationDialog(message, onConfirm) {
    try {
        if (!window.electronAPI || typeof window.electronAPI.showConfirmDialog !== 'function') {
            console.error('API de diálogo não disponível');
            showToast('Erro ao abrir diálogo de confirmação. Por favor, recarregue a página.', 'danger');
            return;
        }

        const result = await window.electronAPI.showConfirmDialog({
            type: 'question',
            title: 'Confirmar Exclusão',
            message: message,
            buttons: ['Cancelar', 'Excluir'],
            defaultId: 1,
            cancelId: 0
        });

        if (result.confirmed && typeof onConfirm === 'function') {
            onConfirm();
        }
    } catch (error) {
        console.error('Erro ao mostrar diálogo:', error);
        showToast('Erro ao abrir diálogo de confirmação. Por favor, tente novamente.', 'danger');
    }
}

// Verificar se o Bootstrap está carregado
function checkBootstrap() {
    if (typeof bootstrap === 'undefined') {
        console.error('Bootstrap não está disponível. Verifique se os scripts do Bootstrap foram carregados corretamente.');
        return false;
    }
    return true;
}

// Função para inicializar a aplicação
function initializeApp() {
    console.log('Inicializando aplicação...');
    
    // Configurar navegação
    const navHome = document.getElementById('navHome');
    const navClientes = document.getElementById('navClientes');
    const navOs = document.getElementById('navOs');
    const navRelatorios = document.getElementById('navRelatorios');

    if (navHome) navHome.addEventListener('click', () => window.electronAPI?.navigateTo('index'));
    if (navClientes) navClientes.addEventListener('click', () => window.electronAPI?.navigateTo('cadastro_cliente'));
    if (navOs) navOs.addEventListener('click', () => window.electronAPI?.navigateTo('os'));
    if (navRelatorios) navRelatorios.addEventListener('click', () => window.electronAPI?.navigateTo('relatorios'));

    // Inicializar data/hora e status do banco
    updateDateTime();
    setInterval(updateDateTime, 10000);

    // Configurar status do banco de dados
    if (window.electronAPI && 
        typeof window.electronAPI.onDbStatusUpdate === 'function' && 
        typeof window.electronAPI.getInitialDbStatus === 'function') {
        const cleanup = window.electronAPI.onDbStatusUpdate(updateDbStatus);
        window.electronAPI.getInitialDbStatus()
            .then(status => {
                updateDbStatus(status);
            })
            .catch(err => {
                console.error("Erro ao obter status inicial do DB (renderer_os.js):", err);
                updateDbStatus({ connected: false });
            });
        
        // Limpar o listener quando a janela for fechada
        window.addEventListener('beforeunload', cleanup);
    } else {
        console.warn("electronAPI ou funções de status do DB não disponíveis (renderer_os.js).");
        updateDbStatus({ connected: false });
    }

    // Inicializar variáveis globais
    osForm = document.getElementById('osForm');
    if (!osForm) {
        console.log('Formulário de OS não encontrado, saindo...');
        return;
    }

    // Inicializar outras variáveis globais
    osIdField = document.getElementById('osId');
    selectedClientIdField = document.getElementById('selectedClientId');
    selectedClientInfoDiv = document.getElementById('selectedClientInfo');
    searchClientInput = document.getElementById('searchClientInput');
    clientSearchResultsContainer = document.getElementById('clientSearchResults');
    const searchClientButton = document.getElementById('searchClientButton');
    partsContainer = document.getElementById('partsContainer');
    laborCostField = document.getElementById('laborCost');
    otherCostsField = document.getElementById('otherCosts');
    totalCostField = document.getElementById('totalCost');
    statusOsField = document.getElementById('statusOs');
    entryDateField = document.getElementById('entryDate');
    saveOsButton = document.getElementById('saveOsButton');
    deleteOsButton = document.getElementById('deleteOsButton');
    addPartButton = document.getElementById('addPartButton');
    clearOsFormButton = document.getElementById('clearOsFormButton');
    osList = document.getElementById('osList');
    
    // Adicionar variáveis que estavam faltando
    equipmentField = document.getElementById('equipment');
    accessoriesField = document.getElementById('accessories');
    reportedIssueField = document.getElementById('reportedIssue');
    technicianNotesField = document.getElementById('technicianNotes');
    servicePerformedField = document.getElementById('servicePerformed');

    // Inicializar data de entrada
    if (entryDateField) {
        const now = new Date();
        const formattedDate = now.toLocaleDateString('pt-BR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
        const formattedTime = now.toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit'
        });
        entryDateField.value = `${formattedDate} ${formattedTime}`;
    }

    // Configurar botões de relatório
    const btnRelatorioClientes = document.getElementById('btnRelatorioClientes');
    const btnRelatorioOsFinalizadas = document.getElementById('btnRelatorioOsFinalizadas');
    const btnRelatorioOsAbertas = document.getElementById('btnRelatorioOsAbertas');

    if (btnRelatorioClientes) {
        btnRelatorioClientes.addEventListener('click', async () => {
            if (window.electronAPI && window.electronAPI.generateClientReport) {
                try {
                    const result = await window.electronAPI.generateClientReport();
                    if (result && result.success) {
                        showToast('Relatório de clientes gerado com sucesso!', 'success');
                    } else {
                        showToast('Erro ao gerar relatório: ' + (result?.error || 'Erro desconhecido'), 'danger');
                    }
                } catch (error) {
                    console.error('Erro ao gerar relatório de clientes:', error);
                    showToast('Erro ao gerar relatório: ' + (error.message || 'Erro desconhecido'), 'danger');
                }
            }
        });
    }

    if (btnRelatorioOsFinalizadas) {
        btnRelatorioOsFinalizadas.addEventListener('click', async () => {
            if (window.electronAPI && window.electronAPI.generateOsFinalizadasReport) {
                try {
                    const result = await window.electronAPI.generateOsFinalizadasReport();
                    if (result && result.success) {
                        showToast('Relatório de OS Finalizadas gerado com sucesso!', 'success');
                    } else {
                        showToast('Erro ao gerar relatório: ' + (result?.error || 'Erro desconhecido'), 'danger');
                    }
                } catch (error) {
                    console.error('Erro ao gerar relatório de OS finalizadas:', error);
                    showToast('Erro ao gerar relatório: ' + (error.message || 'Erro desconhecido'), 'danger');
                }
            }
        });
    }

    if (btnRelatorioOsAbertas) {
        btnRelatorioOsAbertas.addEventListener('click', async () => {
            if (window.electronAPI && window.electronAPI.generateOsAbertasReport) {
                try {
                    const result = await window.electronAPI.generateOsAbertasReport();
                    if (result && result.success) {
                        showToast('Relatório de OS Abertas gerado com sucesso!', 'success');
                    } else {
                        showToast('Erro ao gerar relatório: ' + (result?.error || 'Erro desconhecido'), 'danger');
                    }
                } catch (error) {
                    console.error('Erro ao gerar relatório de OS abertas:', error);
                    showToast('Erro ao gerar relatório: ' + (error.message || 'Erro desconhecido'), 'danger');
                }
            }
        });
    }

    // Configurar eventos do formulário
    if (osForm) {
        osForm.addEventListener('submit', handleOsFormSubmit);
    }

    // Configurar evento do botão de excluir
    if (deleteOsButton) {
        deleteOsButton.addEventListener('click', handleDeleteOs);
    }

    // Configurar evento do botão de adicionar peça
    if (addPartButton) {
        addPartButton.addEventListener('click', () => {
            console.log('Add Part Button clicked');
            addPartRow();
        });
    }

    // Configurar evento do botão de limpar formulário
    if (clearOsFormButton) {
        clearOsFormButton.addEventListener('click', initializeNewOsForm);
    }

    // Configurar busca de clientes
    if (searchClientButton) {
        searchClientButton.addEventListener('click', performClientSearch);
    }
    if (searchClientInput) {
        searchClientInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') performClientSearch();
        });
        let searchTimeout;
        searchClientInput.addEventListener('input', () => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                if (searchClientInput.value.trim().length > 0 || searchClientInput.value.trim().length === 0) {
                    performClientSearch();
                }
            }, 300);
        });
    }

    // Carregar lista de OS
    loadOsList();

    // Garantir que o Feather Icons seja inicializado corretamente
    if (typeof feather !== 'undefined') {
        feather.replace();
    } else {
        console.warn('Feather Icons não está disponível');
    }
}

// Aguardar o carregamento do DOM e do Bootstrap
document.addEventListener('DOMContentLoaded', () => {
    console.log('renderer_os.js está sendo carregado');
    
    // Verificar se o Bootstrap já está carregado
    if (checkBootstrap()) {
        console.log('Bootstrap já está disponível, inicializando aplicação...');
        initializeApp();
    } else {
        console.log('Aguardando carregamento do Bootstrap...');
        // Aguardar o evento de carregamento do Bootstrap
        window.addEventListener('bootstrapLoaded', () => {
            console.log('Bootstrap carregado, inicializando aplicação...');
            initializeApp();
        });
    }
});

// Debug inicial
console.log('renderer_os.js está sendo carregado');

// Função para calcular o custo total
function calculateTotalCost() {
    const partsTotal = Array.from(document.querySelectorAll('.part-total-price'))
        .reduce((sum, input) => sum + (parseFloat(input.value) || 0), 0);
    
    const laborCost = parseFloat(document.getElementById('laborCost')?.value || 0);
    const otherCosts = parseFloat(document.getElementById('otherCosts')?.value || 0);
    
    const totalCost = partsTotal + laborCost + otherCosts;
    const totalCostField = document.getElementById('totalCost');
    if (totalCostField) {
        totalCostField.value = totalCost.toFixed(2);
    }
}

// Função para adicionar peça
function addPartRow(partData = null) {
    console.log('addPartRow chamada');
    const partsContainer = document.getElementById('partsContainer');
    if (!partsContainer) {
        console.error('Container de peças não encontrado');
        return null;
    }
    
    const row = document.createElement('div');
    row.className = 'row g-2 part-row';
    row.innerHTML = `
        <div class="col-sm-5">
            <div class="has-validation validation-container">
                <label for="part-name" class="form-label">Peça</label>
                <input type="text" class="form-control part-name" name="part-name" placeholder="Nome da Peça" value="${partData?.name || ''}">
                <div class="invalid-feedback">Nome da peça é obrigatório.</div>
            </div>
        </div>
        <div class="col-sm-2">
            <div class="has-validation validation-container">
                <label for="part-quantity" class="form-label">Qtd <span class="text-danger">*</span></label>
                <input type="number" class="form-control part-quantity" name="part-quantity" min="1" value="${partData?.quantity || 1}" required>
                <div class="invalid-feedback">Mínimo 1.</div>
            </div>
        </div>
        <div class="col-sm-2">
            <div class="has-validation validation-container">
                <label for="part-unit-price" class="form-label">Preço Unit. <span class="text-danger">*</span></label>
                <input type="number" class="form-control part-unit-price" name="part-unit-price" min="0" step="0.01" value="${partData?.unitPrice?.toFixed(2) || '0.00'}" required>
                <div class="invalid-feedback">Valor inválido.</div>
            </div>
        </div>
        <div class="col-sm-2">
            <div class="has-validation validation-container">
                <label for="part-total-price" class="form-label">Total</label>
                <input type="text" class="form-control part-total-price" readonly value="${partData?.totalPrice?.toFixed(2) || '0.00'}">
            </div>
        </div>
        <div class="col-sm-1 d-flex align-items-end">
            <button type="button" class="btn btn-outline-danger remove-part-button" style="height: 38px;">
                <i data-feather="trash-2" class="icon-sm-action"></i>
            </button>
        </div>
    `;

    // Adicionar a nova linha ao container
    partsContainer.appendChild(row);

    // Adicionar event listeners
    const quantityInput = row.querySelector('.part-quantity');
    const unitPriceInput = row.querySelector('.part-unit-price');
    const totalPriceInput = row.querySelector('.part-total-price');
    const removeButton = row.querySelector('.remove-part-button');

    if (quantityInput && unitPriceInput && totalPriceInput) {
        const updateTotal = () => {
            const quantity = parseFloat(quantityInput.value) || 0;
            const unitPrice = parseFloat(unitPriceInput.value) || 0;
            const total = quantity * unitPrice;
            totalPriceInput.value = total.toFixed(2);
            updateTotalCost();
        };

        quantityInput.addEventListener('input', () => {
            validateInput(quantityInput);
            updateTotal();
        });

        unitPriceInput.addEventListener('input', () => {
            validateInput(unitPriceInput);
            updateTotal();
        });
    }

    if (removeButton) {
        removeButton.addEventListener('click', () => {
            row.remove();
            updateTotalCost();
            // Atualizar visibilidade dos botões de remover
            const rows = partsContainer.querySelectorAll('.part-row');
            rows.forEach((r, index) => {
                const btn = r.querySelector('.remove-part-button');
                if (btn) btn.style.display = rows.length === 1 ? 'none' : 'block';
            });
        });
    }

    // Atualizar ícones do Feather
    if (window.feather) {
        feather.replace();
    }

    return row;
}

// Função para validar um input específico
function validateInput(input) {
    if (!input) return;

    const feedbackDiv = input.closest('.has-validation')?.querySelector('.invalid-feedback');
    let isValid = true;
    let feedbackMessage = '';

    if (input.required) {
        if (input.type === 'text' && !input.value.trim()) {
            isValid = false;
            feedbackMessage = input.placeholder === "Nome da Peça" ? "Nome da peça é obrigatório" : "Campo obrigatório";
        } else if (input.type === 'number') {
            const value = parseFloat(input.value);
            if (isNaN(value) || value < parseFloat(input.min || 0)) {
                isValid = false;
                feedbackMessage = input.classList.contains('part-quantity') ? "Mínimo 1" : "Valor inválido";
            }
        } else if (input.tagName === 'SELECT' && !input.value) {
            isValid = false;
            feedbackMessage = "Selecione uma opção";
        }
    }

    // Remover classes existentes
    input.classList.remove('is-valid', 'is-invalid');
    
    if (isValid) {
        if (input.value.trim()) { // Só adiciona is-valid se tiver valor
            input.classList.add('is-valid');
        }
        if (feedbackDiv) feedbackDiv.textContent = '';
    } else {
        input.classList.add('is-invalid');
        if (feedbackDiv) feedbackDiv.textContent = feedbackMessage;
    }

    return isValid;
}

// Função para validar o formulário completo
function validateOsForm() {
    let isValid = true;
    const osForm = document.getElementById('osForm');
    if (!osForm) return false;

    // Validar campos obrigatórios do cliente
    const searchClientInput = document.getElementById('searchClientInput');
    const selectedClientIdField = document.getElementById('selectedClientId');
    if (!selectedClientIdField?.value) {
        if (searchClientInput) {
            searchClientInput.classList.add('is-invalid');
            searchClientInput.classList.remove('is-valid');
            const feedbackDiv = searchClientInput.closest('.has-validation')?.querySelector('.invalid-feedback');
            if (feedbackDiv) feedbackDiv.textContent = "Selecione um cliente.";
        }
        isValid = false;
    }

    // Validar campos obrigatórios da OS
    const requiredFields = [
        { id: 'equipment', message: "Descreva o equipamento." },
        { id: 'reportedIssue', message: "Descreva o defeito relatado." },
        { id: 'statusOs', message: "Selecione um status." }
    ];

    requiredFields.forEach(field => {
        const element = document.getElementById(field.id);
        if (element) {
            if (!element.value.trim()) {
                element.classList.add('is-invalid');
                element.classList.remove('is-valid');
                const feedbackDiv = element.closest('.has-validation')?.querySelector('.invalid-feedback');
                if (feedbackDiv) feedbackDiv.textContent = field.message;
                isValid = false;
            } else {
                element.classList.remove('is-invalid');
                element.classList.add('is-valid');
            }
        }
    });

    // Validar campos de custo
    const costFields = ['laborCost', 'otherCosts'];
    costFields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) {
            const value = parseFloat(field.value);
            if (isNaN(value) || value < 0) {
                field.classList.add('is-invalid');
                field.classList.remove('is-valid');
                const feedbackDiv = field.closest('.has-validation')?.querySelector('.invalid-feedback');
                if (feedbackDiv) feedbackDiv.textContent = "Valor deve ser numérico e não negativo.";
                isValid = false;
            } else {
                field.classList.remove('is-invalid');
                field.classList.add('is-valid');
            }
        }
    });

    // Validar peças (apenas quantidade e preço unitário são obrigatórios)
    let partsAreValid = true;
    document.querySelectorAll('.part-row').forEach(row => {
        const quantityInput = row.querySelector('.part-quantity');
        const unitPriceInput = row.querySelector('.part-unit-price');
        const nameInput = row.querySelector('.part-name');

        // Validar apenas se houver nome da peça (opcional)
        if (nameInput && nameInput.value.trim()) {
            nameInput.classList.remove('is-invalid');
            nameInput.classList.add('is-valid');
        }

        // Validar quantidade e preço unitário (obrigatórios)
        if (!validateInput(quantityInput) || !validateInput(unitPriceInput)) {
            partsAreValid = false;
        }
    });

    if (!partsAreValid) isValid = false;

    return isValid;
}

// Função para atualizar o botão de salvar
function updateSaveButton() {
    if (!saveOsButton) return;
    
    const isEditing = osIdField?.value;
    const buttonText = isEditing ? "Atualizar OS" : "Salvar OS";
    const iconName = isEditing ? "rotate-cw" : "check-circle";
    
    saveOsButton.innerHTML = `<i data-feather="${iconName}" class="icon-btn"></i> ${buttonText}`;
    
    // Garantir que os ícones sejam inicializados
    if (typeof initializeFeatherIcons === 'function') {
        initializeFeatherIcons();
    } else if (typeof feather !== 'undefined' && feather.replace) {
        feather.replace();
    }
}

// Função para inicializar o formulário de nova OS
async function initializeNewOsForm() {
    console.log('Inicializando formulário de nova OS');
    const osForm = document.getElementById('osForm');
    if (!osForm) {
        console.error('Formulário de OS não encontrado');
        return;
    }

    // Resetar o formulário
    osForm.reset();
    osForm.classList.remove('was-validated');
    
    // Limpar cliente selecionado
    if (selectedClientIdField) selectedClientIdField.value = '';
    if (searchClientInput) {
        searchClientInput.value = '';
        searchClientInput.classList.remove('is-valid', 'is-invalid');
    }
    if (selectedClientInfoDiv) {
        selectedClientInfoDiv.innerHTML = `
            <div class="selected-client-placeholder">
                <i data-feather="user" class="text-muted me-2"></i>
                <span>Nenhum cliente selecionado.</span>
            </div>
        `;
        if (window.feather) feather.replace();
    }

    // Definir status inicial
    if (statusOsField) {
        statusOsField.value = 'Aberta';
        statusOsField.classList.remove('is-valid', 'is-invalid');
    }

    // Definir data de entrada
    if (entryDateField) {
        const now = new Date();
        const formattedDate = now.toLocaleDateString('pt-BR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
        const formattedTime = now.toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit'
        });
        entryDateField.value = `${formattedDate} ${formattedTime}`;
    }

    // Limpar campos de custo
    const costFields = ['laborCost', 'otherCosts', 'totalCost'];
    costFields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) {
            field.value = '0.00';
            field.classList.remove('is-valid', 'is-invalid');
        }
    });

    // Limpar container de peças e adicionar primeira linha
    if (partsContainer) {
        partsContainer.innerHTML = '';
        const firstRow = addPartRow();
        if (firstRow) {
            const removeButton = firstRow.querySelector('.remove-part-button');
            if (removeButton) removeButton.style.display = 'none';
        }
    }

    // Limpar campos de equipamento e defeito
    const equipmentField = document.getElementById('equipment');
    const reportedIssueField = document.getElementById('reportedIssue');
    if (equipmentField) {
        equipmentField.value = '';
        equipmentField.classList.remove('is-valid', 'is-invalid');
    }
    if (reportedIssueField) {
        reportedIssueField.value = '';
        reportedIssueField.classList.remove('is-valid', 'is-invalid');
    }

    // Resetar botões
    if (saveOsButton) {
        saveOsButton.disabled = false;
        updateSaveButton();
        if (typeof initializeFeatherIcons === 'function') {
            initializeFeatherIcons();
        }
    }
    if (deleteOsButton) {
        deleteOsButton.classList.add('d-none');
    }

    // Atualizar ícones do Feather
    if (window.feather) {
        feather.replace();
    }
}

async function handleOsFormSubmit(event) {
    event.preventDefault();
    event.stopPropagation();
    osForm.classList.add('was-validated');

    if (!validateOsForm()) {
        showToast('Por favor, corrija os erros no formulário.', 'warning');
        const firstInvalid = osForm.querySelector('.is-invalid');
        if (firstInvalid) {
            firstInvalid.focus();
            firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        return;
    }

    const clientIdForOs = selectedClientIdField?.value;

    if (!clientIdForOs || typeof clientIdForOs !== 'string' || !clientIdForOs.match(/^[0-9a-fA-F]{24}$/)) {
        console.error("[Renderer OS - Submit] ERRO CRÍTICO: clientId para OS é inválido!", clientIdForOs);
        showToast("Erro: ID do cliente inválido. Selecione o cliente novamente.", "danger");
        searchClientInput?.classList.add('is-invalid');
        searchClientInput?.focus();
        if(saveOsButton) {
            saveOsButton.disabled = false;
            updateSaveButton();
        }
        return;
    }

    const partsData = [];
    document.querySelectorAll('.part-row').forEach(row => {
        const name = row.querySelector('.part-name')?.value.trim();
        const quantity = parseInt(row.querySelector('.part-quantity')?.value) || 1;
        const unitPrice = parseFloat(row.querySelector('.part-unit-price')?.value) || 0;
        if (name) { 
            partsData.push({ name, quantity, unitPrice, totalPrice: quantity * unitPrice });
        }
    });

    const osData = {
        clientId: document.getElementById('selectedClientId').value,
        equipment: document.getElementById('equipment').value,
        accessories: document.getElementById('accessories').value,
        reportedIssue: document.getElementById('reportedIssue').value,
        technicianNotes: document.getElementById('technicianNotes').value,
        servicePerformed: document.getElementById('servicePerformed').value,
        status: document.getElementById('statusOs').value,
        parts: partsData,
        laborCost: parseFloat(laborCostField?.value || 0) || 0,
        otherCosts: parseFloat(otherCostsField?.value || 0) || 0,
        totalCost: parseFloat(totalCostField?.value || 0) || 0,
    };
    
    // Garante que não vai nenhum osNumber
    delete osData.osNumber;

    const currentOsId = osIdField?.value;
    let result;

    if(saveOsButton) {
        saveOsButton.disabled = true;
        saveOsButton.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Salvando...`;
    }

    try {
        if (!window.electronAPI || 
            (currentOsId && typeof window.electronAPI.updateOs !== 'function') ||
            (!currentOsId && typeof window.electronAPI.addOS !== 'function')) {
            showToast('API de salvamento de OS não está disponível.', 'danger'); 
            if(saveOsButton) { 
                saveOsButton.disabled = false; 
                updateSaveButton();
            }
            return;
        }

        if (currentOsId) {
            result = await window.electronAPI.updateOs(currentOsId, osData);
        } else {
            result = await window.electronAPI.addOS(osData);
        }

        if (result && result.success) {
            showToast(result.message, 'success');
            await initializeNewOsForm(); 
            await loadOsList(); 
        } else {
            showToast(result?.message || 'Erro desconhecido ao salvar OS.', 'danger');
        }
    } catch (error) {
        console.error("Erro ao salvar OS:", error);
        showToast(`Erro crítico ao salvar OS: ${error.message || error}`, 'danger');
    } finally {
        if (saveOsButton) {
            saveOsButton.disabled = false;
            updateSaveButton();
        }
    }
}

async function handleDeleteOs() {
    const currentOsId = osIdField?.value;
    if (!currentOsId) return;

    await showConfirmationDialog(
        'Tem certeza que deseja excluir esta Ordem de Serviço? Esta ação não pode ser desfeita.',
        async () => {
            try {
                if (!window.electronAPI || typeof window.electronAPI.deleteOs !== 'function') {
                    showToast('API de exclusão de OS não disponível.', 'danger');
                    return;
                }
                const result = await window.electronAPI.deleteOs(currentOsId);
                if (result && result.success) {
                    showToast(result.message, 'success');
                    await initializeNewOsForm();
                    await loadOsList();
                } else {
                    showToast(result?.message || 'Erro ao excluir OS.', 'danger');
                }
            } catch (error) {
                console.error("Erro ao excluir OS:", error);
                showToast(`Erro crítico ao excluir OS: ${error.message || error}`, 'danger');
            }
        }
    );
}

async function loadOsList() {
    if (!osList) { console.warn("Elemento osList não encontrado."); return; }
    osList.innerHTML = '<tr><td colspan="6" class="text-center">Carregando... <span class="spinner-border spinner-border-sm"></span></td></tr>';

    try {
        if (!window.electronAPI || typeof window.electronAPI.getOsListPaginated !== 'function') {
            showToast('API de busca de OS não está disponível.', 'danger');
            osList.innerHTML = `<tr><td colspan="6" class="text-center text-danger">API indisponível.</td></tr>`;
            return;
        }
        const result = await window.electronAPI.getOsListPaginated();
        
        if (!result || typeof result.success === 'undefined') {
            showToast('Resposta inválida do servidor.', 'danger');
            osList.innerHTML = `<tr><td colspan="6" class="text-center text-danger">Resposta inválida.</td></tr>`;
            return;
        }
        if(!result.success){
            showToast(result.message || 'Falha ao carregar OS.', 'danger');
            osList.innerHTML = `<tr><td colspan="6" class="text-center text-danger">${result.message || 'Erro.'}</td></tr>`;
            return;
        }
        
        const { data: osData } = result;
        osList.innerHTML = ''; 
        if (!osData || osData.length === 0) {
            osList.innerHTML = '<tr><td colspan="6" class="text-center">Nenhuma OS encontrada.</td></tr>';
        } else {
            osData.forEach(os => {
                const row = osList.insertRow();
                row.innerHTML = `
                    <td>${os.osNumber || 'N/D'}</td>
                    <td>${os.clientName || 'N/A'} <small class="d-block text-muted">${formatarCPF(os.clientCpf || '')}</small></td>
                    <td>${os.entryDate ? new Date(os.entryDate).toLocaleDateString('pt-BR') : 'N/D'}</td>
                    <td><span class="badge bg-${getStatusBadgeColor(os.status)}">${os.status || 'N/D'}</span></td>
                    <td>R$ ${parseFloat(os.totalCost || 0).toFixed(2)}</td>
                    <td>
                        <button class="btn btn-sm btn-outline-primary edit-os-btn" data-id="${os._id ? os._id.toString() : ''}" title="Editar OS"><i data-feather="edit-3" class="icon-sm-action"></i></button>
                    </td>`;
                row.querySelector('.edit-os-btn')?.addEventListener('click', () => loadOsForEdit(os._id));
            });
        }

        // Atualizar ícones do Feather
        if (window.feather) {
            feather.replace();
        }
    } catch (error) {
        console.error("Erro ao carregar lista de OS:", error);
        showToast(`Erro ao carregar lista de OS: ${error.message || error}`, 'danger');
        osList.innerHTML = `<tr><td colspan="6" class="text-center text-danger">Erro ao carregar dados.</td></tr>`;
    }
}

// Função auxiliar para formatar CPF
function formatarCPF(cpf) {
    if (!cpf) return '';
    cpf = cpf.replace(/\D/g, '');
    if (cpf.length !== 11) return cpf;
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

// Função auxiliar para obter a cor do badge de status
function getStatusBadgeColor(status) {
    const statusColors = {
        'Aberta': 'warning',
        'Em Andamento': 'info',
        'Aguardando Peças': 'secondary',
        'Concluída': 'success',
        'Cancelada': 'danger'
    };
    return statusColors[status] || 'secondary';
}

// Função para carregar OS para edição
async function loadOsForEdit(osId) {
    if (!osId) return;
    
    try {
        if (!window.electronAPI || typeof window.electronAPI.getOsById !== 'function') {
            showToast('API de busca de OS não está disponível.', 'danger');
            return;
        }

        const result = await window.electronAPI.getOsById(osId);
        if (!result || !result.success) {
            showToast(result?.message || 'Erro ao carregar OS.', 'danger');
            return;
        }

        const os = result.data;
        if (!os) {
            showToast('OS não encontrada.', 'warning');
            return;
        }

        // Preencher campos do formulário
        if (osIdField) osIdField.value = os._id;
        if (selectedClientIdField) selectedClientIdField.value = os.clientId;
        if (searchClientInput) {
            searchClientInput.value = `${os.clientName || ''} - ${formatarCPF(os.clientCpf || '')}`;
            searchClientInput.classList.add('is-valid');
        }
        if (selectedClientInfoDiv) {
            selectedClientInfoDiv.innerHTML = `
                <div class="selected-client-info">
                    <div class="selected-client-header">
                        <i data-feather="user-check" class="text-success me-2"></i>
                        <span class="selected-client-title">Cliente Selecionado</span>
                    </div>
                    <div class="selected-client-content">
                        <div class="selected-client-row">
                            <span class="selected-client-label">Nome:</span>
                            <span class="selected-client-value">${os.clientName || 'N/A'}</span>
                        </div>
                        <div class="selected-client-row">
                            <span class="selected-client-label">CPF:</span>
                            <span class="selected-client-value">${formatarCPF(os.clientCpf || '')}</span>
                        </div>
                        <div class="selected-client-row">
                            <span class="selected-client-label">Telefone:</span>
                            <span class="selected-client-value">${os.clientPhone || 'N/A'}</span>
                        </div>
                        ${os.clientEmail ? `
                        <div class="selected-client-row">
                            <span class="selected-client-label">E-mail:</span>
                            <span class="selected-client-value">${os.clientEmail}</span>
                        </div>
                        ` : ''}
                    </div>
                </div>
            `;
            if (window.feather) feather.replace();
        }

        // Preencher outros campos
        if (equipmentField) equipmentField.value = os.equipment || '';
        if (accessoriesField) accessoriesField.value = os.accessories || '';
        if (reportedIssueField) reportedIssueField.value = os.reportedIssue || '';
        if (technicianNotesField) technicianNotesField.value = os.technicianNotes || '';
        if (servicePerformedField) servicePerformedField.value = os.servicePerformed || '';
        if (statusOsField) statusOsField.value = os.status || 'Aberta';
        if (entryDateField) entryDateField.value = os.entryDate ? new Date(os.entryDate).toLocaleString('pt-BR') : '';
        if (laborCostField) laborCostField.value = (os.laborCost || 0).toFixed(2);
        if (otherCostsField) otherCostsField.value = (os.otherCosts || 0).toFixed(2);
        if (totalCostField) totalCostField.value = (os.totalCost || 0).toFixed(2);

        // Limpar e preencher peças
        if (partsContainer) {
            partsContainer.innerHTML = '';
            if (os.parts && os.parts.length > 0) {
                os.parts.forEach(part => addPartRow(part));
            } else {
                const firstRow = addPartRow();
                if (firstRow) {
                    const removeButton = firstRow.querySelector('.remove-part-button');
                    if (removeButton) removeButton.style.display = 'none';
                }
            }
        }

        // Atualizar botões
        if (saveOsButton) {
            updateSaveButton();
            if (typeof initializeFeatherIcons === 'function') {
                initializeFeatherIcons();
            }
        }
        if (deleteOsButton) {
            deleteOsButton.classList.remove('d-none');
            if (typeof initializeFeatherIcons === 'function') {
                initializeFeatherIcons();
            }
        }

        // Atualizar ícones do Feather
        if (window.feather) {
            feather.replace();
        }

        // Rolar para o topo do formulário
        osForm?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (error) {
        console.error("Erro ao carregar OS para edição:", error);
        showToast(`Erro ao carregar OS: ${error.message || error}`, 'danger');
    }
}

// Função para realizar a busca de clientes
async function performClientSearch() {
    if (!searchClientInput || !clientSearchResultsContainer) return;
    
    const searchTerm = searchClientInput.value.trim();
    if (!searchTerm) {
        clientSearchResultsContainer.innerHTML = '';
        clientSearchResultsContainer.style.display = 'none';
        return;
    }

    clientSearchResultsContainer.innerHTML = '<div class="list-group-item text-muted">Buscando... <span class="spinner-border spinner-border-sm ms-1" role="status" aria-hidden="true"></span></div>';
    clientSearchResultsContainer.style.display = 'block';

    try {
        if (!window.electronAPI || typeof window.electronAPI.searchClients !== 'function') {
            showToast('API de busca de clientes não disponível.', 'danger');
            return;
        }

        const clients = await window.electronAPI.searchClients(searchTerm);
        renderClientSearchResults(clients);
    } catch (error) {
        console.error("Erro ao buscar clientes:", error);
        clientSearchResultsContainer.innerHTML = '<div class="list-group-item text-danger">Erro ao buscar clientes.</div>';
        showToast('Erro ao realizar busca de clientes.', 'danger');
    }
}

// Função para renderizar os resultados da busca de clientes
function renderClientSearchResults(clients) {
    if (!clientSearchResultsContainer) return;
    
    clientSearchResultsContainer.innerHTML = '';
    if (!clients || clients.length === 0) {
        clientSearchResultsContainer.innerHTML = '<div class="list-group-item text-muted">Nenhum cliente encontrado.</div>';
        clientSearchResultsContainer.style.display = 'block';
        return;
    }

    clients.forEach(client => {
        const item = document.createElement('a');
        item.href = '#';
        item.classList.add('list-group-item', 'list-group-item-action', 'py-2');
        item.innerHTML = `
            <div class="d-flex w-100 justify-content-between align-items-center">
                <div>
                    <strong class="d-block mb-1">${client.name}</strong>
                    <small class="text-muted d-block">CPF: ${formatarCPF(client.cpf || '')}</small>
                    <small class="text-muted d-block">Tel: ${client.phone || 'N/A'}</small>
                </div>
                <i data-feather="chevron-right" class="text-muted"></i>
            </div>
        `;
        
        item.addEventListener('click', (e) => {
            e.preventDefault();
            if (selectedClientIdField) selectedClientIdField.value = client._id;
            if (searchClientInput) {
                searchClientInput.value = `${client.name} - ${formatarCPF(client.cpf || '')}`;
                searchClientInput.classList.remove('is-invalid');
                searchClientInput.classList.add('is-valid');
            }
            if (selectedClientInfoDiv) {
                selectedClientInfoDiv.innerHTML = `
                    <div class="selected-client-info">
                        <div class="selected-client-header">
                            <i data-feather="user-check" class="text-success me-2"></i>
                            <span class="selected-client-title">Cliente Selecionado</span>
                        </div>
                        <div class="selected-client-content">
                            <div class="selected-client-row">
                                <span class="selected-client-label">Nome:</span>
                                <span class="selected-client-value">${client.name}</span>
                            </div>
                            <div class="selected-client-row">
                                <span class="selected-client-label">CPF:</span>
                                <span class="selected-client-value">${formatarCPF(client.cpf || '')}</span>
                            </div>
                            <div class="selected-client-row">
                                <span class="selected-client-label">Telefone:</span>
                                <span class="selected-client-value">${client.phone || 'N/A'}</span>
                            </div>
                            ${client.email ? `
                            <div class="selected-client-row">
                                <span class="selected-client-label">E-mail:</span>
                                <span class="selected-client-value">${client.email}</span>
                            </div>
                            ` : ''}
                        </div>
                    </div>
                `;
                if (window.feather) feather.replace();
            }
            clientSearchResultsContainer.innerHTML = '';
            clientSearchResultsContainer.style.display = 'none';
        });
        
        clientSearchResultsContainer.appendChild(item);
    });
    clientSearchResultsContainer.style.display = 'block';
    if (window.feather) feather.replace();
}

// Fechar resultados da busca ao clicar fora
document.addEventListener('click', (event) => {
    if (clientSearchResultsContainer && 
        !clientSearchResultsContainer.contains(event.target) && 
        searchClientInput && 
        !searchClientInput.contains(event.target) &&
        !searchClientButton?.contains(event.target)) {
        clientSearchResultsContainer.style.display = 'none';
    }
});

function updateTotalCost() {
    let partsTotal = 0;
    document.querySelectorAll('.part-row').forEach(row => {
        const quantity = parseInt(row.querySelector('.part-quantity')?.value) || 1;
        const unitPrice = parseFloat(row.querySelector('.part-unit-price')?.value) || 0;
        const totalPrice = quantity * unitPrice;
        partsTotal += totalPrice;
        const totalPriceField = row.querySelector('.part-total-price');
        if (totalPriceField) {
            totalPriceField.value = totalPrice.toFixed(2);
        }
    });
    const laborCost = parseFloat(document.getElementById('laborCost')?.value) || 0;
    const otherCosts = parseFloat(document.getElementById('otherCosts')?.value) || 0;
    const total = partsTotal + laborCost + otherCosts;
    const totalCostField = document.getElementById('totalCost');
    if (totalCostField) {
        totalCostField.value = total.toFixed(2);
    }
}

// Remover o listener global de modal que pode estar causando problemas
document.removeEventListener('hidden.bs.modal', () => {
    document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
    document.body.classList.remove('modal-open');
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
});