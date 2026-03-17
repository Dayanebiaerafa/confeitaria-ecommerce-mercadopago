import { pedido, metodoSelecionado, porcentagemPagamento } from './state.js';
import { calcularTotal } from './calculate.js';
import { CONFIG } from './config.js';
import { gerarMensagemWhatsCompleta, abrirWhatsApp } from './whatsapp.js';

// Variáveis de controle
export let paymentBrickController = null;
export let isRendering = false;
export let intervaloPix; 

// Auxiliar para limpar CPF
export function limparCPF(cpf) {
    return cpf.replace(/\D/g, '');
}

export async function inicializarCheckoutTransparente() {
    const container = document.getElementById('paymentBrick_container');
    // ... trava do container ...

    const tipoPagina = document.body.getAttribute('data-pagina');
    
    // DEBUG SÊNIOR: Vamos ver o que tem no pedido antes de calcular
    console.log("Estado do pedido no checkout:", pedido);

    const valorBolo = calcularTotal(pedido, tipoPagina) || 0;
    const valorDoces = (pedido.doces || []).reduce((acc, d) => acc + (parseFloat(d.valor) || 0), 0);
    
    const valorTotalReal = valorBolo + valorDoces;

    // Aplica a porcentagem (sinal de 50% ou 100%)
    const totalCalculado = parseFloat((valorTotalReal * porcentagemPagamento).toFixed(2));

    if (!totalCalculado || totalCalculado <= 0) {
        console.error("Erro: Valor total zerado. Checkout interrompido. Verifique se o item foi adicionado corretamente.");
        // Opcional: alert("Seu carrinho parece estar vazio. Adicione um produto antes de finalizar.");
        return;
    }

    if (window.paymentBrickController) {
        try {
            await window.paymentBrickController.unmount();
        } catch(e) { console.log("Aviso: Nada para desmontar"); }
    }
    
    container.innerHTML = "";

    const mp = new MercadoPago('APP_USR-1af45030-78f4-4e0e-97f1-85d464b06625');
    const bricksBuilder = mp.bricks();
    const metodoReal = localStorage.getItem('metodo_pagamento') || metodoSelecionado;

    const settings = {
        initialization: {
            amount: totalCalculado,
            payer: {
                email: pedido.cliente.email,
                entityType: 'individual' 
            },
        },
        customization: {
            paymentMethods: {
                // SÊNIOR: Forçamos a lógica baseada na escolha real do usuário
                bankTransfer: (localStorage.getItem('metodo_pagamento') === 'pix' || metodoSelecionado === 'pix') ? ['pix'] : [],
                creditCard: metodoReal === 'credit_card' ? 'all' : [],
                maxInstallments: 1
            },
            visual: { style: { theme: 'default' } }
        },
        callbacks: {
            onReady: () => console.log("Brick pronto!"),
            onError: (error) => console.error("Erro no Brick:", error),
            onSubmit: ({ formData }) => {
                return enviarPagamentoAoBackend(formData, totalCalculado);
            },
        },
    };

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