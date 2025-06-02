// assets/js/cep.js

/**
 * Busca o endereço correspondente ao CEP e preenche os campos do formulário.
 * Também fornece feedback visual (validação, erros, loading).
 * @param {string} cepValue - O valor do CEP a ser buscado.
 * @returns {Promise<object|null>} Os dados do endereço se encontrado, ou null em caso de erro/não encontrado.
 */
async function buscarEnderecoPorCEP(cepValue) {
    const cepField = document.getElementById('cep');
    const cepErrorFeedbackEl = document.getElementById('cepErrorFeedback'); // Div de feedback do CEP
    const cepSearchButton = document.getElementById('cepSearchButton'); // Botão de busca (opcional aqui, mas para o spinner)

    const addressField = document.getElementById('address');
    const neighborhoodField = document.getElementById('neighborhood');
    const cityField = document.getElementById('city');
    const stateField = document.getElementById('state');
    const numberField = document.getElementById('number');

    // Limpar validação anterior e mensagem de erro
    if (cepField) cepField.classList.remove('is-invalid', 'is-valid');
    if (cepErrorFeedbackEl) {
        cepErrorFeedbackEl.textContent = 'CEP inválido.'; // Mensagem padrão
        cepErrorFeedbackEl.style.display = 'none';
    }
    // Limpar campos de endereço parcialmente antes de nova busca, exceto o próprio CEP.
    clearAddressFieldsInternal(false, [addressField, neighborhoodField, cityField, stateField, numberField]);


    const cepLimpo = cepValue.replace(/\D/g, '');
    if (cepLimpo.length !== 8) {
        if (cepField) cepField.classList.add('is-invalid');
        if (cepErrorFeedbackEl) cepErrorFeedbackEl.style.display = 'block';
        return null;
    }

    // Feedback de carregamento
    if (cepSearchButton) {
        cepSearchButton.originalHTML = cepSearchButton.innerHTML; // Salva o conteúdo original
        cepSearchButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>';
        cepSearchButton.disabled = true;
    }

    try {
        const data = await window.electronAPI.fetchCep(cepLimpo);

        if (data.erro) {
            if (cepField) cepField.classList.add('is-invalid');
            if (cepErrorFeedbackEl) {
                cepErrorFeedbackEl.textContent = 'CEP não encontrado.';
                cepErrorFeedbackEl.style.display = 'block';
            }
            if (cepField) cepField.focus();
            return null;
        }

        // Sucesso
        if (cepField) cepField.classList.add('is-valid');
        if (addressField) addressField.value = data.logradouro || '';
        if (neighborhoodField) neighborhoodField.value = data.bairro || '';
        if (cityField) cityField.value = data.localidade || '';
        if (stateField) stateField.value = data.uf || '';
        
        // Remove validação de campos preenchidos automaticamente
        [addressField, neighborhoodField, cityField, stateField].forEach(field => {
            if (field) field.classList.remove('is-invalid', 'is-valid');
        });

        if (numberField) numberField.focus();
        return data;

    } catch (error) {
        console.error('Erro ao buscar CEP:', error);
        if (cepField) cepField.classList.add('is-invalid');
        if (cepErrorFeedbackEl) {
            cepErrorFeedbackEl.textContent = 'Erro ao buscar CEP. Verifique sua conexão.';
            cepErrorFeedbackEl.style.display = 'block';
        }
        // Poderia chamar showToast aqui se ui_helpers.js estivesse disponível globalmente
        // showToast('Falha na comunicação ao buscar CEP.', 'danger'); 
        return null;
    } finally {
        // Restaura o botão de busca do CEP
        if (cepSearchButton && typeof cepSearchButton.originalHTML !== 'undefined') {
            cepSearchButton.innerHTML = cepSearchButton.originalHTML;
            cepSearchButton.disabled = false;
        }
    }
}

/**
 * Limpa os campos de endereço e suas classes de validação.
 * @param {boolean} clearCepInput - Se true, limpa também o campo CEP.
 */
function clearAddressFields(clearCepInput = false) {
    const cepField = document.getElementById('cep');
    const addressField = document.getElementById('address');
    const numberField = document.getElementById('number');
    const complementField = document.getElementById('complement');
    const neighborhoodField = document.getElementById('neighborhood');
    const cityField = document.getElementById('city');
    const stateField = document.getElementById('state');
    
    const fieldsToClear = [addressField, numberField, complementField, neighborhoodField, cityField, stateField];
    if (clearCepInput && cepField) {
        fieldsToClear.push(cepField);
    }
    
    clearAddressFieldsInternal(clearCepInput, fieldsToClear);
}


/**
 * Função interna auxiliar para limpar campos e suas validações.
 * @param {boolean} clearCepValueAlso - Se o valor do campo CEP também deve ser limpo.
 * @param {Array<HTMLElement>} fields - Array de elementos de campo para limpar.
 */
function clearAddressFieldsInternal(clearCepValueAlso = true, fields = []) {
    const cepField = document.getElementById('cep'); // Necessário para o caso de limpar o valor do CEP

    if (clearCepValueAlso && cepField) {
        cepField.value = '';
    }

    fields.forEach(field => {
        if (field) {
            // Não limpar o campo 'number' e 'complement' automaticamente ao buscar CEP,
            // a menos que seja uma limpeza geral do formulário.
            // Esta função é chamada em múltiplos contextos.
            // Se estamos limpando após uma busca de CEP falha, queremos limpar logradouro, bairro, cidade, UF.
            // Se é uma limpeza geral (chamada por clearFormButton), todos devem ser limpos.
            // A lógica aqui assume que os campos passados em 'fields' SÃO para serem limpos.
            field.value = '';
            field.classList.remove('is-invalid', 'is-valid');
        }
    });

    // Limpar especificamente a validação do campo CEP, se ele não estiver entre os 'fields' para limpar o valor
    if (cepField && !fields.includes(cepField)) {
         cepField.classList.remove('is-invalid', 'is-valid');
    }
    const cepErrorFeedbackEl = document.getElementById('cepErrorFeedback');
    if (cepErrorFeedbackEl) cepErrorFeedbackEl.style.display = 'none';
}


// Para que as funções estejam disponíveis globalmente se este arquivo for incluído via <script>
// (Não é necessário se estiver usando módulos ES6 e importando, mas para <script> simples é útil)
// window.buscarEnderecoPorCEP = buscarEnderecoPorCEP;
// window.clearAddressFields = clearAddressFields;