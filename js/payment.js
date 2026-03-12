import { pedido, metodoSelecionado, porcentagemPagamento } from './state.js';
import { calcularTotal } from './calculate.js';
import { CONFIG } from './config.js';
import { gerarMensagemWhatsCompleta, abrirWhatsApp } from './whatsapp.js';

// Variável para evitar criar o Brick várias vezes e dar erro
export let paymentBrickController = null;
export let isRendering = false;
export let intervaloPix; // Variável para controlar o timer

export async function inicializarCheckoutTransparente() {
    // 1. Limpa o container
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
    console.log("🚀 Iniciando envio ao Backend...", formData);
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
            console.log("💳 Cartão aprovado! Redirecionando...");
            limparDadosAposPedido();
            window.location.href = "sucesso.html";
            return; // Encerra aqui
        }

        // --- CASO 2: PIX GERADO (STATUS PENDING) ---
        if (resultado.qr_code_base64 || resultado.status === 'pending') {
            console.log("🎨 Iniciando troca de telas: Mercado Pago -> Pix");

            // 1. Limpeza do container do Mercado Pago
            if (containerMP) {
                containerMP.style.display = "none"; 
                containerMP.innerHTML = ""; 
            }

            // 2. Exibição e Alinhamento do Pix
            const pixContainer = document.getElementById("pix-container");
            if (pixContainer) {
                pixContainer.style.display = "flex"; 
                pixContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }

            // 3. Injeção dos dados (QR Code e Copia e Cola)
            const qrImg = document.getElementById("pix-qr-img");
            if (qrImg) qrImg.src = `data:image/png;base64,${resultado.qr_code_base64}`;
            localStorage.setItem('ultimo_pedido_id', resultado.id);
            localStorage.setItem('dados_ultimo_pedido', JSON.stringify(pedido));

            const copiaCola = document.getElementById("pix-copia-e-cola");
            if (copiaCola) copiaCola.value = resultado.qr_code;

            // 4. Limpeza do Carrinho e Início da Verificação Automática
            limparDadosAposPedido();

            if (resultado.id) {
                // Passamos o objeto 'pedido' (que você importou do state.js) para a função
                verificarStatusPagamento(resultado.id, pedido); 
            }

            // Scroll para o topo para garantir visibilidade
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

function limparDadosAposPedido() {
    console.log("🧹 Limpando dados do pedido para evitar duplicidade...");
    
    // 1. Limpa o Carrinho (se você usa localStorage)
    localStorage.removeItem('carrinho'); 
    
    // 2. Limpa os campos de texto do formulário (opcional, mas recomendado)
    // document.getElementById("observacaoPedido").value = "";
    
    // 3. Reseta o estado da sacola na interface
    // Se você tiver uma função que atualiza o contador da sacola para 0, chame-a aqui
    if (typeof atualizarSacola === 'function') {
        atualizarSacola(0); 
    }

    // 4. Bloqueia o botão "Voltar" ou avisa que o pedido já foi registrado
    //const btnVoltar = document.getElementById("btnVoltar");
    //if (btnVoltar) btnVoltar.style.display = "none"; 
}


export function verificarStatusPagamento(paymentId, dadosDoPedido) { 
    // Passamos dadosDoPedido como parâmetro para a função conhecer o objeto 'pedido'
    if (intervaloPix) clearInterval(intervaloPix);

    console.log("🕵️ Verificador iniciado...");
    intervaloPix = setInterval(async () => {
        try {
            const response = await fetch(`https://site-backend-mrgq.onrender.com/consultar-pagamento/${paymentId}`);
            const statusData = await response.json();

            // QUANDO O PAGAMENTO É APROVADO:
            if (statusData.status === 'approved') {
                clearInterval(intervaloPix);
                
                console.log("✅ Pagamento aprovado! Automatizando processos...");

                // 1. Enviar para a sua Planilha/IA (Silencioso)
                // Use a URL que você obteve ao implantar o Apps Script
                fetch(CONFIG.URL_PLANILHA, {
                    method: 'POST',
                    mode: 'no-cors',
                    body: JSON.stringify(dadosDoPedido)
                });

                // 2. Disparar WhatsApp (O cliente clica e já envia a msg pronta)
                const msg = gerarMensagemWhatsCompleta(dadosDoPedido);
                abrirWhatsApp(dadosDoPedido.cliente.telefone, msg);
                
                // 3. Limpar e Finalizar
                limparDadosAposPedido();
                window.location.href = "sucesso.html";
            }
        } catch (err) {
            console.error("Erro na consulta:", err);
        }
    }, 4000);
}