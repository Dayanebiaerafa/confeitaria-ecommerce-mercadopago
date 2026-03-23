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
    
    // 1. Verificação de visibilidade (Essencial para o SDK não travar)
    if (!container || container.offsetParent === null) {
        console.warn("⏳ Container invisível. Abortando renderização.");
        return;
    }

    // 2. Instanciação Direta (Garante que a KEY seja usada)
    // Se a função obterMercadoPago() falhar, usamos a instância direta
    let mp;
    try {
        mp = new MercadoPago('APP_USR-1af45030-78f4-4e0e-97f1-85d464b06625');
    } catch (e) {
        console.error("❌ Falha crítica ao iniciar SDK do Mercado Pago:", e);
        return;
    }

    // 3. Limpeza de instâncias mortas
    if (window.paymentBrickController) {
        try {
            await window.paymentBrickController.unmount();
        } catch(e) {}
    }
    container.innerHTML = "";

    // 4. Recuperação de valores com fallback
    const valorSalvo = localStorage.getItem('valor_final_pagamento');
    const totalCalculado = valorSalvo ? parseFloat(valorSalvo) : 0;

    if (totalCalculado < 1.0) {
        console.error("❌ Valor inválido:", totalCalculado);
        return;
    }

    // Garante que o método seja lido corretamente (minúsculo)
    const metodoReal = (localStorage.getItem('metodo_pagamento') || 'pix').toLowerCase();

    console.log("🚀 Renderizando Brick:", { valor: totalCalculado, metodo: metodoReal });

    const bricksBuilder = mp.bricks();
    const settings = {
        initialization: {
            amount: totalCalculado,
            payer: { 
                email: (typeof pedido !== 'undefined' ? pedido.cliente?.email : "cliente@exemplo.com"),
                // ADICIONE ESTA LINHA ABAIXO:
                entityType: 'individual' 
            },
        },
        customization: {
            paymentMethods: {
                // Filtro sênior: se não for um, é o outro. Nunca os dois vazios.
                bankTransfer: (metodoReal.includes('pix')) ? ['pix'] : [],
                creditCard: (metodoReal.includes('card')) ? 'all' : [],
                debitCard: (metodoReal.includes('card')) ? 'all' : [],
                maxInstallments: 1
            },
            visual: { style: { theme: 'default' } }
        },
        callbacks: {
            onReady: () => console.log("✅ Brick visível na tela!"),
            onError: (error) => console.error("❌ Erro do SDK:", error),
            onSubmit: ({ formData }) => enviarPagamentoAoBackend(formData, totalCalculado),
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
                
                // SÊNIOR: Em vez de confiar apenas na variável da memória, 
                // pegamos o pedido completo que salvamos no storage
                const pedidoRecuperado = JSON.parse(localStorage.getItem('pedido_salvo_para_automacao')) || dadosDoPedido;
                
                const msg = gerarMensagemWhatsCompleta(pedidoRecuperado);
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