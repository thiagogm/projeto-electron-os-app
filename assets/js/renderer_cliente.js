// assets/js/renderer_cliente.js
document.addEventListener('DOMContentLoaded', () => {
    const clientForm = document.getElementById('clientForm');
    const clientIdField = document.getElementById('clientId');
    const nameField = document.getElementById('name');
    const cpfField = document.getElementById('cpf');
    const cpfErrorField = document.getElementById('cpfError');
    const cepField = document.getElementById('cep');
    const addressField = document.getElementById('address');
    const numberField = document.getElementById('number');
    const complementField = document.getElementById('complement');
    const neighborhoodField = document.getElementById('neighborhood');
    const cityField = document.getElementById('city');
    const stateField = document.getElementById('state');
    const phoneField = document.getElementById('phone');
    const emailField = document.getElementById('email');
    const notesField = document.getElementById('notes');

    const saveButton = document.getElementById('saveButton');
    const clearFormButton = document.getElementById('clearFormButton');
    const deleteButton = document.getElementById('deleteButton');
    const formFeedback = document.getElementById('formFeedback');

    const searchInput = document.getElementById('searchInput');
    const searchButton = document.getElementById('searchButton');
    const searchResultsContainer = document.getElementById('searchResults');

    // Rodapé
    const currentDateEl = document.getElementById('currentDate');
    const dbStatusIconEl = document.getElementById('dbStatusIcon');
    const dbStatusTextEl = document.getElementById('dbStatusText');

    // Atualizar Data no rodapé
    function updateDate() {
        const now = new Date();
        if (currentDateEl) {
            currentDateEl.textContent = now.toLocaleDateString('pt-BR', {
                day: '2-digit', month: '2-digit', year: 'numeric'
            });
        }
    }
    updateDate();
    setInterval(updateDate, 60000);

    // Status Inicial do DB e Atualizações no rodapé
    async function updateDbStatusFooter(status) {
        if (dbStatusIconEl) {
            if (status.connected) {
                dbStatusIconEl.src = '../assets/icons/database-check.png';
                dbStatusTextEl.textContent = 'Conectado';
            } else {
                dbStatusIconEl.src = '../assets/icons/database-slash.png';
                dbStatusTextEl.textContent = 'Desconectado';
            }
        }
    }
    window.electronAPI.onDbStatusUpdate(updateDbStatusFooter);
    window.electronAPI.getInitialDbStatus().then(updateDbStatusFooter);

    // Navegação
    document.getElementById('goHome')?.addEventListener('click', (e) => {
        e.preventDefault();
        window.electronAPI.navigateTo('index.html');
    });
    document.getElementById('goHomeNav')?.addEventListener('click', (e) => {
        e.preventDefault();
        window.electronAPI.navigateTo('index.html');
    });
    document.getElementById('goToOsPage')?.addEventListener('click', (e) => {
        e.preventDefault();
        window.electronAPI.navigateTo('os.html');
    });


    // --- Máscaras e Validações ---
    cpfField.addEventListener('input', (e) => {
        e.target.value = formatarCPF(e.target.value);
        // Remover validação visual ao digitar
        cpfField.classList.remove('is-invalid', 'is-invalid-cpf');
        cpfErrorField.style.display = 'none';
    });

    cpfField.addEventListener('blur', async () => {
        await validateCpfField();
    });

    async function validateCpfField(isSubmitting = false) {
        const cpfValue = cpfField.value.replace(/\D/g, '');
        cpfField.classList.remove('is-invalid', 'is-invalid-cpf');
        cpfErrorField.style.display = 'none';

        if (!cpfValue) {
            if (isSubmitting) { // Só mostrar erro se estiver submetendo e o campo for obrigatório
                 cpfField.classList.add('is-invalid');
                 cpfErrorField.textContent = 'CPF é obrigatório.';
                 cpfErrorField.style.display = 'block';
            }
            return false;
        }

        if (!validarCPF(cpfValue)) {
            cpfField.classList.add('is-invalid', 'is-invalid-cpf');
            cpfErrorField.textContent = 'CPF inválido.';
            cpfErrorField.style.display = 'block';
            if(isSubmitting) cpfField.focus();
            return false;
        }

        // Verificar duplicidade (APENAS se o CPF for válido)
        const currentId = clientIdField.value;
        const clientByCpf = await window.electronAPI.findClientByCpf(cpfValue);

        if (clientByCpf && (!currentId || clientByCpf._id.toString() !== currentId)) {
            cpfField.classList.add('is-invalid', 'is-invalid-cpf');
            cpfErrorField.textContent = 'CPF já cadastrado para outro cliente.';
            cpfErrorField.style.display = 'block';
            if(isSubmitting) {
                // cpfField.value = ''; // Limpar o campo é opcional, mas o usuário pediu
                cpfField.focus();
            }
            return false;
        }
        return true;
    }


    cepField.addEventListener('blur', async () => {
        await buscarEnderecoPorCEP(cepField.value);
    });

    cepField.addEventListener('input', (e) => {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length > 5) {
            value = value.substring(0, 5) + '-' + value.substring(5, 8);
        }
        e.target.value = value;
    });

    // --- Ações do Formulário ---
    clientForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        displayFeedback('', 'd-none'); // Limpa feedback anterior

        // Validação final do CPF antes de submeter
        const isCpfValid = await validateCpfField(true); // Pass true para indicar que é submissão
        if (!nameField.value.trim()){
            displayFeedback('Nome é obrigatório.', 'alert-danger');
            nameField.focus();
            return;
        }
        if (!isCpfValid) {
            cpfField.focus();
            return;
        }


        const clientData = {
            name: nameField.value.trim(),
            cpf: cpfField.value.replace(/\D/g, ''), // Salvar CPF sem máscara
            cep: cepField.value.replace(/\D/g, ''),
            address: addressField.value.trim(),
            number: numberField.value.trim(),
            complement: complementField.value.trim(),
            neighborhood: neighborhoodField.value.trim(),
            city: cityField.value.trim(),
            state: stateField.value.trim(),
            phone: phoneField.value.replace(/\D/g, ''),
            email: emailField.value.trim().toLowerCase(),
            notes: notesField.value.trim()
        };

        const currentId = clientIdField.value;
        let result;

        try {
            if (currentId) {
                result = await window.electronAPI.updateClient(currentId, clientData);
            } else {
                result = await window.electronAPI.addClient(clientData);
            }

            if (result.success) {
                displayFeedback(result.message, 'alert-success');
                clearForm();
                searchInput.value = ''; // Limpar busca
                searchResultsContainer.innerHTML = ''; // Limpar resultados da busca
            } else {
                displayFeedback(result.message || 'Erro desconhecido.', 'alert-danger');
                if (result.duplicateCpf) {
                    cpfField.classList.add('is-invalid', 'is-invalid-cpf');
                    cpfErrorField.textContent = result.message;
                    cpfErrorField.style.display = 'block';
                    // cpfField.value = ''; // Limpar o campo CPF se duplicado
                    cpfField.focus();
                }
            }
        } catch (error) {
            console.error('Erro ao salvar cliente:', error);
            displayFeedback(`Erro: ${error.message}`, 'alert-danger');
        }
    });

    clearFormButton.addEventListener('click', clearForm);
    deleteButton.addEventListener('click', handleDeleteClient);

    function clearForm() {
        clientForm.reset(); // Limpa todos os campos do formulário
        clientIdField.value = ''; // Garante que o ID oculto seja limpo
        saveButton.textContent = 'Salvar Cliente';
        deleteButton.classList.add('d-none');
        cpfField.classList.remove('is-invalid', 'is-invalid-cpf');
        cpfErrorField.style.display = 'none';
        displayFeedback('', 'd-none');
        nameField.focus();
        searchResultsContainer.innerHTML = '';
        searchInput.value = '';
    }

    function displayFeedback(message, type) {
        formFeedback.textContent = message;
        formFeedback.className = `alert ${type}`; // Remove 'd-none' e adiciona a classe de tipo
        if (type === 'd-none') {
            formFeedback.classList.add('d-none'); // Se type for d-none, esconde
        }
    }

    async function handleDeleteClient() {
        const currentId = clientIdField.value;
        if (!currentId) return;

        // Adicionar uma confirmação aqui (ex: confirm() ou um modal do Bootstrap)
        if (confirm('Tem certeza que deseja excluir este cliente? Esta ação não pode ser desfeita.')) {
            try {
                const result = await window.electronAPI.deleteClient(currentId);
                if (result.success) {
                    displayFeedback(result.message, 'alert-success');
                    clearForm();
                } else {
                    displayFeedback(result.message || 'Erro ao excluir.', 'alert-danger');
                }
            } catch (error) {
                console.error('Erro ao excluir cliente:', error);
                displayFeedback(`Erro: ${error.message}`, 'alert-danger');
            }
        }
    }

    // --- Busca de Clientes ---
    searchButton.addEventListener('click', performSearch);
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            performSearch();
        }
    });

    async function performSearch() {
        const searchTerm = searchInput.value.trim();
        if (!searchTerm) {
            searchResultsContainer.innerHTML = '<p class="text-muted p-2">Digite um nome ou CPF para buscar.</p>';
            return;
        }
        searchResultsContainer.innerHTML = '<p class="text-muted p-2">Buscando...</p>';

        try {
            const clients = await window.electronAPI.searchClients(searchTerm);
            renderSearchResults(clients);
        } catch (error) {
            console.error("Erro ao buscar clientes:", error);
            searchResultsContainer.innerHTML = '<p class="text-danger p-2">Erro ao buscar clientes.</p>';
        }
    }

    function renderSearchResults(clients) {
        searchResultsContainer.innerHTML = ''; // Limpa resultados anteriores
        if (!clients || clients.length === 0) {
            searchResultsContainer.innerHTML = '<p class="text-muted p-2">Nenhum cliente encontrado.</p>';
            return;
        }

        clients.forEach(client => {
            const item = document.createElement('a');
            item.href = '#';
            item.classList.add('list-group-item', 'list-group-item-action', 'client-list-item');
            item.textContent = `${client.name} (CPF: ${formatarCPF(client.cpf || '')})`;
            item.dataset.clientId = client._id;
            item.addEventListener('click', (e) => {
                e.preventDefault();
                loadClientForEditing(client._id);
                searchResultsContainer.innerHTML = ''; // Limpa busca após selecionar
                searchInput.value = '';
            });
            searchResultsContainer.appendChild(item);
        });
    }

    async function loadClientForEditing(clientId) {
        try {
            const client = await window.electronAPI.getClientById(clientId);
            if (client) {
                clientIdField.value = client._id;
                nameField.value = client.name || '';
                cpfField.value = client.cpf ? formatarCPF(client.cpf) : '';
                cepField.value = client.cep ? (client.cep.length === 8 ? client.cep.substring(0,5) + '-' + client.cep.substring(5) : client.cep) : '';
                addressField.value = client.address || '';
                numberField.value = client.number || '';
                complementField.value = client.complement || '';
                neighborhoodField.value = client.neighborhood || '';
                cityField.value = client.city || '';
                stateField.value = client.state || '';
                phoneField.value = client.phone ? formatarTelefone(client.phone) : '';
                emailField.value = client.email || '';
                notesField.value = client.notes || '';

                saveButton.textContent = 'Atualizar Cliente';
                deleteButton.classList.remove('d-none');
                cpfField.classList.remove('is-invalid', 'is-invalid-cpf');
                cpfErrorField.style.display = 'none';
                displayFeedback('Cliente carregado para edição.', 'alert-info');
                nameField.focus();
            } else {
                displayFeedback('Cliente não encontrado.', 'alert-warning');
            }
        } catch (error) {
            console.error("Erro ao carregar cliente:", error);
            displayFeedback(`Erro ao carregar cliente: ${error.message}`, 'alert-danger');
        }
    }
    
    function formatarTelefone(tel) {
        tel = tel.replace(/\D/g, '');
        if (tel.length === 11) { // Celular (XX) XXXXX-XXXX
            return `(${tel.substring(0,2)}) ${tel.substring(2,7)}-${tel.substring(7,11)}`;
        } else if (tel.length === 10) { // Fixo (XX) XXXX-XXXX
            return `(${tel.substring(0,2)}) ${tel.substring(2,6)}-${tel.substring(6,10)}`;
        }
        return tel; // Retorna original se não bater nos formatos
    }

    phoneField.addEventListener('input', (e) => {
        e.target.value = formatarTelefone(e.target.value);
    });


    // Foco inicial
    nameField.focus();
});