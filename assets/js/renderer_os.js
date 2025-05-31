// assets/js/renderer_os.js
document.addEventListener('DOMContentLoaded', () => {
    // Elementos do Formulário de OS
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
    const reportedIssueField = document.getElementById('reportedIssue');
    const accessoriesField = document.getElementById('accessories');
    const technicianNotesField = document.getElementById('technicianNotes');
    const servicePerformedField = document.getElementById('servicePerformed');

    const partsContainer = document.getElementById('partsContainer');
    const addPartButton = document.getElementById('addPartButton');
    const laborCostField = document.getElementById('laborCost');
    const otherCostsField = document.getElementById('otherCosts');
    const totalCostField = document.getElementById('totalCost');

    const osFormFeedback = document.getElementById('osFormFeedback');
    const saveOsButton = document.getElementById('saveOsButton');
    const clearOsFormButton = document.getElementById('clearOsFormButton');
    const deleteOsButton = document.getElementById('deleteOsButton');

    // Elementos da Lista de OS
    const osTableBody = document.getElementById('osTableBody');
    const filterStatusSelect = document.getElementById('filterStatus');
    const searchOsInput = document.getElementById('searchOsInput');


    // Rodapé (repetido para consistência, idealmente seria um componente)
    const currentDateEl = document.getElementById('currentDate');
    const dbStatusIconEl = document.getElementById('dbStatusIcon');
    const dbStatusTextEl = document.getElementById('dbStatusText');

    function updateDateFooter() {
        const now = new Date();
        if (currentDateEl) currentDateEl.textContent = now.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }
    updateDateFooter(); setInterval(updateDateFooter, 60000);

    async function updateDbStatusFooter(status) {
        if (dbStatusIconEl) {
            dbStatusIconEl.src = status.connected ? '../assets/icons/database-check.png' : '../assets/icons/database-slash.png';
            dbStatusTextEl.textContent = status.connected ? 'Conectado' : 'Desconectado';
        }
    }
    window.electronAPI.onDbStatusUpdate(updateDbStatusFooter);
    window.electronAPI.getInitialDbStatus().then(updateDbStatusFooter);

    // Navegação
    document.getElementById('goHome')?.addEventListener('click', (e) => { e.preventDefault(); window.electronAPI.navigateTo('index.html'); });
    document.getElementById('goHomeNav')?.addEventListener('click', (e) => { e.preventDefault(); window.electronAPI.navigateTo('index.html'); });
    document.getElementById('goToClientesPage')?.addEventListener('click', (e) => { e.preventDefault(); window.electronAPI.navigateTo('cadastro_cliente.html'); });

    // --- Lógica de Busca de Cliente ---
    let clientSearchTimeout;
    searchClientInput.addEventListener('input', () => {
        clearTimeout(clientSearchTimeout);
        clientSearchTimeout = setTimeout(async () => {
            const searchTerm = searchClientInput.value.trim();
            if (searchTerm.length < 2) {
                clientSearchResultsContainer.innerHTML = '';
                clientSearchResultsContainer.style.display = 'none';
                return;
            }
            try {
                const clients = await window.electronAPI.searchClients(searchTerm);
                renderClientSearchResults(clients);
            } catch (error) {
                console.error("Erro ao buscar clientes:", error);
                clientSearchResultsContainer.innerHTML = '<div class="list-group-item text-danger">Erro ao buscar.</div>';
                clientSearchResultsContainer.style.display = 'block';
            }
        }, 300);
    });

    function renderClientSearchResults(clients) {
        clientSearchResultsContainer.innerHTML = '';
        if (!clients || clients.length === 0) {
            clientSearchResultsContainer.innerHTML = '<div class="list-group-item text-muted">Nenhum cliente encontrado.</div>';
            clientSearchResultsContainer.style.display = 'block';
            return;
        }
        clients.forEach(client => {
            const item = document.createElement('a');
            item.href = '#';
            item.classList.add('list-group-item', 'list-group-item-action');
            item.textContent = `${client.name} (CPF: ${formatarCPF(client.cpf || '')})`; // Requer formatarCPF
            item.addEventListener('click', (e) => {
                e.preventDefault();
                selectClient(client);
                clientSearchResultsContainer.innerHTML = '';
                clientSearchResultsContainer.style.display = 'none';
                searchClientInput.value = '';
            });
            clientSearchResultsContainer.appendChild(item);
        });
        clientSearchResultsContainer.style.display = 'block';
    }
    
    // Esconder resultados da busca de cliente se clicar fora
    document.addEventListener('click', function(event) {
        if (!searchClientInput.contains(event.target) && !clientSearchResultsContainer.contains(event.target)) {
            clientSearchResultsContainer.style.display = 'none';
        }
    });


    function selectClient(client) {
        selectedClientIdField.value = client._id;
        selectedClientInfoDiv.innerHTML = `<strong>${client.name}</strong><br><small>CPF: ${formatarCPF(client.cpf)} | Tel: ${formatarTelefone(client.phone || '')}</small>`; // Requer formatarCPF e formatarTelefone
    }

    function clearSelectedClient() {
        selectedClientIdField.value = '';
        selectedClientInfoDiv.textContent = 'Nenhum cliente selecionado.';
    }

    // --- Lógica de Peças e Custos ---
    addPartButton.addEventListener('click', addPartRow);

    function addPartRow(part = { name: '', quantity: 1, unitPrice: 0.00 }) {
        const partId = `part-${Date.now()}`;
        const row = document.createElement('div');
        row.classList.add('row', 'mb-2', 'align-items-center', 'part-row');
        row.id = partId;
        row.innerHTML = `
            <div class="col-md-5">
                <input type="text" class="form-control form-control-sm part-name" placeholder="Nome da Peça" value="${part.name || ''}">
            </div>
            <div class="col-md-2">
                <input type="number" class="form-control form-control-sm part-quantity cost-input" placeholder="Qtd" value="${part.quantity || 1}" min="1">
            </div>
            <div class="col-md-2">
                <input type="number" step="0.01" class="form-control form-control-sm part-unit-price cost-input" placeholder="Preço Unit." value="${parseFloat(part.unitPrice || 0).toFixed(2)}">
            </div>
            <div class="col-md-2">
                <input type="text" class="form-control form-control-sm part-total-price" placeholder="Total Peça" value="${((part.quantity || 1) * parseFloat(part.unitPrice || 0)).toFixed(2)}" readonly>
            </div>
            <div class="col-md-1">
                <button type="button" class="btn btn-sm btn-outline-danger remove-part-button" data-remove="${partId}">X</button>
            </div>
        `;
        partsContainer.appendChild(row);
        row.querySelectorAll('.cost-input').forEach(input => input.addEventListener('input', calculateTotalCost));
        row.querySelector('.remove-part-button').addEventListener('click', () => {
            row.remove();
            calculateTotalCost();
        });
        calculateTotalCost(); // Recalcula ao adicionar nova linha
    }
    
    partsContainer.addEventListener('input', (event) => {
        if (event.target.classList.contains('part-quantity') || event.target.classList.contains('part-unit-price')) {
            const row = event.target.closest('.part-row');
            const quantity = parseFloat(row.querySelector('.part-quantity').value) || 0;
            const unitPrice = parseFloat(row.querySelector('.part-unit-price').value) || 0;
            row.querySelector('.part-total-price').value = (quantity * unitPrice).toFixed(2);
        }
    });


    [laborCostField, otherCostsField].forEach(field => field.addEventListener('input', calculateTotalCost));

    function calculateTotalCost() {
        let partsTotal = 0;
        document.querySelectorAll('.part-row').forEach(row => {
            const quantity = parseFloat(row.querySelector('.part-quantity').value) || 0;
            const unitPrice = parseFloat(row.querySelector('.part-unit-price').value) || 0;
            const partTotal = quantity * unitPrice;
            row.querySelector('.part-total-price').value = partTotal.toFixed(2); // Atualiza total da peça na linha
            partsTotal += partTotal;
        });
        const labor = parseFloat(laborCostField.value) || 0;
        const others = parseFloat(otherCostsField.value) || 0;
        totalCostField.value = (partsTotal + labor + others).toFixed(2);
    }

    // --- CRUD OS ---
    osForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        displayOsFormFeedback('', 'd-none');

        if (!selectedClientIdField.value) {
            displayOsFormFeedback('Selecione um cliente para a OS.', 'alert-warning');
            searchClientInput.focus();
            return;
        }
        if (!equipmentField.value.trim()) {
             displayOsFormFeedback('O campo Equipamento é obrigatório.', 'alert-warning');
             equipmentField.focus();
             return;
        }
         if (!reportedIssueField.value.trim()) {
             displayOsFormFeedback('O campo Defeito Relatado é obrigatório.', 'alert-warning');
             reportedIssueField.focus();
             return;
        }


        const partsData = [];
        document.querySelectorAll('.part-row').forEach(row => {
            const name = row.querySelector('.part-name').value.trim();
            const quantity = parseInt(row.querySelector('.part-quantity').value) || 0;
            const unitPrice = parseFloat(row.querySelector('.part-unit-price').value) || 0;
            if (name && quantity > 0 && unitPrice >= 0) { // Só adiciona se tiver nome e qtd
                partsData.push({ name, quantity, unitPrice, totalPrice: quantity * unitPrice });
            }
        });

        const osData = {
            osNumber: osNumberField.value,
            clientId: selectedClientIdField.value,
            clientName: selectedClientInfoDiv.querySelector('strong')?.textContent || 'N/A', // Para consulta rápida
            clientCpf: selectedClientInfoDiv.querySelector('small')?.textContent.split('CPF: ')[1]?.split(' |')[0] || 'N/A',
            equipment: equipmentField.value.trim(),
            accessories: accessoriesField.value.trim(),
            reportedIssue: reportedIssueField.value.trim(),
            technicianNotes: technicianNotesField.value.trim(),
            servicePerformed: servicePerformedField.value.trim(),
            status: statusOsField.value,
            parts: partsData,
            laborCost: parseFloat(laborCostField.value) || 0,
            otherCosts: parseFloat(otherCostsField.value) || 0,
            totalCost: parseFloat(totalCostField.value) || 0,
            // entryDate é definido no backend, completionDate também ao finalizar
        };

        const currentOsId = osIdField.value;
        let result;
        try {
            if (currentOsId) {
                result = await window.electronAPI.updateOs(currentOsId, osData);
            } else {
                result = await window.electronAPI.addOS(osData);
            }

            if (result.success) {
                displayOsFormFeedback(result.message, 'alert-success');
                await clearOsForm(); // Limpa e busca novo número de OS
                loadOsList(); // Recarrega a lista
            } else {
                displayOsFormFeedback(result.message || 'Erro desconhecido.', 'alert-danger');
            }
        } catch (error) {
            console.error("Erro ao salvar OS:", error);
            displayOsFormFeedback(`Erro: ${error.message}`, 'alert-danger');
        }
    });

    clearOsFormButton.addEventListener('click', clearOsForm);
    deleteOsButton.addEventListener('click', handleDeleteOs);

    async function initializeNewOsForm() {
        osForm.reset();
        osIdField.value = '';
        clearSelectedClient();
        partsContainer.innerHTML = ''; // Limpa peças
        laborCostField.value = '0.00';
        otherCostsField.value = '0.00';
        totalCostField.value = '0.00';
        statusOsField.value = 'Aberta';
        entryDateField.value = new Date().toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit', year: 'numeric'}) + ' ' + new Date().toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'});
        
        try {
            const nextNumber = await window.electronAPI.getNextOsNumber();
            osNumberField.value = nextNumber;
        } catch (e) {
            osNumberField.value = `OS-ERR${Date.now().toString().slice(-3)}`;
            console.error("Erro ao buscar próximo número de OS", e);
        }

        saveOsButton.textContent = 'Salvar OS';
        deleteOsButton.classList.add('d-none');
        displayOsFormFeedback('', 'd-none');
        searchClientInput.focus();
    }

    async function clearOsForm() {
        await initializeNewOsForm(); // Chama a função que também busca novo número de OS
    }


    function displayOsFormFeedback(message, type) {
        osFormFeedback.textContent = message;
        osFormFeedback.className = `alert ${type}`;
        if (type === 'd-none') osFormFeedback.classList.add('d-none');
    }

    async function handleDeleteOs() {
        const currentOsId = osIdField.value;
        if (!currentOsId) return;

        if (confirm('Tem certeza que deseja excluir esta Ordem de Serviço? Esta ação não pode ser desfeita.')) {
            try {
                const result = await window.electronAPI.deleteOs(currentOsId);
                if (result.success) {
                    displayOsFormFeedback(result.message, 'alert-success');
                    await clearOsForm();
                    loadOsList();
                } else {
                    displayOsFormFeedback(result.message || 'Erro ao excluir.', 'alert-danger');
                }
            } catch (error) {
                console.error("Erro ao excluir OS:", error);
                displayOsFormFeedback(`Erro: ${error.message}`, 'alert-danger');
            }
        }
    }

    // --- Listagem e Edição de OS ---
    async function loadOsList(searchTerm = '', statusFilter = '') {
        try {
            const osList = await window.electronAPI.getOsList(); // Idealmente, o backend faria a filtragem
            osTableBody.innerHTML = ''; // Limpa a tabela

            const filteredList = osList.filter(os => {
                const matchesSearch = searchTerm ? 
                    (os.osNumber?.toLowerCase().includes(searchTerm) ||
                     os.clientName?.toLowerCase().includes(searchTerm) ||
                     os.equipment?.toLowerCase().includes(searchTerm)) 
                    : true;
                const matchesStatus = statusFilter ? os.status === statusFilter : true;
                return matchesSearch && matchesStatus;
            });


            if (filteredList.length === 0) {
                osTableBody.innerHTML = '<tr><td colspan="7" class="text-center">Nenhuma Ordem de Serviço encontrada.</td></tr>';
                return;
            }

            filteredList.forEach(os => {
                const row = osTableBody.insertRow();
                row.innerHTML = `
                    <td>${os.osNumber}</td>
                    <td>${os.clientName || 'N/A'} <small class="d-block">${os.clientCpf || ''}</small></td>
                    <td>${os.equipment}</td>
                    <td>${new Date(os.entryDate).toLocaleDateString('pt-BR')}</td>
                    <td><span class="badge bg-${getStatusBadgeColor(os.status)}">${os.status}</span></td>
                    <td>${parseFloat(os.totalCost || 0).toFixed(2)}</td>
                    <td>
                        <button class="btn btn-sm btn-info edit-os-btn" data-id="${os._id}">Editar</button>
                    </td>
                `;
                row.querySelector('.edit-os-btn').addEventListener('click', () => loadOsForEditing(os._id));
            });
        } catch (error) {
            console.error("Erro ao carregar lista de OS:", error);
            osTableBody.innerHTML = '<tr><td colspan="7" class="text-center text-danger">Erro ao carregar OS.</td></tr>';
        }
    }
    
    filterStatusSelect.addEventListener('change', () => loadOsList(searchOsInput.value.toLowerCase().trim(), filterStatusSelect.value));
    let searchOsTimeout;
    searchOsInput.addEventListener('input', () => {
        clearTimeout(searchOsTimeout);
        searchOsTimeout = setTimeout(() => {
             loadOsList(searchOsInput.value.toLowerCase().trim(), filterStatusSelect.value);
        }, 300);
    });


    async function loadOsForEditing(osIdValue) {
        try {
            const os = await window.electronAPI.getOsById(osIdValue);
            if (os) {
                await clearOsForm(); // Limpa e busca novo número de OS, mas vamos sobrescrever
                osIdField.value = os._id;
                osNumberField.value = os.osNumber;
                entryDateField.value = new Date(os.entryDate).toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit', year: 'numeric'}) + ' ' + new Date(os.entryDate).toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'});
                statusOsField.value = os.status;

                // Carregar cliente associado
                if (os.clientId) {
                     const client = await window.electronAPI.getClientById(os.clientId.toString()); // Garante que seja string
                     if(client) selectClient(client); else clearSelectedClient();
                } else {
                    clearSelectedClient(); // Se não houver clientId, limpa
                }

                equipmentField.value = os.equipment || '';
                accessoriesField.value = os.accessories || '';
                reportedIssueField.value = os.reportedIssue || '';
                technicianNotesField.value = os.technicianNotes || '';
                servicePerformedField.value = os.servicePerformed || '';

                partsContainer.innerHTML = ''; // Limpa peças antes de adicionar as da OS
                (os.parts || []).forEach(part => addPartRow(part));
                
                laborCostField.value = parseFloat(os.laborCost || 0).toFixed(2);
                otherCostsField.value = parseFloat(os.otherCosts || 0).toFixed(2);
                calculateTotalCost(); // Recalcula o total com os dados carregados

                saveOsButton.textContent = 'Atualizar OS';
                deleteOsButton.classList.remove('d-none');
                displayOsFormFeedback('OS carregada para edição.', 'alert-info');
                window.scrollTo(0, 0); // Rola para o topo do formulário
            } else {
                displayOsFormFeedback('OS não encontrada.', 'alert-warning');
            }
        } catch (error) {
            console.error("Erro ao carregar OS para edição:", error);
            displayOsFormFeedback(`Erro ao carregar OS: ${error.message}`, 'alert-danger');
        }
    }

    function getStatusBadgeColor(status) {
        switch (status) {
            case 'Aberta': return 'primary';
            case 'Em Análise': return 'info';
            case 'Aguardando Aprovação': return 'warning';
            case 'Aguardando Peças': return 'secondary';
            case 'Em Reparo': return 'success';
            case 'Finalizada': return 'dark';
            case 'Cancelada': return 'danger';
            case 'Entregue': return 'light text-dark border';
            default: return 'light';
        }
    }
    
    // Funções utilitárias de formatação (devem existir ou ser criadas)
    function formatarCPF(cpf) {
        if (!cpf) return '';
        cpf = cpf.replace(/\D/g, '');
        if (cpf.length !== 11) return cpf; // Retorna o que tem se não for um CPF completo
        return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }

    function formatarTelefone(tel) {
        if (!tel) return '';
        tel = tel.replace(/\D/g, '');
        if (tel.length === 11) return `(${tel.substring(0,2)}) ${tel.substring(2,7)}-${tel.substring(7,11)}`;
        if (tel.length === 10) return `(${tel.substring(0,2)}) ${tel.substring(2,6)}-${tel.substring(6,10)}`;
        return tel;
    }


    // Inicialização
    initializeNewOsForm(); // Prepara o formulário para uma nova OS
    loadOsList(); // Carrega a lista de OS existentes
});