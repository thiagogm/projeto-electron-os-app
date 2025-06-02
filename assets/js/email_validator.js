// assets/js/email_validator.js

/**
 * Valida o formato de um endereço de e-mail.
 * @param {string} email - O endereço de e-mail a ser validado.
 * @returns {boolean} True se o formato do e-mail for válido, false caso contrário.
 */
function validarEmail(email) {
    if (typeof email !== 'string' || email.trim() === '') {
        return false; 
    }

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email);
}

// Se você quiser que ela esteja disponível globalmente ao incluir o script,
// não precisa de 'export' no contexto de inclusão simples via <script>.
// Se estivesse usando módulos ES6, você usaria: export { validarEmail };