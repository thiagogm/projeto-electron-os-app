// assets/js/feather_init.js
console.log("feather_init.js carregado");

let featherInitialized = false;
let pendingReplace = false;

function initializeFeatherIcons() {
    console.log("Tentando inicializar Feather Icons...");
    console.log("feather disponível:", typeof feather !== 'undefined');
    console.log("feather.replace disponível:", typeof feather !== 'undefined' && feather && typeof feather.replace === 'function');
    
    if (typeof feather !== 'undefined' && feather && typeof feather.replace === 'function') {
        try {
            // Forçar uma nova renderização
            feather.replace({ 'stroke-width': 1.5 });
            featherInitialized = true;
            console.log("Feather Icons inicializados com sucesso.");
            
            const featherElements = document.querySelectorAll('[data-feather]');
            console.log("Elementos com data-feather encontrados:", featherElements.length);
            if (featherElements.length > 0) {
                featherElements.forEach(el => {
                    console.log("Ícone encontrado:", el.getAttribute('data-feather'));
                });
            }
        } catch (e) {
            console.error("Erro ao inicializar Feather Icons:", e);
            featherInitialized = false;
        }
    } else {
        console.warn("Biblioteca Feather Icons não está disponível.");
        featherInitialized = false;
    }
}

// Função para substituir ícones com debounce
function debouncedReplace() {
    if (pendingReplace) return;
    pendingReplace = true;
    
    requestAnimationFrame(() => {
        if (typeof feather !== 'undefined' && feather && typeof feather.replace === 'function') {
            try {
                feather.replace({ 'stroke-width': 1.5 });
                const featherElements = document.querySelectorAll('[data-feather]');
                if (featherElements.length > 0) {
                    console.log("Ícones atualizados via debounce:", featherElements.length);
                }
            } catch (e) {
                console.error("Erro ao atualizar Feather Icons:", e);
            }
        }
        pendingReplace = false;
    });
}

// Configurar MutationObserver para detectar mudanças no DOM
function setupMutationObserver() {
    if (typeof MutationObserver === 'undefined') return;
    
    const observer = new MutationObserver((mutations) => {
        let shouldUpdate = false;
        
        mutations.forEach(mutation => {
            if (mutation.type === 'childList') {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === 1 && // Element node
                        (node.hasAttribute('data-feather') || 
                         node.querySelector('[data-feather]'))) {
                        shouldUpdate = true;
                    }
                });
            } else if (mutation.type === 'attributes' && 
                      mutation.attributeName === 'data-feather') {
                shouldUpdate = true;
            }
        });
        
        if (shouldUpdate) {
            debouncedReplace();
        }
    });
    
    observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['data-feather']
    });
    
    console.log("MutationObserver configurado para Feather Icons");
}

// Inicialização quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM carregado, inicializando Feather Icons...");
    initializeFeatherIcons();
    setupMutationObserver();
});

// Expor função global para reinicialização manual
window.initializeFeatherIcons = initializeFeatherIcons;

// Adicionar listener para quando o DOM estiver completamente carregado
window.addEventListener('load', () => {
    if (!featherInitialized) {
        console.log("Tentando inicializar Feather Icons após carregamento completo...");
        initializeFeatherIcons();
    }
}); 