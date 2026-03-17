import { pedido, metodoSelecionado, porcentagemPagamento } from './state.js';
import { calcularTotal } from './calculate.js';
import { CONFIG } from './config.js';
import { gerarMensagemWhatsCompleta, abrirWhatsApp } from './whatsapp.js';

// Variável para evitar criar o Brick várias vezes e dar erro
export let paymentBrickController = null;
export let isRendering = false;
export let intervaloPix; // Variável para controlar o timer

export async function inicializarCheckoutTransparente() {
    console.log("Dados para o Pix:", pedido.cliente)    // 1. Limpa o container
    const container = document.getElementById('paymentBrick_container');

    // TRAVA 1: Se o container não existe ou não está visível, não faz nada
    if (!container || container.offsetWidth === 0) {
        console.warn("⏳ Container ainda oculto, aguardando...");
        return; 
    }

    

    // REMOVI as chamadas renderizarPix() e renderizarCartao() pois elas não existem
    // O próprio Mercado Pago (Payment Brick) já faz esse papel.

    const tipoPagina = document.body.getAttribute('data-pagina');
    const valorBolo = calcularTotal(pedido, tipoPagina);
    const valorDoces = (pedido.doces || []).reduce((acc, d) => acc + (parseFloat(d.valor) || 0), 0);
    const valorTotalReal = valorBolo + valorDoces;

    // Valor que será enviado ao Mercado Pago
    const totalCalculado = parseFloat((valorTotalReal * porcentagemPagamento).toFixed(2));

    if (!totalCalculado || totalCalculado <= 0) {
        console.error("Erro: Valor total zerado. Checkout interrompido.");
        return;
    }

    // Limpeza oficial da instância anterior
    if (window.paymentBrickController) {
        try {
            await window.paymentBrickController.unmount();
            window.paymentBrickController = null;
        } catch(e) { console.log("Aviso: Nada para desmontar"); }
    }
    
    // Limpa o HTML interno para não duplicar nada
    container.innerHTML = "";
    window.mpInstanciado = false; 

   
    
    // 3. Após o cálculo, marque como instanciado
    window.mpInstanciado = true;

    const mp = new MercadoPago('APP_USR-1af45030-78f4-4e0e-97f1-85d464b06625');
    const bricksBuilder = mp.bricks();

    // Renderização
    const renderPaymentBrick = async (bricksBuilder) => {
        const settings = {
            initialization: {
                amount: totalCalculado, // USANDO O VALOR REAL CALCULADO
                payer: {
                    email: pedido.cliente.email,
                    entityType: 'individual' 
                },
            },
            customization: {
                paymentMethods: {
                    // Aqui filtramos o que aparece baseado no botão que o cliente clicou antes
                    bankTransfer: metodoSelecionado === 'pix' ? ['pix'] : [],
                    creditCard: metodoSelecionado === 'credit_card' ? 'all' : [],
                    maxInstallments: 1
                },
                visual: {
                    style: { theme: 'default' }
                }
            },
            callbacks: {
                onReady: () => console.log("Sênior Log: Brick pronto!"),
                onError: (error) => console.error("Erro no Brick:", error),
                onSubmit: ({ selectedPaymentMethod, formData }) => {
                    return enviarPagamentoAoBackend(formData, totalCalculado);
                },
            },
        };

        window.paymentBrickController = await bricksBuilder.create(
            "payment",
            "paymentBrick_container",
            settings
        );
    };

    renderPaymentBrick(bricksBuilder);
}
// Esta função substitui o seu antigo fetch



export async function enviarPagamentoAoBackend(formData, totalCalculado) {
    console.log("🚀 DEBUG SÊNIOR: Dados que estou enviando:", formData);
    
    const containerMP = document.getElementById("container-pagamento-mp");

    // Feedback visual imediato
    if (containerMP) {
        containerMP.innerHTML = "<h3>⏳ Processando pagamento seguro... Por favor, não feche esta tela.</h3>";
    }

    try {
        const response = await fetch('https://site-backend-mrgq.onrender.com/processar-pagamento', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                token: formData.token,
                issuer_id: formData.issuer_id,
                payment_method_id: formData.payment_method_id,
                transaction_amount: totalCalculado,
                installments: formData.installments,
                description: "Pedido de Bolo - Dayane Bolos",
                payer: {
                    email: formData.payer.email,
                    identification: formData.payer.identification,
                }
            }),
        });

        const resultado = await response.json();
        console.log("✅ Resposta do Servidor recebida:", resultado);

        // --- CASO 1: CARTÃO APROVADO NA HORA ---
        if (resultado.status === 'approved') {
            // SÓ AQUI limpamos o carrinho
            localStorage.removeItem('carrinho_dayane');
            localStorage.removeItem('ultimo_pedido_id');
            localStorage.removeItem('dados_pix_resultado');
            const msgDayane = "Oi! Meu pagamento foi aprovado. Pode conferir?";
            window.location.href = `sucesso.html?whatsapp=https://wa.me/5534996360443?text=${encodeURIComponent(msgDayane)}`;
        } else {
            // Se for 'pending' (Pix gerado), NÃO LIMPAMOS. 
            // Assim o banner continua funcionando com os dados salvos.
            console.log("Pagamento pendente, mantendo dados para recuperação.");
        }

        // --- CASO 2: PIX GERADO (STATUS PENDING) ---
        if (resultado.qr_code_base64 || resultado.status === 'pending') {
            console.log("🎨 Iniciando troca de telas: Mercado Pago -> Pix");

            // 1. SALVAMENTO DE SEGURANÇA
            localStorage.setItem('ultimo_pedido_id', resultado.id);
            localStorage.setItem('pedido_salvo_para_automacao', JSON.stringify(pedido)); 
            localStorage.setItem('dados_pix_resultado', JSON.stringify(resultado));
            localStorage.setItem('carrinho_dayane', JSON.stringify(pedido));

            // 2. PREPARAÇÃO DA INTERFACE (Aumente o nível de certeza aqui)
            if (containerMP) {
                containerMP.style.display = "none"; 
                containerMP.innerHTML = ""; 
            }

            const pixContainer = document.getElementById("pix-container");
            if (pixContainer) {
                pixContainer.style.display = "flex";
                pixContainer.style.flexDirection = "column";
                pixContainer.style.alignItems = "center";
            }

            // 3. INJEÇÃO DE DADOS (Com atraso para não ser atropelado pelo DOM)
            setTimeout(() => {
                const qrImg = document.getElementById("pix-qr-img");
                const copiaCola = document.getElementById("pix-copia-e-cola");

                if (qrImg) qrImg.src = `data:image/png;base64,${resultado.qr_code_base64}`;
                if (copiaCola) copiaCola.value = resultado.qr_code;
                
                console.log("💎 Pix injetado com sucesso na primeira geração.");
                
                if (resultado.id) {
                    verificarStatusPagamento(resultado.id, pedido); 
                }
            }, 200); // 200ms é o tempo ideal para o Render do navegador

            window.scrollTo({ top: 0, behavior: 'smooth' });
        

        } else {
            // --- CASO 3: ERRO OU REJEIÇÃO ---
            console.error("❌ O pagamento não foi aprovado ou o Pix falhou.");
            alert("O pagamento não pôde ser processado. Verifique os dados e tente novamente.");
            // Aqui NÃO chamamos limparDadosAposPedido para o cliente não perder o carrinho
        }

    } catch (err) {
        console.error("💥 Erro FATAL na chamada fetch:", err);
        alert("Erro de conexão com o servidor.");
    }
}

// payment.js ou utils.js
export function limparDadosAposPedido() {
    console.log("🧹 Pagamento Aprovado: Limpando tudo.");

    // 1. Limpa o Storage (Todos os rastros do pedido anterior)
    localStorage.removeItem('ultimo_pedido_id');
    localStorage.removeItem('dados_ultimo_pedido');
    localStorage.removeItem('dados_pix_resultado'); // ESSENCIAL: para o banner não tentar injetar lixo
    localStorage.removeItem('carrinho_dayane'); 
    
    // 2. Limpa o objeto global pedido (para não sobrar dados na memória)
    // Usamos o delete para manter a referência da constante 'pedido'
    if (typeof pedido === 'object') {
        Object.keys(pedido).forEach(key => delete pedido[key]);
    }

    // 3. Remove o banner da tela
    const banner = document.getElementById('banner-pendente');
    if (banner) banner.remove();

    // 4. Interface
    if (typeof atualizarSacola === 'function') {
        atualizarSacola(0); 
    }

    // 5. REDIRECIONAMENTO (O passo final do sucesso)
    // Sênior: Só redirecionamos após garantir que o storage está limpo
    window.location.href = "sucesso.html";
}


// payment.js

export function verificarStatusPagamento(paymentId, dadosDoPedido) { 
    // Garante que não existam dois verificadores rodando ao mesmo tempo
    if (typeof intervaloPix !== 'undefined') clearInterval(intervaloPix);

    console.log("🕵️ Verificador iniciado...");

    // Definimos o intervalo globalmente para podermos limpar depois
    window.intervaloPix = setInterval(async () => {
        try {
            const response = await fetch(`https://site-backend-mrgq.onrender.com/consultar-pagamento/${paymentId}`);
            const statusData = await response.json();

            // QUANDO O PAGAMENTO É APROVADO:
            if (statusData.status === 'approved') {
                clearInterval(window.intervaloPix);
                console.log("✅ Pagamento aprovado! Automatizando processos...");

                const dadosFinais = dadosDoPedido || JSON.parse(localStorage.getItem('dados_ultimo_pedido'));

                try {
                    // 1. Enviar para Planilha (O seu Backend já faz isso também, mas aqui é um reforço)
                    fetch(CONFIG.URL_PLANILHA, { method: 'POST', mode: 'no-cors', body: JSON.stringify(dadosFinais) });

                    // 2. Disparar WhatsApp detalhado PARA A DAYANE
                    // Aqui usamos a sua função de mensagem completa
                    const msg = gerarMensagemWhatsCompleta(dadosFinais);
                    
                    // IMPORTANTE: Trocamos 'dadosFinais.cliente.telefone' pelo SEU número fixo
                    // No momento de enviar para VOCÊ (Dayane):
                    abrirWhatsApp("34996360443", msg); 
                    
                } catch (msgError) {
                    console.error("Erro na automação:", msgError);
                }

                // 3. AGORA SIM: Limpa e Redireciona
                limparDadosAposPedido(); 
                
                setTimeout(() => {
                    window.location.href = "sucesso.html";
                }, 2000); // Aumentei para 2s para garantir que o Zap abra antes de mudar a página
            }
        } catch (err) {
            console.error("Erro na consulta do status:", err);
        }
    }, 4000);
}

// SÊNIOR: Exportação global para que o main.js e o HTML consigam acessar
window.verificarStatusPagamento = verificarStatusPagamento;

export function prepararTrocaDeMetodo() {
    console.log("🔄 Limpando estado de pagamento anterior para novo método...");
    localStorage.removeItem('ultimo_pedido_id');
    localStorage.removeItem('dados_pix_resultado');
    
    // Para o verificador de Pix se ele estiver rodando
    if (window.intervaloPix) {
        clearInterval(window.intervaloPix);
    }
}