// assets/js/cep.js
async function buscarEnderecoPorCEP(cepValue) {
    const cep = cepValue.replace(/\D/g, ''); // Remove caracteres não numéricos
    if (cep.length !== 8) {
        clearAddressFields();
        // alert('CEP inválido. Deve conter 8 dígitos.');
        return null;
    }

    try {
        const data = await window.electronAPI.fetchCep(cep);

        if (data.erro) {
            clearAddressFields();
            // alert('CEP não encontrado.');
            document.getElementById('cep').focus();
            return null;
        }

        document.getElementById('address').value = data.logradouro || '';
        document.getElementById('neighborhood').value = data.bairro || '';
        document.getElementById('city').value = data.localidade || '';
        document.getElementById('state').value = data.uf || '';
        // Focar no campo número após preencher
        document.getElementById('number').focus();
        return data;

    } catch (error) {
        console.error('Erro ao buscar CEP:', error);
        clearAddressFields();
        // alert('Erro ao buscar CEP. Verifique sua conexão ou tente novamente.');
        return null;
    }
}

function clearAddressFields(clearCep = false) {
    if (clearCep) document.getElementById('cep').value = '';
    document.getElementById('address').value = '';
    document.getElementById('number').value = '';
    document.getElementById('complement').value = '';
    document.getElementById('neighborhood').value = '';
    document.getElementById('city').value = '';
    document.getElementById('state').value = '';
}