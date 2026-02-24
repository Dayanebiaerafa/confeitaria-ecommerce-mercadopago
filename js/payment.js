import { pedido, metodoSelecionado, porcentagemPagamento } from './state.js';
import { calcularTotal } from './calculate.js';

// Variável para evitar criar o Brick várias vezes e dar erro
export let paymentBrickController = null;
export let isRendering = false;

export async function inicializarCheckoutTransparente() {
    // 1. Limpa o container
    const container = document.getElementById('paymentBrick_container');
    
    // Se o container já tiver algo dentro (um iframe do MP), não faz nada ou limpa
    if (container && container.innerHTML.includes("iframe")) {
        console.log("Sênior Log: Checkout já existe, ignorando nova criação.");
        return;
    }
    
    if (container) container.innerHTML = "Carregando checkout seguro...";

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
        } catch(e) { console.log("Aviso: Nada para desmontar"); }
    }

    const mp = new MercadoPago('APP_USR-fdd921e4-9568-400f-891e-ce79a6231de1');
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
    const nomeInput = document.getElementById("nomeCliente");
    
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
                description: "Pedido de Bolo - Confeitaria",
                payer: {
                    email: formData.payer.email, 
                    identification: formData.payer.identification,
                },
                nomeCliente: nomeInput ? nomeInput.value : "Cliente Confeitaria"
            }),
        });

        const resultado = await response.json();
        
        if (resultado.status === 'approved' || resultado.status === 'pending') {

            // --- AQUI ENTRA O AJUSTE PARA O PIX ---
            if (resultado.qr_code_base64 || resultado.status_detail === 'pending_waiting_transfer') {
                
                // 1. Esconde o Mercado Pago e o título (mantendo o resumo visível se você quiser)
                const containerMP = document.getElementById("container-pagamento-mp");
                if(containerMP) containerMP.style.display = "none";
                
                // 2. Mostra o SEU container de Pix que criamos no HTML
                const pixContainer = document.getElementById("pix-container");
                if(pixContainer) pixContainer.style.display = "block";
                
                // 3. Alimenta a imagem do QR Code (Atenção ao espaço após a vírgula, removi para evitar erro)
                const qrImg = document.getElementById("pix-qr-img");
                if(qrImg) qrImg.src = `data:image/png;base64,${resultado.qr_code_base64}`;
                
                // 4. Alimenta o código Copia e Cola
                const copiaCola = document.getElementById("pix-copia-e-cola");
                if(copiaCola) copiaCola.value = resultado.qr_code;
                
                console.log("Pix gerado com sucesso!");

            } 
            // CASO 2: CARTÃO APROVADO
            else if (resultado.status === 'approved') {
                alert("Pagamento Aprovado! Já estamos preparando seu pedido.");
                window.location.href = "sucesso.html";
            }
            // CASO 3: ANÁLISE
            else {
                alert("Seu pagamento está em análise. Assim que aprovado, iniciaremos o pedido.");
                window.location.href = "sucesso.html";
            }

        } else {
            alert("Pagamento não aprovado. Motivo: " + (resultado.status_detail || resultado.status));
        }

    } catch (err) {
        console.error("Erro ao enviar para o backend:", err);
        alert("Erro na comunicação com o servidor. Tente novamente.");
    }
}   