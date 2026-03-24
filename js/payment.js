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


let mpInstance = null; 

export function obterMercadoPago() {
    if (mpInstance) return mpInstance;

    if (typeof window.MercadoPago === 'undefined') {
        console.error("❌ Erro: SDK do Mercado Pago não encontrado.");
        return null;
    }

    try {
        mpInstance = new window.MercadoPago(CONFIG.MP_PUBLIC_KEY, {
            locale: 'pt-BR'
        });
        console.log("💳 SDK Mercado Pago: Instância Singleton inicializada.");
        return mpInstance;
    } catch (e) {
        console.error("❌ Erro ao instanciar MP:", e);
        return null;
    }
}

export async function iniciarCheckout() {
    const mp = obterMercadoPago();
    if (!mp) return;

    const bricksBuilder = mp.bricks();
    console.log("🚀 Bricks Builder pronto para uso.");
    
    // Agora a constante bricksBuilder não estará mais "apagada" 
    // porque vamos usá-la aqui embaixo para renderizar o Pix.
}

export async function inicializarCheckoutTransparente() {
    const container = document.getElementById('paymentBrick_container');
    
    // --- NOVA LÓGICA DINÂMICA DE CPF/CNPJ (ADICIONE AQUI) ---
    const radioPF = document.getElementById("tipoPF");
    const radioPJ = document.getElementById("tipoPJ");
    const inputDoc = document.getElementById("cpfCliente");
    const labelDoc = document.querySelector('label[for="cpfCliente"]');

    if (radioPF && radioPJ && inputDoc) {
        const atualizarLogicaDocumento = () => {
            // 1. Limpa o valor para evitar que um CPF incompleto vire um CNPJ inválido
            inputDoc.value = ""; 

            if (radioPJ.checked) {
                // 2. Ajusta Visual e Limite (18 inclui pontos/traços da máscara)
                labelDoc.innerText = "CNPJ (Obrigatório para PIX) *";
                inputDoc.maxLength = 18; 
                console.log("🚀 Modo CNPJ ativado");
            } else {
                labelDoc.innerText = "CPF (Obrigatório para PIX) *";
                inputDoc.maxLength = 14; 
                console.log("🚀 Modo CPF ativado");
            }
        };

        // Usamos addEventListener em ambos para garantir que a troca de estado seja detectada
        radioPF.addEventListener("change", atualizarLogicaDocumento);
        radioPJ.addEventListener("change", atualizarLogicaDocumento);
    }
    // 1. Verificação de visibilidade (Essencial para o SDK não travar)
   if (!container) {
        console.warn("❌ Container 'paymentBrick_container' não encontrado no DOM.");
        return;
    }

    // 2. Instanciação Direta (Garante que a KEY seja usada)
    // Se a função obterMercadoPago() falhar, usamos a instância direta
    let mp;
    try {
        // Use sua chave pública enviada no contexto
        mp = new window.MercadoPago('APP_USR-1af45030-78f4-4e0e-97f1-85d464b06625', {
            locale: 'pt-BR' // Adicionar o locale ajuda na nota de qualidade
        });
    } catch (e) {
        console.error("❌ Erro ao instanciar V2:", e);
        return;
    }

    // 3. Limpeza de instâncias mortas
    if (window.paymentBrickController) {
        try {
            // O await é fundamental aqui para esperar o navegador liberar o banco de dados
            await window.paymentBrickController.unmount();
            window.paymentBrickController = null;
        } catch(e) {
            console.warn("Aviso: Falha ao desmontar", e);
        }
    }

    // Limpeza física do container
    
    if (container) {
        container.innerHTML = "";
    }

    // DICA SÊNIOR: Adicione uma pequena verificação se o SDK já não está rodando
    if (window.mpInstanciado === true) return; 
    window.mpInstanciado = true;

    // 4. Recuperação de valores com fallback
    const valorSalvo = localStorage.getItem('valor_final_pagamento');
    const totalCalculado = valorSalvo ? parseFloat(valorSalvo) : 0;

    if (totalCalculado < 1.0) {
        console.error("❌ Valor inválido:", totalCalculado);
        return;
    }
    
    const tipoDoc = document.querySelector('input[name="tipoDocumento"]:checked')?.value || "CPF";
    // Garante que o método seja lido corretamente (minúsculo)
    const metodoReal = (localStorage.getItem('metodo_pagamento') || 'pix').toLowerCase();
    
    console.log("🚀 Renderizando Brick:", { valor: totalCalculado, metodo: metodoReal });

    const bricksBuilder = mp.bricks();
    const settings = {
        initialization: {
            amount: totalCalculado,
            payer: { 
                // MELHORIA DE NOTA: Dados dinâmicos e reais
                email: (window.pedido && window.pedido.cliente && window.pedido.cliente.email) 
                    ? window.pedido.cliente.email 
                    : "cliente@exemplo.com", // Substitua pelo campo real do seu formulário
                identification: {
                    type: tipoDoc, // Agora envia CPF ou CNPJ conforme a escolha
                    number: (window.pedido && window.pedido.cliente && window.pedido.cliente.cpf) ? window.pedido.cliente.cpf : ""
                }
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
    const inputDoc = document.getElementById('cpfCliente');
    const cpfLimpo = limparCPF(inputDoc.value);
    
    // PEGA O TIPO SELECIONADO NO MOMENTO DO CLIQUE
    const tipoDoc = document.querySelector('input[name="tipoDocumento"]:checked')?.value || "CPF";

    // VALIDAÇÃO DINÂMICA (SÊNIOR)
    if (tipoDoc === "CPF" && cpfLimpo.length !== 11) {
        alert("Por favor, digite um CPF válido com 11 dígitos.");
        inputDoc.focus();
        return;
    } 
    
    if (tipoDoc === "CNPJ" && cpfLimpo.length !== 14) {
        alert("Por favor, digite um CNPJ válido com 14 dígitos.");
        inputDoc.focus();
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
                    identification: { 
                        type: tipoDoc, // Envia "CPF" ou "CNPJ" para o Mercado Pago
                        number: cpfLimpo 
                    }
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