// assets/js/renderer_os.js
document.addEventListener('DOMContentLoaded', () => {
    // --- Seletores de Elementos do Formulário de OS ---
    const osForm = document.getElementById('osForm');
    const osIdField = document.getElementById('osId');
    const osNumberField = document.getElementById('osNumber');
    const entryDateField = document.getElementById('entryDate');
    const statusOsField = document.getElementById('statusOs');

    const searchClientInput = document.getElementById('searchClientInput');
    const clientSearchResultsContainer = document.getElementById('clientSearchResults');
    const selectedClientIdField = document.getElementById('selectedClientId');
    const selectedClientInfoDiv = document.getElementById('selectedClientInfo');

    const equipmentField = document.getElementById('equipment');
    const accessoriesField = document.getElementById('accessories');
    const reportedIssueField = document.getElementById('reportedIssue');
    const technicianNotesField = document.getElementById('technicianNotes');
    const servicePerformedField = document.getElementById('servicePerformed');

    const partsContainer = document.getElementById('partsContainer');
    const addPartButton = document.getElementById('addPartButton');
    const laborCostField = document.getElementById('laborCost');
    const otherCostsField = document.getElementById('otherCosts');
    const totalCostField = document.getElementById('totalCost');

    const saveOsButton = document.getElementById('saveOsButton');
    const clearOsFormButton = document.getElementById('clearOsFormButton');
    const deleteOsButton = document.getElementById('deleteOsButton');

    // --- Seletores da Lista de OS e Filtros ---
    const osTableBody = document.getElementById('osTableBody');
    const filterStatusSelect = document.getElementById('filterStatus');
    const searchOsListInputField = document.getElementById('searchOsInput');
    const osPerPageSelect = document.getElementById('osPerPageSelect');
    // const applyOsFiltersButton = document.getElementById('applyOsFiltersButton'); // REMOVIDO
    const osPaginationControls = document.getElementById('osPaginationControls');
    
    let currentOsListPage = 1;

    // --- Funções Utilitárias de UI (Toasts e Modals) ---
    function showToast(message, type = 'success') {
        const toastContainer = document.querySelector('.toast-container');
        if (!toastContainer) {
            console.warn('Toast container não encontrado! Usando alert.');
            alert(message); return;
        }
        const toastId = 'toast-os-' + Date.now();
        const toastBgClass = type === 'danger' ? 'bg-danger' : (type === 'warning' ? 'bg-warning text-dark' : (type === 'info' ? 'bg-info text-dark' : 'bg-success'));
        const toastHTML = `
            <div id="${toastId}" class="toast align-items-center text-white ${toastBgClass} border-0" role="alert" aria-live="assertive" aria-atomic="true" data-bs-delay="5000">
                <div class="d-flex"><div class="toast-body">${message}</div><button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button></div>
            </div>`;
        toastContainer.insertAdjacentHTML('beforeend', toastHTML);
        const toastElement = document.getElementById(toastId);
        if (toastElement) {
            const toast = new bootstrap.Toast(toastElement);
            toast.show();
            toastElement.addEventListener('hidden.bs.toast', () => toastElement.remove());
        }
    }

    function showConfirmationModal(message, onConfirmCallback) {
        const modalElement = document.getElementById('confirmationModal');
        const modalBody = document.getElementById('confirmationModalBody');
        const confirmButton = document.getElementById('confirmationModalConfirm');
        if (!modalElement || !modalBody || !confirmButton) {
            if (confirm(message)) {
                if (typeof onConfirmCallback === 'function') onConfirmCallback();
            }
            return;
        }
        modalBody.textContent = message;
        const bsModal = new bootstrap.Modal(modalElement);
        
        const newConfirmButton = confirmButton.cloneNode(true);
        confirmButton.parentNode.replaceChild(newConfirmButton, confirmButton);
        
        if (typeof onConfirmCallback === 'function') {
            newConfirmButton.addEventListener('click', () => { 
                onConfirmCallback(); 
                bsModal.hide(); 
            }, { once: true });
        }
        bsModal.show();
    }

    // --- LÓGICA DO RODAPÉ (Padronizada) ---
    const currentDateTimeEl = document.getElementById('currentDateTime');
    const currentYearEl = document.getElementById('currentYear');
    const dbStatusIconEl = document.getElementById('dbStatusIcon');
    const dbStatusTextEl = document.getElementById('dbStatusText');

    function updateDateTime() {
        const now = new Date();
        if (currentDateTimeEl) {
            currentDateTimeEl.textContent = now.toLocaleString('pt-BR', {
                day: '2-digit', month: '2-digit', year: 'numeric',
                hour: '2-digit', minute: '2-digit'
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
            if (typeof feather !== 'undefined' && feather.replace) feather.replace();
        }
    }
    updateDateTime();
    setInterval(updateDateTime, 10000);
    if (window.electronAPI && window.electronAPI.onDbStatusUpdate && window.electronAPI.getInitialDbStatus) {
        window.electronAPI.onDbStatusUpdate(updateDbStatus);
        window.electronAPI.getInitialDbStatus().then(updateDbStatus).catch(() => updateDbStatus({ connected: false }));
    } else {
        updateDbStatus({ connected: false });
    }
    // --- FIM DA LÓGICA DO RODAPÉ ---

    // --- Navegação do Header (Padronizada) ---
    document.getElementById('goHomeNav')?.addEventListener('click', () => window.electronAPI?.navigateTo('index.html'));
    document.getElementById('goToClientesPage')?.addEventListener('click', () => window.electronAPI?.navigateTo('cadastro_cliente.html'));

    // --- Funções de Formatação (Idealmente de arquivos utilitários) ---
    function formatarCPF(cpf) {
        if (!cpf) return '';
        let cpfLimpo = cpf.toString().replace(/\D/g, '');
        if (cpfLimpo.length > 11) cpfLimpo = cpfLimpo.substring(0,11);
        if (cpfLimpo.length <= 3) return cpfLimpo;
        if (cpfLimpo.length <= 6) return cpfLimpo.replace(/(\d{3})(\d+)/, '$1.$2');
        if (cpfLimpo.length <= 9) return cpfLimpo.replace(/(\d{3})(\d{3})(\d+)/, '$1.$2.$3');
        return cpfLimpo.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }
    function formatarTelefone(tel) { 
        if (!tel) return '';
        const telLimpo = tel.toString().replace(/\D/g, '');
        if (telLimpo.length === 11) return `(${telLimpo.substring(0,2)}) ${telLimpo.substring(2,7)}-${telLimpo.substring(7,11)}`;
        if (telLimpo.length === 10) return `(${telLimpo.substring(0,2)}) ${telLimpo.substring(2,6)}-${telLimpo.substring(6,10)}`;
        return telLimpo; 
    }

    // --- Lógica de Busca de Cliente para a OS ---
    let clientSearchTimeout;
    if (searchClientInput) {
        searchClientInput.addEventListener('input', () => {
            clearTimeout(clientSearchTimeout);
            if(selectedClientIdField) selectedClientIdField.value = ''; 
            if(selectedClientInfoDiv) selectedClientInfoDiv.innerHTML = 'Buscando...'; 
            searchClientInput.classList.remove('is-invalid', 'is-valid');

            clientSearchTimeout = setTimeout(async () => {
                const searchTerm = searchClientInput.value.trim();
                if (searchTerm.length < 1) {
                    if(clientSearchResultsContainer) {
                        clientSearchResultsContainer.innerHTML = '';
                        clientSearchResultsContainer.style.display = 'none';
                    }
                    if(searchTerm.length === 0 && selectedClientInfoDiv) selectedClientInfoDiv.innerHTML = 'Nenhum cliente selecionado.';
                    return;
                }
                try {
                    if (!window.electronAPI || typeof window.electronAPI.searchClients !== 'function') {
                        showToast('API de busca de cliente não disponível.', 'danger'); return;
                    }
                    const clients = await window.electronAPI.searchClients(searchTerm);
                    renderClientSearchResults(clients);
                } catch (error) {
                    console.error("Erro ao buscar clientes:", error);
                    if(clientSearchResultsContainer) {
                        clientSearchResultsContainer.innerHTML = '<div class="list-group-item text-danger">Erro ao buscar.</div>';
                        clientSearchResultsContainer.style.display = 'block';
                    }
                    showToast("Erro ao buscar clientes.", "danger");
                }
            }, 400);
        });
    }

    function renderClientSearchResults(clients) {
        if (!clientSearchResultsContainer) return;
        clientSearchResultsContainer.innerHTML = '';
        if (!clients || clients.length === 0) {
            clientSearchResultsContainer.innerHTML = '<div class="list-group-item text-muted">Nenhum cliente encontrado.</div>';
            if (selectedClientInfoDiv && selectedClientIdField && !selectedClientIdField.value) selectedClientInfoDiv.innerHTML = 'Nenhum cliente correspondente.';
            clientSearchResultsContainer.style.display = 'block';
            return;
        }
        clients.forEach(client => {
            const item = document.createElement('a');
            item.href = '#';
            item.classList.add('list-group-item', 'list-group-item-action');
            item.innerHTML = `<strong>${client.name}</strong> <small class="text-muted d-block">CPF: ${formatarCPF(client.cpf || '')}</small>`;
            item.dataset.clientId = client && client._id ? client._id.toString() : ''; 

            item.addEventListener('click', (e) => {
                e.preventDefault();
                const clientIdFromDataset = e.currentTarget.dataset.clientId;
                const selectedClientData = clients.find(c => (c._id ? c._id.toString() : '') === clientIdFromDataset);
                
                if (selectedClientData) {
                    selectClient(selectedClientData);
                } else {
                    console.error("Cliente não encontrado na lista original ao clicar. ID do dataset:", clientIdFromDataset);
                    showToast("Erro ao selecionar cliente: ID não encontrado na lista carregada.", "danger");
                }
                clientSearchResultsContainer.innerHTML = '';
                clientSearchResultsContainer.style.display = 'none';
                if (searchClientInput && selectedClientData) searchClientInput.value = selectedClientData.name; 
                if (searchClientInput) {
                    searchClientInput.classList.remove('is-invalid');
                    if (selectedClientData) searchClientInput.classList.add('is-valid');
                }
            });
            clientSearchResultsContainer.appendChild(item);
        });
        clientSearchResultsContainer.style.display = 'block';
    }
    
    document.addEventListener('click', function(event) {
        if (clientSearchResultsContainer && !clientSearchResultsContainer.contains(event.target) && searchClientInput && !searchClientInput.contains(event.target)) {
            clientSearchResultsContainer.style.display = 'none';
        }
    });

    function selectClient(client) {
        console.log("[Renderer OS - selectClient] Objeto client recebido:", client);
        if (client && client._id) {
            const clientIdString = client._id.toString();
            console.log("[Renderer OS - selectClient] ID do cliente (string):", clientIdString);
            
            if (selectedClientIdField) {
                selectedClientIdField.value = clientIdString;
                console.log("[Renderer OS - selectClient] selectedClientIdField.value definido para:", selectedClientIdField.value);
            }
            if (selectedClientInfoDiv) {
                selectedClientInfoDiv.innerHTML = `<strong>${client.name || ''}</strong><br><small>CPF: ${formatarCPF(client.cpf || '')} | Tel: ${formatarTelefone(client.phone || '')}</small>`;
            }
            if (searchClientInput) {
                searchClientInput.classList.remove('is-invalid');
                searchClientInput.classList.add('is-valid');
            }
        } else {
            console.error("[Renderer OS - selectClient] Tentativa de selecionar cliente inválido ou sem _id:", client);
            clearSelectedClient();
            if (selectedClientInfoDiv) selectedClientInfoDiv.innerHTML = 'Erro: Cliente inválido.';
        }
    }

    function clearSelectedClient() {
        if (selectedClientIdField) selectedClientIdField.value = '';
        if (selectedClientInfoDiv) selectedClientInfoDiv.innerHTML = 'Nenhum cliente selecionado.';
        if (searchClientInput) {
            searchClientInput.value = '';
            searchClientInput.classList.remove('is-invalid', 'is-valid');
        }
    }

    // --- Lógica de Peças e Custos ---
    if (addPartButton) addPartButton.addEventListener('click', () => addPartRow());

    function addPartRow(part = { name: '', quantity: 1, unitPrice: 0.00 }) {
        if (!partsContainer) return;
        const partId = `part-${Date.now()}`;
        const row = document.createElement('div');
        row.classList.add('row', 'g-2', 'mb-2', 'align-items-center', 'part-row');
        row.id = partId;
        row.innerHTML = `
            <div class="col-sm-5">
                <input type="text" class="form-control form-control-sm part-name" placeholder="Nome da Peça" value="${part.name || ''}" required>
                <div class="invalid-feedback">Nome obrigatório.</div>
            </div>
            <div class="col-sm-2">
                <input type="number" class="form-control form-control-sm part-quantity cost-input" placeholder="Qtd" value="${part.quantity || 1}" min="1" required>
                <div class="invalid-feedback">Min 1.</div>
            </div>
            <div class="col-sm-2">
                <input type="number" step="0.01" min="0" class="form-control form-control-sm part-unit-price cost-input" placeholder="Unit. R$" value="${parseFloat(part.unitPrice || 0).toFixed(2)}" required>
                <div class="invalid-feedback">Min 0.</div>
            </div>
            <div class="col-sm-2">
                <input type="text" class="form-control form-control-sm part-total-price bg-light" placeholder="Total R$" value="${((part.quantity || 1) * parseFloat(part.unitPrice || 0)).toFixed(2)}" readonly>
            </div>
            <div class="col-sm-1 text-end">
                <button type="button" class="btn btn-sm btn-outline-danger remove-part-button" aria-label="Remover Peça"><i data-feather="x-circle" class="icon-sm-action"></i></button>
            </div>`;
        partsContainer.appendChild(row);
        
        const createdRow = document.getElementById(partId);
        if (createdRow) {
            createdRow.querySelectorAll('.part-name, .part-quantity, .part-unit-price').forEach(input => {
                input.addEventListener('input', () => {
                    if (input.checkValidity()) {
                        input.classList.remove('is-invalid'); input.classList.add('is-valid');
                    } else {
                        input.classList.remove('is-valid'); // Garante que 'is-valid' seja removido se tornou inválido
                    }
                });
            });
            createdRow.querySelectorAll('.cost-input').forEach(input => input.addEventListener('input', calculateTotalCost));
            const removeButton = createdRow.querySelector('.remove-part-button');
            if (removeButton) {
                removeButton.addEventListener('click', () => { createdRow.remove(); calculateTotalCost(); });
            }
            if (typeof feather !== 'undefined' && feather.replace) feather.replace(); // Para o ícone 'x-circle'
        }
        calculateTotalCost();
    }
    
    if (partsContainer) {
        partsContainer.addEventListener('input', (event) => {
            const target = event.target;
            if (target.classList.contains('part-quantity') || target.classList.contains('part-unit-price')) {
                const row = target.closest('.part-row');
                if(row) {
                    const quantityInput = row.querySelector('.part-quantity');
                    const unitPriceInput = row.querySelector('.part-unit-price');
                    const quantity = parseFloat(quantityInput?.value) || 0;
                    const unitPrice = parseFloat(unitPriceInput?.value) || 0;
                    const partTotalPriceField = row.querySelector('.part-total-price');
                    if(partTotalPriceField) partTotalPriceField.value = (quantity * unitPrice).toFixed(2);
                }
            }
        });
    }

    [laborCostField, otherCostsField].forEach(field => {
        if (field) {
            field.addEventListener('input', () => {
                calculateTotalCost();
                const value = parseFloat(field.value);
                if (isNaN(value) || value < 0) {
                    field.classList.add('is-invalid'); field.classList.remove('is-valid');
                } else {
                    field.classList.remove('is-invalid'); field.classList.add('is-valid');
                }
            });
            field.addEventListener('blur', (e) => { 
                const value = parseFloat(e.target.value || 0);
                e.target.value = value.toFixed(2);
                if (value >= 0) {
                    e.target.classList.add('is-valid'); e.target.classList.remove('is-invalid');
                } else {
                    e.target.classList.add('is-invalid'); e.target.classList.remove('is-valid');
                }
            });
        }
    });

    function calculateTotalCost() {
        let partsTotal = 0;
        document.querySelectorAll('.part-row').forEach(row => {
            const totalField = row.querySelector('.part-total-price');
            partsTotal += parseFloat(totalField?.value) || 0;
        });
        const labor = parseFloat(laborCostField?.value || 0) || 0;
        const others = parseFloat(otherCostsField?.value || 0) || 0;
        if (totalCostField) totalCostField.value = (partsTotal + labor + others).toFixed(2);
    }

    // --- Validação do Formulário OS ---
    function validateOsForm() {
        let isValid = true;
        if (!osForm) return false; 

        const fieldsToValidate = [
            { el: searchClientInput, check: () => selectedClientIdField?.value, msg: "Selecione um cliente." },
            { el: equipmentField, check: () => equipmentField?.value.trim(), msg: "Descreva o equipamento." },
            { el: reportedIssueField, check: () => reportedIssueField?.value.trim(), msg: "Descreva o defeito relatado." },
            { el: statusOsField, check: () => statusOsField?.value, msg: "Selecione um status." }
        ];

        fieldsToValidate.forEach(item => {
            if (item.el) {
                const feedbackDiv = item.el.closest('.mb-3, .col-md-7')?.querySelector('.invalid-feedback'); // Ajustado para buscar feedback
                if (!item.check()) {
                    item.el.classList.add('is-invalid'); item.el.classList.remove('is-valid');
                    if (feedbackDiv) feedbackDiv.textContent = item.msg;
                    isValid = false;
                } else {
                    item.el.classList.remove('is-invalid'); item.el.classList.add('is-valid');
                }
            }
        });

        [laborCostField, otherCostsField].forEach(field => {
            if (field) {
                const val = parseFloat(field.value);
                const feedbackDiv = field.closest('.mb-3')?.querySelector('.invalid-feedback');
                if (isNaN(val) || val < 0) {
                    field.classList.add('is-invalid'); field.classList.remove('is-valid');
                    if (feedbackDiv) feedbackDiv.textContent = "Valor deve ser numérico e não negativo.";
                    isValid = false;
                } else {
                    field.classList.remove('is-invalid'); field.classList.add('is-valid');
                }
            }
        });
        
        let partsAreValid = true;
        document.querySelectorAll('.part-row').forEach(row => {
            const partNameField = row.querySelector('.part-name');
            const partQuantityField = row.querySelector('.part-quantity');
            const partUnitPriceField = row.querySelector('.part-unit-price');

            [partNameField, partQuantityField, partUnitPriceField].forEach(pf => {
                if(pf) {
                    const feedbackDiv = pf.closest('div[class*="col-"]')?.querySelector('.invalid-feedback');
                    let fieldIsValid = true;
                    if (pf.required && ((pf.type === 'text' && !pf.value.trim()) || (pf.type === 'number' && pf.value === ''))) {
                        fieldIsValid = false;
                        if (feedbackDiv) feedbackDiv.textContent = pf.placeholder === "Nome da Peça" ? "Nome obrigatório." : "Obrigatório.";
                    } else if (pf.type === 'number') {
                        const val = parseFloat(pf.value);
                        const min = parseFloat(pf.min);
                        if (isNaN(val) || (pf.hasAttribute('min') && val < min)) {
                            fieldIsValid = false;
                            if (feedbackDiv) feedbackDiv.textContent = `Mínimo ${min}.`;
                        }
                    }
                    
                    if (fieldIsValid && pf.value.trim()) { // Adiciona is-valid apenas se preenchido e válido
                        pf.classList.remove('is-invalid'); pf.classList.add('is-valid');
                    } else if (!fieldIsValid) {
                        pf.classList.add('is-invalid'); pf.classList.remove('is-valid');
                        partsAreValid = false;
                    } else { // Campo não obrigatório e vazio, ou opcional e válido
                        pf.classList.remove('is-invalid', 'is-valid');
                    }
                }
            });
        });
        if (!partsAreValid) isValid = false;
        return isValid;
    }

    // --- CRUD OS ---
    if (osForm) {
        osForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            event.stopPropagation();
            osForm.classList.add('was-validated');

            if (!validateOsForm()) {
                showToast('Por favor, corrija os erros no formulário.', 'warning');
                const firstInvalid = osForm.querySelector('.is-invalid'); // Procura o primeiro campo inválido
                if (firstInvalid && typeof firstInvalid.focus === 'function') firstInvalid.focus();
                return;
            }

            const clientIdForOs = selectedClientIdField?.value;
            console.log("[Renderer OS - Submit] osData.clientId ANTES do envio:", clientIdForOs, "Tipo:", typeof clientIdForOs);

            if (!clientIdForOs || typeof clientIdForOs !== 'string' || !clientIdForOs.match(/^[0-9a-fA-F]{24}$/)) {
                console.error("[Renderer OS - Submit] ERRO CRÍTICO: clientId para OS é inválido!", clientIdForOs);
                showToast("Erro: ID do cliente inválido. Selecione o cliente novamente.", "danger");
                searchClientInput?.classList.add('is-invalid');
                searchClientInput?.focus();
                if(saveOsButton) { // Restaura o botão
                    saveOsButton.disabled = false;
                    const buttonText = osIdField?.value ? "Atualizar OS" : "Salvar OS";
                    const iconName = osIdField?.value ? "arrow-clockwise" : "check-circle";
                    saveOsButton.innerHTML = `<i data-feather="${iconName}" class="icon-btn"></i> ${buttonText}`;
                    if (typeof feather !== 'undefined' && feather.replace) feather.replace();
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
                osNumber: osNumberField?.value,
                clientId: clientIdForOs, 
                clientName: selectedClientInfoDiv?.querySelector('strong')?.textContent || 'N/A',
                clientCpf: selectedClientInfoDiv?.querySelector('small')?.textContent.includes('CPF: ') ? selectedClientInfoDiv.querySelector('small').textContent.split('CPF: ')[1].split(' |')[0].replace(/\D/g,'') : '',
                clientPhone: selectedClientInfoDiv?.querySelector('small')?.textContent.includes('Tel: ') ? selectedClientInfoDiv.querySelector('small').textContent.split('Tel: ')[1].replace(/\D/g,'') : '',
                equipment: equipmentField?.value.trim(),
                accessories: accessoriesField?.value.trim(),
                reportedIssue: reportedIssueField?.value.trim(),
                technicianNotes: technicianNotesField?.value.trim(),
                servicePerformed: servicePerformedField?.value.trim(),
                status: statusOsField?.value,
                parts: partsData,
                laborCost: parseFloat(laborCostField?.value || 0) || 0,
                otherCosts: parseFloat(otherCostsField?.value || 0) || 0,
                totalCost: parseFloat(totalCostField?.value || 0) || 0,
            };
            
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
                        const buttonText = currentOsId ? "Atualizar OS" : "Salvar OS";
                        const iconName = currentOsId ? "arrow-clockwise" : "check-circle";
                        saveOsButton.innerHTML = `<i data-feather="${iconName}" class="icon-btn"></i> ${buttonText}`;
                        if (typeof feather !== 'undefined' && feather.replace) feather.replace();
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
                    await loadOsListWithCurrentFilters(); 
                } else {
                    showToast(result?.message || 'Erro desconhecido ao salvar OS.', 'danger');
                }
            } catch (error) {
                console.error("Erro ao salvar OS:", error);
                showToast(`Erro crítico ao salvar OS: ${error.message || error}`, 'danger');
            } finally {
                if (saveOsButton) {
                    saveOsButton.disabled = false;
                    const buttonText = osIdField?.value ? "Atualizar OS" : "Salvar OS";
                    const iconName = osIdField?.value ? "arrow-clockwise" : "check-circle";
                    saveOsButton.innerHTML = `<i data-feather="${iconName}" class="icon-btn"></i> ${buttonText}`;
                    if (typeof feather !== 'undefined' && feather.replace) feather.replace();
                }
            }
        });
    }

    if (clearOsFormButton) clearOsFormButton.addEventListener('click', initializeNewOsForm);
    if (deleteOsButton) deleteOsButton.addEventListener('click', handleDeleteOs);

    async function initializeNewOsForm() {
        if (osForm) {
            osForm.reset();
            osForm.classList.remove('was-validated'); 
        }
        if (osIdField) osIdField.value = '';
        clearSelectedClient(); 
        if (partsContainer) partsContainer.innerHTML = ''; 
        if (laborCostField) laborCostField.value = '0.00';
        if (otherCostsField) otherCostsField.value = '0.00';
        calculateTotalCost(); 
        if (statusOsField) statusOsField.value = 'Aberta';
        if (entryDateField) entryDateField.value = new Date().toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit', year: 'numeric'}) + ' ' + new Date().toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'});
        
        try {
            if (window.electronAPI && typeof window.electronAPI.getNextOsNumber === 'function') {
                const nextNumber = await window.electronAPI.getNextOsNumber();
                if (osNumberField) osNumberField.value = nextNumber;
            } else if(osNumberField) {
                 osNumberField.value = `OS-DEF${Date.now().toString().slice(-3)}`;
                 if(!window.electronAPI || !window.electronAPI.getNextOsNumber) console.warn("electronAPI.getNextOsNumber não disponível.");
            }
        } catch (e) {
            if (osNumberField) osNumberField.value = `OS-ERR${Date.now().toString().slice(-3)}`;
            console.error("Erro ao buscar próximo número de OS", e);
            showToast("Erro ao gerar número da OS.", "warning");
        }

        if (saveOsButton) {
            saveOsButton.innerHTML = `<i data-feather="check-circle" class="icon-btn"></i> Salvar OS`;
            saveOsButton.disabled = false;
            if (typeof feather !== 'undefined' && feather.replace) feather.replace();
        }
        if (deleteOsButton) deleteOsButton.classList.add('d-none');
        if (searchClientInput) searchClientInput.focus();
        
        osForm?.querySelectorAll('.form-control, .form-select').forEach(field => {
            field.classList.remove('is-invalid', 'is-valid');
        });
    }

    async function handleDeleteOs() {
        const currentOsId = osIdField?.value;
        if (!currentOsId) return;
        showConfirmationModal('Tem certeza que deseja excluir esta Ordem de Serviço? Esta ação não pode ser desfeita.', async () => {
            try {
                if (!window.electronAPI || typeof window.electronAPI.deleteOs !== 'function') {
                     showToast('API de exclusão de OS não disponível.', 'danger'); return;
                }
                const result = await window.electronAPI.deleteOs(currentOsId);
                if (result && result.success) {
                    showToast(result.message, 'success');
                    await initializeNewOsForm();
                    await loadOsListWithCurrentFilters();
                } else {
                    showToast(result?.message || 'Erro ao excluir OS.', 'danger');
                }
            } catch (error) {
                console.error("Erro ao excluir OS:", error);
                showToast(`Erro crítico ao excluir OS: ${error.message || error}`, 'danger');
            }
        });
    }

    // --- Listagem, Filtragem e Paginação de OS ---
    if (filterStatusSelect) { // ADICIONADO LISTENER PARA FILTRO DE STATUS
        filterStatusSelect.addEventListener('change', () => {
            currentOsListPage = 1;
            loadOsListWithCurrentFilters();
        });
    }
    if (osPerPageSelect) {
        osPerPageSelect.addEventListener('change', () => {
            currentOsListPage = 1; 
            loadOsListWithCurrentFilters();
        });
    }
    let searchOsListTimeout;
    if (searchOsListInputField) {
        searchOsListInputField.addEventListener('input', () => {
            clearTimeout(searchOsListTimeout);
            searchOsListTimeout = setTimeout(() => {
                currentOsListPage = 1;
                loadOsListWithCurrentFilters();
            }, 400);
        });
    }
    // REMOVIDO O LISTENER PARA applyOsFiltersButton

    async function loadOsListWithCurrentFilters() {
        const searchTerm = searchOsListInputField?.value.trim() || '';
        const statusFilter = filterStatusSelect?.value || '';
        const limit = parseInt(osPerPageSelect?.value) || 10;
        await loadOsList(currentOsListPage, limit, searchTerm, statusFilter); 
    }

    async function loadOsList(page = 1, limit = 10, searchTerm = '', status = '') {
        currentOsListPage = page;
        if (!osTableBody) { console.warn("Elemento osTableBody não encontrado."); return; }
        osTableBody.innerHTML = '<tr><td colspan="7" class="text-center">Carregando... <span class="spinner-border spinner-border-sm"></span></td></tr>';

        try {
            if (!window.electronAPI || typeof window.electronAPI.getOsListPaginated !== 'function') {
                showToast('API de busca de OS não está disponível.', 'danger');
                osTableBody.innerHTML = `<tr><td colspan="7" class="text-center text-danger">API indisponível.</td></tr>`;
                renderOsPagination(0, limit, page); return;
            }
            const result = await window.electronAPI.getOsListPaginated({ page, limit, searchTerm, filters: { status } });
            console.log("[Renderer OS - loadOsList] Resultado:", JSON.stringify(result, null, 2));

            if (!result || typeof result.success === 'undefined') {
                showToast('Resposta inválida do servidor.', 'danger');
                osTableBody.innerHTML = `<tr><td colspan="7" class="text-center text-danger">Resposta inválida.</td></tr>`;
                renderOsPagination(0, limit, page); return;
            }
            if(!result.success){
                showToast(result.message || 'Falha ao carregar OS.', 'danger');
                osTableBody.innerHTML = `<tr><td colspan="7" class="text-center text-danger">${result.message || 'Erro.'}</td></tr>`;
                renderOsPagination(0, limit, page); return;
            }
            
            const { data: osList, totalCount } = result;
            osTableBody.innerHTML = ''; 
            if (!osList || osList.length === 0) {
                osTableBody.innerHTML = '<tr><td colspan="7" class="text-center">Nenhuma OS encontrada.</td></tr>';
            } else {
                osList.forEach(os => {
                    const row = osTableBody.insertRow();
                    row.innerHTML = `
                        <td>${os.osNumber || 'N/D'}</td>
                        <td>${os.clientName || 'N/A'} <small class="d-block text-muted">${formatarCPF(os.clientCpf || '')}</small></td>
                        <td>${os.equipment || 'N/D'}</td>
                        <td>${os.entryDate ? new Date(os.entryDate).toLocaleDateString('pt-BR') : 'N/D'}</td>
                        <td><span class="badge bg-${getStatusBadgeColor(os.status)}">${os.status || 'N/D'}</span></td>
                        <td>${parseFloat(os.totalCost || 0).toFixed(2)}</td>
                        <td>
                            <button class="btn btn-sm btn-outline-primary edit-os-btn" data-id="${os._id ? os._id.toString() : ''}" title="Editar OS"><i data-feather="edit-3" class="icon-sm-action"></i></button>
                        </td>`;
                    const editButton = row.querySelector('.edit-os-btn');
                    if (editButton) editButton.addEventListener('click', () => {
                        const osIdToLoad = editButton.dataset.id;
                        if (osIdToLoad) loadOsForEditing(osIdToLoad);
                        else showToast("ID da OS não encontrado.", "warning");
                    });
                });
            }
            renderOsPagination(totalCount, limit, page);
            if (typeof feather !== 'undefined' && feather.replace) feather.replace();
        } catch (error) {
            console.error("Erro catastrófico ao carregar OS:", error);
            showToast('Erro crítico ao carregar OS.', 'danger');
            if (osTableBody) osTableBody.innerHTML = '<tr><td colspan="7" class="text-center text-danger">Erro crítico.</td></tr>';
            renderOsPagination(0, limit, page);
        }
    }
    
    function renderOsPagination(totalItems, itemsPerPage, currentPage) {
        if (!osPaginationControls) return;
        osPaginationControls.innerHTML = '';
        const totalPages = Math.ceil(totalItems / itemsPerPage);
        if (totalPages <= 1) return;

        const createPageItem = (pageTarget, textDisplay, isActive, isDisabled) => {
            const li = document.createElement('li');
            li.classList.add('page-item');
            if (isActive) li.classList.add('active');
            if (isDisabled) li.classList.add('disabled');
            const a = document.createElement('a');
            a.classList.add('page-link'); a.href = '#'; a.textContent = textDisplay;
            if (!isDisabled && pageTarget !== 0) {
                a.addEventListener('click', (e) => {
                    e.preventDefault();
                    currentOsListPage = pageTarget; 
                    loadOsListWithCurrentFilters(); 
                });
            }
            li.appendChild(a); return li;
        };
        
        osPaginationControls.appendChild(createPageItem(currentPage - 1, 'Anterior', false, currentPage === 1));
        let startPage = Math.max(1, currentPage - 1); let endPage = Math.min(totalPages, currentPage + 1);
        if (totalPages > 3) {
            if (currentPage <= 2) { startPage = 1; endPage = Math.min(totalPages, 3); } 
            else if (currentPage >= totalPages - 1) { startPage = Math.max(1, totalPages - 2); endPage = totalPages; }
        } else { startPage = 1; endPage = totalPages; }
        if (startPage > 1) {
            osPaginationControls.appendChild(createPageItem(1, '1'));
            if (startPage > 2) osPaginationControls.appendChild(createPageItem(0, '...', false, true));
        }
        for (let i = startPage; i <= endPage; i++) {
            osPaginationControls.appendChild(createPageItem(i, i.toString(), i === currentPage));
        }
        if (endPage < totalPages) {
            if (endPage < totalPages - 1) osPaginationControls.appendChild(createPageItem(0, '...', false, true));
            osPaginationControls.appendChild(createPageItem(totalPages, totalPages.toString()));
        }
        osPaginationControls.appendChild(createPageItem(currentPage + 1, 'Próximo', false, currentPage === totalPages));
    }

    async function loadOsForEditing(osIdValue) {
        if (!osIdValue || (typeof window.electronAPI?.getOsById !== 'function')) {
            showToast('ID da OS inválido ou API não disponível.', 'warning'); return;
        }
        try {
            const result = await window.electronAPI.getOsById(osIdValue); 
            console.log("[Renderer OS - loadOsForEditing] Resultado de getOsById:", JSON.stringify(result, null, 2));

            if (!result || !result.success || !result.data) {
                showToast(result?.message || 'OS não encontrada para edição.', 'warning'); return;
            }
            const os = result.data;

            await initializeNewOsForm(); 
            if(osForm) osForm.classList.remove('was-validated');

            if(osIdField) osIdField.value = os._id ? os._id.toString() : '';
            if(osNumberField) osNumberField.value = os.osNumber || '';
            if(entryDateField) entryDateField.value = os.entryDate ? (new Date(os.entryDate).toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit', year: 'numeric'}) + ' ' + new Date(os.entryDate).toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'})) : '';
            if(statusOsField) statusOsField.value = os.status || 'Aberta';

            if (os.clientId) {
                 if (typeof window.electronAPI?.getClientById === 'function') {
                    const clientResult = await window.electronAPI.getClientById(os.clientId.toString());
                    console.log("[Renderer OS - loadOsForEditing] Resultado de getClientById para OS:", JSON.stringify(clientResult, null, 2));
                    if(clientResult && clientResult.success && clientResult.data) {
                        selectClient(clientResult.data);
                        if(searchClientInput) searchClientInput.value = clientResult.data.name || ''; 
                    } else { 
                        clearSelectedClient();
                        if(selectedClientInfoDiv) selectedClientInfoDiv.innerHTML = `<span class="text-danger">Cliente (ID: ${os.clientId}) não encontrado.</span>`;
                        showToast(clientResult?.message || `Cliente com ID ${os.clientId} não encontrado.`, 'warning');
                    }
                 } else { showToast('API de busca de cliente não disponível.', 'danger'); }
            } else { clearSelectedClient(); }

            if(equipmentField) equipmentField.value = os.equipment || '';
            if(accessoriesField) accessoriesField.value = os.accessories || '';
            if(reportedIssueField) reportedIssueField.value = os.reportedIssue || '';
            if(technicianNotesField) technicianNotesField.value = os.technicianNotes || '';
            if(servicePerformedField) servicePerformedField.value = os.servicePerformed || '';
            if(partsContainer) partsContainer.innerHTML = ''; 
            (os.parts || []).forEach(part => addPartRow(part));
            if(laborCostField) laborCostField.value = parseFloat(os.laborCost || 0).toFixed(2);
            if(otherCostsField) otherCostsField.value = parseFloat(os.otherCosts || 0).toFixed(2);
            calculateTotalCost(); 

            if(saveOsButton) {
                saveOsButton.innerHTML = `<i data-feather="arrow-clockwise" class="icon-btn"></i> Atualizar OS`;
                saveOsButton.disabled = false;
            }
            if(deleteOsButton) deleteOsButton.classList.remove('d-none');
            showToast('OS carregada para edição.', 'info');
            if (typeof feather !== 'undefined' && feather.replace) feather.replace(); // Ícones no botão
            if (typeof window.scrollTo === 'function') window.scrollTo({ top: 0, behavior: 'smooth' }); 
        } catch (error) {
            console.error("Erro catastrófico ao carregar OS para edição:", error);
            showToast(`Erro ao carregar OS: ${error.message || error}`, 'danger');
        }
    }

    function getStatusBadgeColor(status) {
        const colors = {
            'Aberta': 'primary', 'Em Análise': 'info', 'Aguardando Aprovação': 'warning',
            'Aguardando Peças': 'secondary', 'Em Reparo': 'success', 'Finalizada': 'dark',
            'Cancelada': 'danger', 'Entregue': 'light text-dark border'
        };
        return colors[status] || 'light';
    }
    
    // --- Inicialização ---
    if (osForm) {
        initializeNewOsForm(); 
        loadOsListWithCurrentFilters(); 
    } else {
        console.warn("Formulário OS (osForm) não encontrado no DOM.");
    }

    if (typeof feather !== 'undefined' && feather.replace) {
        try { feather.replace(); } catch(e) { console.error("Erro Feather Icons (final):", e); }
    } else { console.warn("Feather Icons não carregado (final)."); }

    // --- Geração de Relatórios (IPC) ---
    const { ipcRenderer } = window.electronAPI || {};
    const reportButton = document.getElementById('generateReportButton');
    if (reportButton && ipcRenderer) {
        reportButton.addEventListener('click', () => {
            const reportType = document.getElementById('reportTypeSelect')?.value || 'os';
            ipcRenderer.send('trigger-generate-report', reportType);
        });
    }
});