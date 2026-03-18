import { pedido, metodoSelecionado, porcentagemPagamento } from './state.js';
import { calcularTotal } from './calculate.js';
import { obterMercadoPago, CONFIG } from './config.js';
import { gerarMensagemWhatsCompleta, abrirWhatsApp } from './whatsapp.js';

// Variáveis de controle
export let paymentBrickController = null;
export let isRendering = false;
export let intervaloPix; 

// Auxiliar para limpar CPF
export function limparCPF(cpf) {
    return cpf.replace(/\D/g, '');
}

export async function iniciarCheckout() {
    const mp = obterMercadoPago();
    if (!mp) return;

    // Agora você usa o 'mp' para criar os Bricks ou processar
    const bricksBuilder = mp.bricks();
    
    // Exemplo: Renderizar o botão de pagamento
    // bricksBuilder.create('payment', 'id-do-container', { ... });
}

export async function inicializarCheckoutTransparente() {
    const container = document.getElementById('paymentBrick_container');
    if (!container) return;

    // 1. Pega o Mercado Pago uma única vez
    const mp = obterMercadoPago(); 
    if (!mp) return;

    const bricksBuilder = mp.bricks();
    const tipoPagina = document.body.getAttribute('data-pagina');
    
    console.log("Estado do pedido no checkout:", pedido);

    const valorBolo = calcularTotal(pedido, tipoPagina) || 0;
    const valorDoces = (pedido.doces || []).reduce((acc, d) => acc + (parseFloat(d.valor) || 0), 0);
    const valorTotalReal = valorBolo + valorDoces;
    const totalCalculado = parseFloat((valorTotalReal * porcentagemPagamento).toFixed(2));

    if (!totalCalculado || totalCalculado <= 0) {
        console.error("Erro: Valor total zerado.");
        return;
    }

    // 2. Limpa o Brick anterior se existir
    if (window.paymentBrickController) {
        try {
            await window.paymentBrickController.unmount();
        } catch(e) { console.log("Aviso: Nada para desmontar"); }
    }
    
    container.innerHTML = "";

    const metodoReal = localStorage.getItem('metodo_pagamento') || metodoSelecionado;

    const settings = {
        initialization: {
            amount: totalCalculado,
            payer: {
                email: pedido.cliente.email,
            },
        },
        customization: {
            paymentMethods: {
                // AQUI ESTÁ O SEGREDO:
                ticket: "none", // <--- Bloqueia o Boleto explicitamente (Adeus Boleto!)
                bankTransfer: (metodoReal === 'pix') ? ['pix'] : [],
                creditCard: (metodoReal === 'credit_card') ? 'all' : [],
                debitCard: (metodoReal === 'credit_card') ? 'all' : [], // Cartão de débito é seguro também
                maxInstallments: 1
            },
            visual: { 
                style: { theme: 'default' },
                hidePaymentButton: false // Garante que o botão do MP apareça
            }
        },
        callbacks: {
            onReady: () => console.log("✅ Secure Fields (PCI) carregados com sucesso!"),
            onError: (error) => console.error("Erro no Brick:", error),
            onSubmit: ({ selectedPaymentMethod, formData }) => {
                // Adicionamos o selectedPaymentMethod para saber se foi Pix ou Cartão no log
                console.log("Método selecionado:", selectedPaymentMethod);
                return enviarPagamentoAoBackend(formData, totalCalculado);
            },
        },
    };

    // 3. Renderiza
    window.paymentBrickController = await bricksBuilder.create("payment", "paymentBrick_container", settings);
}


export async function enviarPagamentoAoBackend(formData, totalCalculado) {
    const cpfLimpo = limparCPF(document.getElementById('cpfCliente').value);

    if (cpfLimpo.length !== 11) {
        alert("Por favor, digite um CPF válido.");
        return;
    }

    const containerMP = document.getElementById("container-pagamento-mp");
    if (containerMP) containerMP.innerHTML = "<h3>⏳ Processando pagamento seguro...</h3>";

    const pedidoIdInterno = "PED-" + Date.now();


    try {
        const response = await fetch(`${CONFIG.API_URL}/processar-pagamento`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                token: formData.token,
                issuer_id: formData.issuer_id,
                payment_method_id: formData.payment_method_id,
                transaction_amount: totalCalculado,
                installments: formData.installments,
                description: "Pedido de Bolo - Dayane Bolos",
                // AQUI ESTÁ O SEGREDO: Envie o ID gerado para o Flask
                external_reference: pedidoIdInterno, 
                cliente: {
                    nome: document.getElementById('nomeCliente').value,
                    email: document.getElementById('emailCliente').value,
                    telefone: document.getElementById('telefoneCliente').value,
                    cpf: cpfLimpo 
                },
                payer: {
                    email: document.getElementById('emailCliente').value,
                    identification: { type: "CPF", number: cpfLimpo }
                }
            }),
        });

        const resultado = await response.json();

        if (resultado.status === 'approved') {
            const msg = "Oi! Meu pagamento foi aprovado. Pode conferir?";
            localStorage.removeItem('carrinho_dayane');
            window.location.href = `sucesso.html?whatsapp=https://wa.me/5534996360443?text=${encodeURIComponent(msg)}`;
        } 
        else if (resultado.qr_code_base64 || resultado.status === 'pending') {
            // Lógica do PIX
            localStorage.setItem('ultimo_pedido_id', resultado.id);
            localStorage.setItem('dados_pix_resultado', JSON.stringify(resultado));
            
            if (containerMP) containerMP.style.display = "none";
            document.getElementById("pix-container").style.display = "flex";

            setTimeout(() => {
                document.getElementById("pix-qr-img").src = `data:image/png;base64,${resultado.qr_code_base64}`;
                document.getElementById("pix-copia-e-cola").value = resultado.qr_code;
                verificarStatusPagamento(resultado.id, pedido);
            }, 200);
        }
    } catch (err) {
        console.error("Erro fatal:", err);
        alert("Erro de conexão.");
    }
}

export function verificarStatusPagamento(paymentId, dadosDoPedido) { 
    if (window.intervaloPix) clearInterval(window.intervaloPix);

    window.intervaloPix = setInterval(async () => {
        try {
            const response = await fetch(`${CONFIG.API_URL}/consultar-pagamento/${paymentId}`);
            const statusData = await response.json();

            if (statusData.status === 'approved') {
                clearInterval(window.intervaloPix);
                const msg = gerarMensagemWhatsCompleta(dadosDoPedido);
                abrirWhatsApp("34996360443", msg); 
                
                // Limpa e finaliza
                localStorage.clear();
                window.location.href = "sucesso.html";
            }
        } catch (err) { console.error("Erro consulta:", err); }
    }, 4000);
}

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