// assets/js/cpf_validator.js

/**
 * Valida um número de CPF brasileiro.
 * @param {string} cpf - O CPF a ser validado (pode conter máscara).
 * @returns {boolean} True se o CPF for válido, false caso contrário.
 */
function validarCPF(cpf) {
    // Adiciona uma verificação de tipo para robustez, embora o replace já lide bem com não-strings.
    if (typeof cpf !== 'string') return false; 
    cpf = cpf.replace(/[^\d]+/g, ''); // Remove caracteres não numéricos

    if (cpf === '') return false;
    // Verifica se tem 11 dígitos e não são todos iguais
    if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false; 

    let soma = 0;
    let resto;

    for (let i = 1; i <= 9; i++) soma += parseInt(cpf.substring(i - 1, i)) * (11 - i);
    resto = (soma * 10) % 11;
    if (resto === 10 || resto === 11) resto = 0;
    if (resto !== parseInt(cpf.substring(9, 10))) return false;

    soma = 0;
    for (let i = 1; i <= 10; i++) soma += parseInt(cpf.substring(i - 1, i)) * (12 - i);
    resto = (soma * 10) % 11;
    if (resto === 10 || resto === 11) resto = 0;
    if (resto !== parseInt(cpf.substring(10, 11))) return false;

    return true;
}

/**
 * Formata um número de CPF para o formato XXX.XXX.XXX-XX.
 * Esta função é ideal para ser chamada no evento 'input' do campo CPF.
 * @param {string} cpf - O CPF a ser formatado (pode conter ou não máscara).
 * @returns {string} O CPF formatado ou a string original se não for possível formatar.
 */
function formatarCPF(cpf) {
    if (typeof cpf !== 'string') return '';
    
    // Remove tudo o que não é dígito
    const cpfLimpo = cpf.replace(/\D/g, '');

    // Limita ao tamanho máximo de um CPF para evitar comportamento inesperado com strings longas
    const cpfValido = cpfLimpo.substring(0, 11);

    let cpfFormatado = cpfValido;

    // Aplica a máscara progressivamente para funcionar bem durante a digitação
    if (cpfValido.length > 9) {
        cpfFormatado = cpfValido.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    } else if (cpfValido.length > 6) {
        cpfFormatado = cpfValido.replace(/(\d{3})(\d{3})(\d{1,3})/, '$1.$2.$3');
    } else if (cpfValido.length > 3) {
        cpfFormatado = cpfValido.replace(/(\d{3})(\d{1,3})/, '$1.$2');
    }
    // Se for menor ou igual a 3 dígitos, retorna os dígitos puros ou já parcialmente formatados.
    
    return cpfFormatado;
}

// Se não estiver usando módulos ES6 (import/export) e este arquivo for incluído
// diretamente via <script> no HTML, as funções validarCPF e formatarCPF
// já estarão disponíveis no escopo global e poderão ser chamadas por renderer_cliente.js.
// Não é necessário o DOMContentLoaded aqui.