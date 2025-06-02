// Conteúdo esperado para assets/js/cliente_init.js
// (Este é o script que antes estava inline no seu HTML e causava o erro de CSP para script inline)

var currentPath = window.location.pathname;

if (currentPath.includes('cadastro_cliente.html')) {
    // Lógica para desabilitar ou estilizar o botão de navegação 
    // para a própria página de "Cadastro de Clientes", se ele existir no cabeçalho.
    const goToClientesButton = document.getElementById('goToClientesPage'); // Ou o ID correto do seu botão no header
    if (goToClientesButton) {
        // Exemplo: desabilitar e mudar o estilo para 'ativo'
        // Esta lógica pode já estar sendo feita diretamente no HTML da página ativa,
        // então este script pode ser apenas um reforço ou não ser necessário
        // se o estado do botão já é definido no HTML.
        // goToClientesButton.setAttribute('disabled', true);
        // goToClientesButton.classList.remove('btn-outline-secondary');
        // goToClientesButton.classList.add('btn-primary'); // Ou uma classe 'active'
    }
}

// Adicione qualquer outra inicialização específica da página de cliente aqui, se necessário.