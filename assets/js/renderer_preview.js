// assets/js/renderer_preview.js
document.addEventListener('DOMContentLoaded', () => {
    const pdfEmbed = document.getElementById('pdfEmbed');
    const savePdfButton = document.getElementById('savePdfButton');
    const printPdfButton = document.getElementById('printPdfButton');
    const closePreviewButton = document.getElementById('closePreviewButton');
    const previewStatusMessage = document.getElementById('previewStatusMessage');

    let currentTempPdfPath = '';

    // Verifica se todos os elementos essenciais da UI existem
    if (!pdfEmbed || !savePdfButton || !printPdfButton || !closePreviewButton || !previewStatusMessage) {
        console.error("Erro Crítico: Um ou mais elementos da UI da pré-visualização não foram encontrados no DOM. Verifique os IDs no pdf_preview.html.");
        if (previewStatusMessage) {
            previewStatusMessage.textContent = "Erro ao carregar interface de pré-visualização.";
        }
        // Desabilita botões se a UI estiver incompleta para evitar mais erros
        if(savePdfButton) savePdfButton.disabled = true;
        if(printPdfButton) printPdfButton.disabled = true;
        if(closePreviewButton) closePreviewButton.disabled = true;
        return; // Interrompe a execução se elementos cruciais faltarem
    }
    
    // Escuta o caminho do PDF a ser carregado, enviado pelo processo principal
    if (window.previewAPI && typeof window.previewAPI.onLoadPdf === 'function') {
        window.previewAPI.onLoadPdf((filePath) => {
            console.log("Renderer Preview: Recebido caminho do PDF para carregar:", filePath);
            if (filePath && typeof filePath === 'string') {
                // Adicionar um timestamp para tentar evitar problemas de cache do <embed>
                // Certifique-se que o filePath seja um caminho absoluto ou relativo correto que o <embed> possa acessar.
                // Para arquivos locais, o Electron geralmente lida bem com caminhos absolutos.
                pdfEmbed.setAttribute('src', `${filePath}?t=${Date.now()}`);
                currentTempPdfPath = filePath;
                previewStatusMessage.textContent = "Revise o relatório. Ao fechar, você será redirecionado.";
            } else {
                pdfEmbed.setAttribute('src', ""); // Limpa se o caminho for inválido
                previewStatusMessage.textContent = "Erro: Nenhum arquivo PDF para exibir.";
                console.error("Renderer Preview: Caminho do arquivo PDF não recebido ou inválido:", filePath);
            }
        });
    } else {
        console.error("Renderer Preview: previewAPI.onLoadPdf não está disponível. Verifique preload_preview.js.");
        previewStatusMessage.textContent = "Erro de comunicação ao carregar PDF.";
    }

    savePdfButton.addEventListener('click', async () => {
        if (!currentTempPdfPath) {
            previewStatusMessage.textContent = "Nenhum PDF carregado para salvar.";
            console.warn("Renderer Preview: Tentativa de salvar sem PDF carregado.");
            return;
        }
        if (window.previewAPI && typeof window.previewAPI.requestSavePdf === 'function') {
            previewStatusMessage.textContent = "Abrindo diálogo para salvar...";
            savePdfButton.disabled = true;
            printPdfButton.disabled = true; // Desabilita também para evitar ações concorrentes
            try {
                // A resposta desta chamada será tratada pelo listener 'onPdfActionStatus'
                await window.previewAPI.requestSavePdf(currentTempPdfPath);
            } catch (error) {
                console.error("Erro ao solicitar salvamento do PDF via IPC:", error);
                previewStatusMessage.textContent = `Erro ao solicitar salvamento: ${error.message || 'Erro desconhecido'}`;
                savePdfButton.disabled = false;
                printPdfButton.disabled = false;
            }
        } else {
            console.error("Renderer Preview: previewAPI.requestSavePdf não está disponível.");
            previewStatusMessage.textContent = "Erro: Função de salvar não disponível.";
        }
    });

    printPdfButton.addEventListener('click', () => {
        if (!currentTempPdfPath) {
            previewStatusMessage.textContent = "Nenhum PDF carregado para imprimir.";
            console.warn("Renderer Preview: Tentativa de imprimir sem PDF carregado.");
            return;
        }
        if (window.previewAPI && typeof window.previewAPI.requestPrintPdf === 'function') {
            previewStatusMessage.textContent = "Abrindo diálogo de impressão...";
            printPdfButton.disabled = true; 
            // Reativa após um tempo, pois o diálogo de impressão é modal e bloqueia.
            // O ideal seria o main process notificar quando o diálogo de impressão é fechado.
            setTimeout(() => { if(printPdfButton) printPdfButton.disabled = false; }, 5000); 
            window.previewAPI.requestPrintPdf();
        } else {
            console.error("Renderer Preview: previewAPI.requestPrintPdf não está disponível.");
            previewStatusMessage.textContent = "Erro: Função de imprimir não disponível.";
        }
    });

    closePreviewButton.addEventListener('click', () => {
        previewStatusMessage.textContent = "Fechando pré-visualização...";
        if (window.previewAPI && typeof window.previewAPI.notifyClosePreview === 'function') {
            window.previewAPI.notifyClosePreview();
            // A janela será efetivamente fechada pelo processo principal
        } else {
            console.error("Renderer Preview: previewAPI.notifyClosePreview não está disponível.");
            alert("Erro ao tentar fechar. Por favor, feche a janela manualmente se ela não fechar automaticamente.");
        }
    });

    // Escuta o status das ações (salvar, imprimir) do processo principal
    if (window.previewAPI && typeof window.previewAPI.onPdfActionStatus === 'function') {
        window.previewAPI.onPdfActionStatus((result) => {
            console.log("Renderer Preview: Status da ação PDF recebido:", result);
            if (result && result.action === 'save') {
                savePdfButton.disabled = false; 
                printPdfButton.disabled = false;
                if (result.success) {
                    previewStatusMessage.textContent = `PDF salvo com sucesso em: ${result.filePath}`;
                } else if (result.canceled) {
                    previewStatusMessage.textContent = "Salvamento do PDF cancelado pelo usuário.";
                } else {
                    previewStatusMessage.textContent = `Erro ao salvar PDF: ${result.error || 'Erro desconhecido'}`;
                }
            } else if (result && result.action === 'print') {
                printPdfButton.disabled = false;
                if (result.success) {
                    previewStatusMessage.textContent = "Documento enviado para impressão.";
                } else {
                    previewStatusMessage.textContent = `Falha ao imprimir: ${result.error || 'Erro desconhecido'}`;
                }
            }
        });
    } else {
        console.warn("Renderer Preview: previewAPI.onPdfActionStatus não está disponível.");
    }

     if (typeof feather !== 'undefined' && feather && typeof feather.replace === 'function') {
         try {
             feather.replace();
             console.log("Feather Icons inicializados na página de pré-visualização.");
        } catch(e) {
            console.error("Erro ao renderizar Feather Icons na página de pré-visualização:", e);
         }
     } else {
         console.warn("Biblioteca Feather Icons (feather) não carregada na página de pré-visualização.");
     }

     window.electronAPI.onTriggerGenerateReport((reportType) => {
         window.electronAPI.invoke('trigger-generate-report', reportType);
     });
});