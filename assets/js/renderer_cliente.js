// assets/js/renderer_cliente.js
document.addEventListener('DOMContentLoaded', () => {
    // --- Seletores de Elementos ---
    const clientForm = document.getElementById('clientForm');
    const clientIdField = document.getElementById('clientId');
    const nameField = document.getElementById('name');
    const cpfField = document.getElementById('cpf');
    const cpfErrorFeedbackEl = document.getElementById('cpfErrorFeedback');
    const phoneField = document.getElementById('phone');
    const emailField = document.getElementById('email');
    
    const cepField = document.getElementById('cep');
    const cepErrorFeedbackEl = document.getElementById('cepErrorFeedback');

    const addressField = document.getElementById('address');
    const numberField = document.getElementById('number');
    const complementField = document.getElementById('complement');
    const neighborhoodField = document.getElementById('neighborhood');
    const cityField = document.getElementById('city');
    const stateField = document.getElementById('state');
    const observationsField = document.getElementById('observations');

    const saveButton = document.getElementById('saveButton');
    const clearFormButton = document.getElementById('clearFormButton');
    const deleteButton = document.getElementById('deleteButton');
    const globalFormFeedbackEl = document.getElementById('formFeedbackGlobal');

    const searchInput = document.getElementById('searchInput');
    const searchButton = document.getElementById('searchButton');
    const searchResultsContainer = document.getElementById('searchResults');

    // Rodapé
    const currentDateTimeEl = document.getElementById('currentDateTime');
    const currentYearEl = document.getElementById('currentYear');
    const dbStatusIconEl = document.getElementById('dbStatusIcon');
    const dbStatusTextEl = document.getElementById('dbStatusText');

    // --- Funções Utilitárias de UI (Toasts e Modals) ---
    function showToast(message, type = 'success') {
        const toastContainer = document.querySelector('.toast-container');
        if (!toastContainer) {
            console.warn('Toast container não encontrado! Usando fallback.');
            if (globalFormFeedbackEl) displayGlobalFeedback(message, type === 'success' ? 'alert-success' : 'alert-danger');
            else alert(message); // Último recurso
            return;
        }
        const toastId = 'toast-client-' + Date.now();
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
            if (confirm(message)) { // Fallback
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

    // --- Navegação do Header ---
    document.getElementById('goHomeNav')?.addEventListener('click', () => {
        if (window.electronAPI && window.electronAPI.navigateTo) {
            window.electronAPI.navigateTo('index.html');
        } else { console.warn("API de navegação não disponível.");}
    });
    document.getElementById('goToOsPage')?.addEventListener('click', () => {
        if (window.electronAPI && window.electronAPI.navigateTo) {
            window.electronAPI.navigateTo('os.html');
        } else { console.warn("API de navegação não disponível.");}
    });

    // --- Funções de Formatação (formatarCPF de cpf_validator.js) ---
    function formatarTelefone(tel) { 
        if (!tel) return '';
        const telLimpo = tel.toString().replace(/\D/g, '');
        if (telLimpo.length === 11) return `(${telLimpo.substring(0,2)}) ${telLimpo.substring(2,7)}-${telLimpo.substring(7,11)}`;
        if (telLimpo.length === 10) return `(${telLimpo.substring(0,2)}) ${telLimpo.substring(2,6)}-${telLimpo.substring(6,10)}`;
        return telLimpo; 
    }
    function formatarCEP(cep) { 
        if (!cep) return '';
        let cepLimpo = cep.toString().replace(/\D/g, '');
        if (cepLimpo.length > 8) cepLimpo = cepLimpo.substring(0,8);
        if (cepLimpo.length <= 5) return cepLimpo;
        return cepLimpo.replace(/(\d{5})(\d+)/, '$1-$2');
    }

    // --- Funções de Validação (validarCPF de cpf_validator.js, validarEmail de email_validator.js) ---
    function validarTelefone(phoneLimpo) { 
        if (!phoneLimpo && phoneField && phoneField.required) return false;
        if (!phoneLimpo && phoneField && !phoneField.required) return true; // Válido se não obrigatório e vazio
        return phoneLimpo.length >= 10 && phoneLimpo.length <= 11;
    }
    
    // --- Máscaras e Validações nos Eventos ---
    function applyInputMaskAndClearValidation(field, formatter) {
        if (field) {
            field.addEventListener('input', (e) => {
                const originalSelectionStart = e.target.selectionStart;
                const originalSelectionEnd = e.target.selectionEnd;
                const originalLength = e.target.value.length;
                e.target.value = formatter(e.target.value);
                const newLength = e.target.value.length;
                try { // Adicionado try-catch para setSelectionRange
                    if (newLength > originalLength) {
                        e.target.setSelectionRange(originalSelectionStart + (newLength - originalLength), originalSelectionEnd + (newLength - originalLength));
                    } else {
                         e.target.setSelectionRange(originalSelectionStart, originalSelectionEnd);
                    }
                } catch (ex) { /* Ignora erro de setSelectionRange se o campo não estiver focado */ }

                field.classList.remove('is-invalid', 'is-valid');
                const feedbackDiv = field.nextElementSibling;
                if (feedbackDiv && feedbackDiv.classList.contains('invalid-feedback')) {
                    feedbackDiv.style.display = 'none';
                }
            });
        }
    }
    applyInputMaskAndClearValidation(cpfField, formatarCPF);
    applyInputMaskAndClearValidation(phoneField, formatarTelefone);
    applyInputMaskAndClearValidation(cepField, formatarCEP);

    function setupFieldValidationOnBlur(field, validatorFn, requiredMsg, invalidMsg, isAsync = false, cleanFn = (val) => val.trim()) {
        if (!field) return;
        field.addEventListener('blur', async () => {
            field.classList.remove('is-invalid', 'is-valid');
            const feedbackDiv = field.nextElementSibling;
            if(feedbackDiv) feedbackDiv.style.display = 'none'; // Esconde feedback antes de revalidar

            const valueWithMask = field.value;
            const valueToValidate = cleanFn(valueWithMask);

            if (field.required && !valueToValidate) {
                field.classList.add('is-invalid');
                if (feedbackDiv) { feedbackDiv.textContent = requiredMsg || 'Este campo é obrigatório.'; feedbackDiv.style.display = 'block';}
                return;
            }
            
            let isValid = true; // Assume válido se não obrigatório e vazio
            if (valueToValidate) { // Só executa o validador se houver valor (após limpeza)
                isValid = isAsync ? await validatorFn(valueToValidate) : validatorFn(valueToValidate); // Passa valor limpo ou com máscara dependendo do validador
            }

            if (valueToValidate && !isValid) { // Se tem valor E não é válido
                field.classList.add('is-invalid');
                if (feedbackDiv) { feedbackDiv.textContent = invalidMsg || 'Valor inválido.'; feedbackDiv.style.display = 'block';}
            } else if (valueToValidate && isValid) { // Se tem valor E é válido
                field.classList.add('is-valid');
            }
            // Se não tem valor e não é obrigatório, permanece sem classes de validação e feedback escondido
        });
    }

    setupFieldValidationOnBlur(nameField, (val) => val.length >= 3, 'Nome é obrigatório.', 'Nome deve ter pelo menos 3 caracteres.');
    setupFieldValidationOnBlur(emailField, validarEmail, '', 'Formato de e-mail inválido.');
    setupFieldValidationOnBlur(phoneField, validarTelefone, 'Celular é obrigatório.', 'Telefone inválido.', false, val => val.replace(/\D/g,''));
    
    async function validateCpfFieldOnBlur(isSubmitting = false) {
        if (!cpfField || !cpfErrorFeedbackEl) return true; 
        const cpfValueClean = cpfField.value.replace(/\D/g, '');
        
        cpfField.classList.remove('is-invalid', 'is-valid');
        cpfErrorFeedbackEl.style.display = 'none';

        if (cpfField.required && !cpfValueClean) {
            if (isSubmitting) {
                cpfField.classList.add('is-invalid');
                cpfErrorFeedbackEl.textContent = 'CPF é obrigatório.'; 
                cpfErrorFeedbackEl.style.display = 'block';
            }
            return false;
        }
        if (cpfValueClean && !validarCPF(cpfValueClean)) {
            cpfField.classList.add('is-invalid');
            cpfErrorFeedbackEl.textContent = 'CPF inválido.'; 
            cpfErrorFeedbackEl.style.display = 'block';
            if(isSubmitting) cpfField.focus();
            return false;
        }
        if (cpfValueClean) {
            const currentId = clientIdField?.value;
            try {
                if (!window.electronAPI || typeof window.electronAPI.findClientByCpf !== 'function') {
                    showToast("API de verificação de CPF não disponível.", "danger"); return false;
                }
                const clientByCpf = await window.electronAPI.findClientByCpf(cpfValueClean); 
                if (clientByCpf && (!currentId || clientByCpf._id.toString() !== currentId)) {
                    cpfField.classList.add('is-invalid');
                    cpfErrorFeedbackEl.textContent = 'CPF já cadastrado.'; 
                    cpfErrorFeedbackEl.style.display = 'block';
                    if(isSubmitting) cpfField.focus();
                    return false;
                }
            } catch (error) {
                console.error("Erro ao verificar CPF duplicado:", error);
                showToast("Erro ao verificar CPF. Tente novamente.", "danger");
                return false; 
            }
            cpfField.classList.add('is-valid');
        }
        return true;
    }
    cpfField?.addEventListener('blur', () => validateCpfFieldOnBlur(false));

    // --- Lógica do CEP (Automática) ---
    let cepBuscadoRecentemente = '';
    let cepInputTimeout;

    async function buscarEPreencherEndereco(cepValueWithMask) {
        if (!cepField || !cepErrorFeedbackEl) return null;
        const cepLimpo = cepValueWithMask.replace(/\D/g, '');

        if (cepBuscadoRecentemente === cepLimpo && cepField.classList.contains('is-valid') && cepLimpo.length === 8) return;

        cepField.classList.remove('is-invalid', 'is-valid');
        cepErrorFeedbackEl.style.display = 'none';
        
        if (cepLimpo.length === 0 && !cepField.required) {
            clearPartialAddressFields(); return null;
        }
        if (cepLimpo.length !== 8) {
            if (cepLimpo.length > 0) {
                 cepField.classList.add('is-invalid');
                 cepErrorFeedbackEl.textContent = 'CEP deve conter 8 dígitos.'; 
                 cepErrorFeedbackEl.style.display = 'block';
            }
            clearPartialAddressFields(); return null; 
        }
        
        try {
            if (!window.electronAPI || typeof window.electronAPI.fetchCep !== 'function') {
                showToast("API de busca de CEP não disponível.", "danger"); return null;
            }
            const data = await window.electronAPI.fetchCep(cepLimpo);
            if (data.erro) {
                cepField.classList.add('is-invalid');
                cepErrorFeedbackEl.textContent = 'CEP não encontrado.'; 
                cepErrorFeedbackEl.style.display = 'block';
                clearPartialAddressFields();
                cepBuscadoRecentemente = '';
            } else {
                cepField.classList.add('is-valid');
                if (addressField) addressField.value = data.logradouro || '';
                if (neighborhoodField) neighborhoodField.value = data.bairro || '';
                if (cityField) cityField.value = data.localidade || '';
                if (stateField) stateField.value = data.uf || '';
                [addressField, neighborhoodField, cityField, stateField].forEach(f => f?.classList.remove('is-invalid', 'is-valid'));
                if (document.activeElement === cepField || document.activeElement === document.body) {
                    numberField?.focus();
                }
                cepBuscadoRecentemente = cepLimpo;
                return data;
            }
        } catch (error) {
            console.error('Erro ao buscar CEP:', error);
            cepField.classList.add('is-invalid');
            cepErrorFeedbackEl.textContent = 'Erro ao buscar CEP. Verifique sua conexão.'; 
            cepErrorFeedbackEl.style.display = 'block';
            clearPartialAddressFields();
            showToast('Falha na comunicação ao buscar CEP.', 'danger');
            cepBuscadoRecentemente = '';
        }
        return null;
    }
    
    function clearPartialAddressFields() {
        if(addressField) addressField.value = '';
        if(neighborhoodField) neighborhoodField.value = '';
        if(cityField) cityField.value = '';
        if(stateField) stateField.value = '';
        [addressField, neighborhoodField, cityField, stateField].forEach(f => f?.classList.remove('is-invalid', 'is-valid'));
    }

    if (cepField) {
        cepField.addEventListener('input', (e) => {
            e.target.value = formatarCEP(e.target.value);
            cepField.classList.remove('is-invalid', 'is-valid');
            if (cepErrorFeedbackEl) cepErrorFeedbackEl.style.display = 'none';
            cepBuscadoRecentemente = ''; 
            const cepLimpo = e.target.value.replace(/\D/g, '');
            clearTimeout(cepInputTimeout);
            if (cepLimpo.length === 8) {
                cepInputTimeout = setTimeout(() => { buscarEPreencherEndereco(e.target.value); }, 300);
            }
        });
        cepField.addEventListener('blur', () => { buscarEPreencherEndereco(cepField.value); });
    }
    
    // --- Ações do Formulário ---
    if (clientForm) {
        clientForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            event.stopPropagation();
            
            clientForm.querySelectorAll('.form-control, .form-select').forEach(field => {
                field.classList.remove('is-invalid', 'is-valid');
            });
            clientForm.classList.remove('was-validated');

            let formIsValid = true;
            // Validações síncronas primeiro
            if (!setupFieldValidationOnBlurSync(nameField, (val) => val.trim().length >= 3, 'Nome é obrigatório.', 'Nome deve ter pelo menos 3 caracteres.')) formIsValid = false;
            if (!setupFieldValidationOnBlurSync(phoneField, validarTelefone, 'Celular é obrigatório.', 'Telefone inválido.', val => val.replace(/\D/g,''))) formIsValid = false;
            if (emailField.value.trim() && !setupFieldValidationOnBlurSync(emailField, validarEmail, '', 'Formato de e-mail inválido.')) formIsValid = false;
            
            // Validação assíncrona do CPF por último
            if (!(await validateCpfFieldOnBlur(true))) { // Passa true para isSubmitting
                formIsValid = false;
            }
            
            clientForm.classList.add('was-validated'); // Adiciona para mostrar feedback do Bootstrap

            if (!formIsValid) {
                showToast('Por favor, corrija os erros no formulário.', 'warning');
                const firstInvalidField = clientForm.querySelector('.is-invalid');
                if (firstInvalidField && typeof firstInvalidField.focus === 'function') firstInvalidField.focus();
                return;
            }

            const clientData = {
                name: nameField.value.trim(),
                cpf: cpfField.value.replace(/\D/g, ''),
                phone: phoneField.value.replace(/\D/g, ''),
                email: emailField.value.trim().toLowerCase(),
                cep: cepField.value.replace(/\D/g, ''),
                address: addressField.value.trim(),
                number: numberField.value.trim(),
                complement: complementField.value.trim(),
                neighborhood: neighborhoodField.value.trim(),
                city: cityField.value.trim(),
                state: stateField.value.trim().toUpperCase(),
                notes: observationsField.value.trim()
            };

            const currentId = clientIdField.value;
            let result;

            if (saveButton) {
                saveButton.disabled = true;
                saveButton.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Salvando...`;
            }

            try {
                if (!window.electronAPI || 
                    (currentId && typeof window.electronAPI.updateClient !== 'function') ||
                    (!currentId && typeof window.electronAPI.addClient !== 'function') ) {
                    showToast('API de salvamento de cliente não disponível.', 'danger'); 
                    if(saveButton) { saveButton.disabled = false; saveButton.innerHTML = clientIdField.value ? `<i data-feather="arrow-clockwise" class="icon-btn"></i> Atualizar Cliente` : `<i data-feather="check-circle" class="icon-btn"></i> Salvar Cliente`; feather.replace(); }
                    return;
                }

                if (currentId) {
                    result = await window.electronAPI.updateClient(currentId, clientData);
                } else {
                    result = await window.electronAPI.addClient(clientData);
                }

                if (result && result.success) {
                    showToast(result.message, 'success');
                    clearForm();
                    if(searchInput) searchInput.value = ''; 
                    if(searchResultsContainer) searchResultsContainer.innerHTML = ''; 
                } else {
                    showToast(result?.message || 'Erro desconhecido ao salvar cliente.', 'danger');
                    if (result && result.duplicateCpf && cpfErrorFeedbackEl) {
                        cpfField.classList.add('is-invalid');
                        cpfErrorFeedbackEl.textContent = result.message; 
                        cpfErrorFeedbackEl.style.display = 'block';
                        cpfField.focus();
                    }
                }
            } catch (error) {
                console.error('Erro ao salvar cliente:', error);
                showToast(`Erro crítico ao salvar cliente: ${error.message || error}`, 'danger');
            } finally {
                if (saveButton) {
                    saveButton.disabled = false;
                    saveButton.innerHTML = clientIdField.value ? `<i data-feather="arrow-clockwise" class="icon-btn"></i> Atualizar Cliente` : `<i data-feather="check-circle" class="icon-btn"></i> Salvar Cliente`;
                    if (typeof feather !== 'undefined' && feather.replace) feather.replace(); // Re-renderiza ícones no botão
                }
            }
        });
    }
    
    function setupFieldValidationOnBlurSync(field, validatorFn, requiredMsg, invalidMsg, cleanFn = (val) => val.trim()) {
        if (!field) return true;
        // Esta função é para ser chamada diretamente no submit, não adiciona listener de blur.
        // A validação de blur é feita por setupFieldValidationOnBlur
        field.classList.remove('is-invalid', 'is-valid');
        const feedbackDiv = field.nextElementSibling;
        if(feedbackDiv && feedbackDiv.classList.contains('invalid-feedback')) feedbackDiv.style.display = 'none';

        const valueWithMask = field.value;
        const valueToValidate = cleanFn(valueWithMask);

        if (field.required && !valueToValidate) {
            field.classList.add('is-invalid');
            if (feedbackDiv) { feedbackDiv.textContent = requiredMsg || 'Este campo é obrigatório.'; feedbackDiv.style.display = 'block'; }
            return false;
        }
        if (valueToValidate && !validatorFn(valueToValidate)) { // Passa valor limpo/com máscara conforme necessidade do validador
            field.classList.add('is-invalid');
            if (feedbackDiv) { feedbackDiv.textContent = invalidMsg || 'Valor inválido.'; feedbackDiv.style.display = 'block'; }
            return false;
        }
        if (valueToValidate) field.classList.add('is-valid');
        return true;
    }

    if(clearFormButton) clearFormButton.addEventListener('click', () => clearForm(true));
    if(deleteButton) deleteButton.addEventListener('click', handleDeleteClient);

    function clearForm(focusName = false) {
        clientForm?.reset();
        clientForm?.classList.remove('was-validated');
        if(clientIdField) clientIdField.value = '';
        if(saveButton) {
            saveButton.innerHTML = `<i data-feather="check-circle" class="icon-btn"></i> Salvar Cliente`;
            if (typeof feather !== 'undefined' && feather.replace) feather.replace();
        }
        if(deleteButton) deleteButton.classList.add('d-none');
        
        clientForm?.querySelectorAll('.form-control, .form-select').forEach(field => {
            field.classList.remove('is-invalid', 'is-valid');
            const feedbackDiv = field.nextElementSibling;
            if (feedbackDiv && feedbackDiv.classList.contains('invalid-feedback')) {
                feedbackDiv.style.display = 'none';
            }
        });
        if (globalFormFeedbackEl) displayGlobalFeedback('', 'd-none'); 
        
        // Não foca automaticamente o campo nome ao editar um cliente
        if(searchResultsContainer) searchResultsContainer.innerHTML = '';
        if(searchInput) searchInput.value = '';
        cepBuscadoRecentemente = ''; 
        if(nameField && focusName) nameField.focus();
    }

    function displayGlobalFeedback(message, type) {
        if (globalFormFeedbackEl) {
            globalFormFeedbackEl.textContent = message;
            globalFormFeedbackEl.className = `alert ${type} mt-3`;
            if (type === 'd-none') {
                globalFormFeedbackEl.classList.add('d-none');
            }
        }
    }

    async function handleDeleteClient() {
        const currentId = clientIdField?.value;
        if (!currentId) return;
        showConfirmationModal('Tem certeza que deseja excluir este cliente? OS associadas NÃO serão excluídas, mas perderão o vínculo se não reatribuídas.', async () => {
            try {
                if (!window.electronAPI || typeof window.electronAPI.deleteClient !== 'function') {
                    showToast('API de exclusão não disponível.', 'danger'); return;
                }
                const result = await window.electronAPI.deleteClient(currentId);
                if (result && result.success) {
                    showToast(result.message, 'success');
                    clearForm();
                } else {
                    showToast(result?.message || 'Erro ao excluir cliente.', 'danger');
                }
            } catch (error) {
                console.error('Erro ao excluir cliente:', error);
                showToast(`Erro crítico ao excluir cliente: ${error.message || error}`, 'danger');
            }
        });
    }

    // --- Busca de Clientes ---
    if (searchButton) searchButton.addEventListener('click', performSearch);
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') performSearch(); });
        let searchTimeout;
        searchInput.addEventListener('input', () => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                if (searchInput.value.trim().length > 0 || searchInput.value.trim().length === 0) {
                     performSearch();
                }
            }, 300);
        });
    }

    async function performSearch() {
        if (!searchInput || !searchResultsContainer) return;
        const searchTerm = searchInput.value.trim();
        if (!searchTerm) {
            searchResultsContainer.innerHTML = ''; 
            searchResultsContainer.style.display = 'none';
            return;
        }
        searchResultsContainer.innerHTML = '<div class="list-group-item text-muted">Buscando... <span class="spinner-border spinner-border-sm ms-1" role="status" aria-hidden="true"></span></div>';
        searchResultsContainer.style.display = 'block';

        try {
            if (!window.electronAPI || typeof window.electronAPI.searchClients !== 'function') {
                 showToast('API de busca de clientes não disponível.', 'danger'); return;
            }
            const clients = await window.electronAPI.searchClients(searchTerm);
            renderSearchResults(clients);
        } catch (error) {
            console.error("Erro ao buscar clientes:", error);
            searchResultsContainer.innerHTML = '<div class="list-group-item text-danger">Erro ao buscar clientes.</div>';
            showToast('Erro ao realizar busca de clientes.', 'danger');
        }
    }

    function renderSearchResults(clients) {
        if (!searchResultsContainer) return;
        searchResultsContainer.innerHTML = ''; 
        if (!clients || clients.length === 0) {
            searchResultsContainer.innerHTML = '<div class="list-group-item text-muted">Nenhum cliente encontrado.</div>';
            searchResultsContainer.style.display = 'block';
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
                const clientIdToLoad = e.currentTarget.dataset.clientId;
                console.log("Cliente selecionado na lista, ID para carregar:", clientIdToLoad, "Tipo:", typeof clientIdToLoad);
                if (clientIdToLoad && typeof clientIdToLoad === 'string' && clientIdToLoad.length > 0) {
                    loadClientForEditing(clientIdToLoad);
                } else {
                    console.error("ID do cliente inválido ou não encontrado no item da lista:", clientIdToLoad);
                    showToast("Erro ao selecionar cliente: ID inválido.", "danger");
                }
                searchResultsContainer.innerHTML = ''; 
                searchResultsContainer.style.display = 'none';
                if(searchInput) searchInput.value = '';
            });
            searchResultsContainer.appendChild(item);
        });
        searchResultsContainer.style.display = 'block';
    }
    
    document.addEventListener('click', function(event) {
        if (searchResultsContainer && !searchResultsContainer.contains(event.target) && searchInput && !searchInput.contains(event.target)) {
            searchResultsContainer.style.display = 'none';
        }
    });

    async function loadClientForEditing(clientId) {
        console.log("[Renderer Cliente] Tentando carregar cliente com ID:", clientId);
        if (!clientId || typeof clientId !== 'string' || clientId.length < 12) {
            showToast("ID do cliente inválido para carregar.", "warning");
            console.error("Tentativa de carregar cliente com ID inválido:", clientId);
            return;
        }
        try {
            if (!window.electronAPI || typeof window.electronAPI.getClientById !== 'function') {
                 showToast('API de busca de cliente por ID não disponível.', 'danger'); return;
            }
            const result = await window.electronAPI.getClientById(clientId);
            console.log("[Renderer Cliente] Resultado de getClientById:", JSON.stringify(result, null, 2));

            if (result && result.success && result.data) {
                const client = result.data;
                clearForm(); // Limpa o formulário e reseta botões antes de preencher

                if(clientIdField) clientIdField.value = client._id ? client._id.toString() : '';
                if(nameField) nameField.value = client.name || '';
                if(cpfField) cpfField.value = client.cpf ? formatarCPF(client.cpf) : '';
                if(phoneField) phoneField.value = client.phone ? formatarTelefone(client.phone) : '';
                if(emailField) emailField.value = client.email || '';
                
                if(cepField) cepField.value = client.cep ? formatarCEP(client.cep) : '';
                if(addressField) addressField.value = client.address || '';
                if(numberField) numberField.value = client.number || '';
                if(complementField) complementField.value = client.complement || '';
                if(neighborhoodField) neighborhoodField.value = client.neighborhood || '';
                if(cityField) cityField.value = client.city || '';
                if(stateField) stateField.value = client.state || '';
                if(observationsField) observationsField.value = client.notes || '';

                if(saveButton) {
                     saveButton.innerHTML = `<i data-feather="arrow-clockwise" class="icon-btn"></i> Atualizar Cliente`;
                     if (typeof feather !== 'undefined' && feather.replace) feather.replace(); // Re-renderiza ícone no botão
                }
                if(deleteButton) deleteButton.classList.remove('d-none');
                
                clientForm?.querySelectorAll('.form-control, .form-select').forEach(field => {
                    field.classList.remove('is-invalid', 'is-valid');
                });
                // Força validação no blur para mostrar 'is-valid' nos campos preenchidos
                [nameField, cpfField, phoneField, emailField, cepField].forEach(f => {
                    if (f && f.value && f.value.trim().length > 0) {
                        f.dispatchEvent(new Event('blur', { bubbles: true }));
                    } else {
                        f?.classList.remove('is-invalid', 'is-valid');
                        const feedbackDiv = f?.nextElementSibling;
                        if (feedbackDiv && feedbackDiv.classList.contains('invalid-feedback')) {
                            feedbackDiv.style.display = 'none';
                        }
                    }
                });


                showToast('Cliente carregado para edição.', 'info');
                // Não foca automaticamente o campo nome ao editar um cliente
                if (typeof window.scrollTo === 'function') window.scrollTo({ top: 0, behavior: 'smooth' });
            } else {
                showToast(result?.message || 'Cliente não encontrado ou falha ao carregar.', 'warning');
                console.error("Falha ao carregar cliente:", result?.message);
            }
        } catch (error) {
            console.error("Erro catastrófico ao carregar cliente para edição:", error);
            showToast(`Erro ao carregar cliente: ${error.message || error}`, 'danger');
        }
    }
    
    // --- Funções de Validação (declaradas ou de arquivos externos) ---
    // Assume-se que validarCPF (de cpf_validator.js) e validarEmail (de email_validator.js)
    // estão disponíveis globalmente porque os scripts foram incluídos no HTML.

    // --- Inicialização ---
    if (clientForm) {
        clearForm(false); // Não foca o campo nome ao carregar a tela
    } else {
        console.warn("Formulário de cliente (clientForm) não encontrado no DOM.");
    }

    // Inicialização final dos Feather Icons para toda a página
    if (typeof feather !== 'undefined' && feather && typeof feather.replace === 'function') {
        try {
            feather.replace();
        } catch(e) {
            console.error("Erro ao renderizar Feather Icons na carga inicial da página (cliente):", e);
        }
    } else {
        console.warn("Biblioteca Feather Icons (feather) não carregada (cliente).");
    }

    const btnClientes = document.getElementById('btnRelatorioClientes');
    if (btnClientes) {
        btnClientes.addEventListener('click', async () => {
            if (window.electronAPI && window.electronAPI.generateClientReport) {
                const result = await window.electronAPI.generateClientReport();
                if (result && result.success) {
                    showToast('Relatório de clientes gerado com sucesso!', 'success');
                } else {
                    showToast('Erro ao gerar relatório: ' + (result?.error || 'Erro desconhecido'), 'danger');
                }
            }
        });
    }

    const btnFinalizadas = document.getElementById('btnRelatorioOsFinalizadas');
    if (btnFinalizadas) {
        btnFinalizadas.addEventListener('click', async () => {
            if (window.electronAPI && window.electronAPI.generateOsFinalizadasReport) {
                const result = await window.electronAPI.generateOsFinalizadasReport();
                if (result && result.success) {
                    showToast('Relatório de OS Finalizadas gerado com sucesso!', 'success');
                } else {
                    showToast('Erro ao gerar relatório: ' + (result?.error || 'Erro desconhecido'), 'danger');
                }
            }
        });
    }

    const btnAbertas = document.getElementById('btnRelatorioOsAbertas');
    if (btnAbertas) {
        btnAbertas.addEventListener('click', async () => {
            if (window.electronAPI && window.electronAPI.generateOsAbertasReport) {
                const result = await window.electronAPI.generateOsAbertasReport();
                if (result && result.success) {
                    showToast('Relatório de OS Abertas gerado com sucesso!', 'success');
                } else {
                    showToast('Erro ao gerar relatório: ' + (result?.error || 'Erro desconhecido'), 'danger');
                }
            }
        });
    }
});
