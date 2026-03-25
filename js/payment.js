import { pedido, metodoSelecionado, porcentagemPagamento } from './state.js';
import { calcularTotal } from './calculate.js';
import { CONFIG } from './config.js';
import { gerarMensagemWhatsCompleta, abrirWhatsApp } from './whatsapp.js';

// Variáveis de controle (Mantendo suas exportações originais)
export let paymentBrickController = null;
export let isRendering = false;
export let intervaloPix = null; 
export let mpInstance = null; 

// --- AUXILIARES DE VALIDAÇÃO (Sênior) ---
export function limparCPF(doc) { return doc.replace(/\D/g, ''); }

export function validarCPF(cpf) {
    cpf = limparCPF(cpf);
    if (cpf.length !== 11 || !!cpf.match(/(\d)\1{10}/)) return false;
    // Lógica simplificada: para um MVP, checar o tamanho já ajuda muito
    return true; 
}

export function validarCNPJ(cnpj) {
    cnpj = limparCPF(cnpj);
    return cnpj.length === 14;
}

export function obterMercadoPago() {
    if (mpInstance) return mpInstance;
    if (typeof window.MercadoPago === 'undefined') {
        console.error("❌ Erro: SDK do Mercado Pago não encontrado.");
        return null;
    }
    try {
        mpInstance = new window.MercadoPago(CONFIG.MP_PUBLIC_KEY, { locale: 'pt-BR' });
        console.log("💳 SDK Mercado Pago: Instância Singleton inicializada.");
        return mpInstance;
    } catch (e) {
        console.error("❌ Erro ao instanciar MP:", e);
        return null;
    }
}

export function prepararTrocaDeMetodo() {
    console.log("🔄 Resetando estados de pagamento e limpando registros...");
    
    if (window.intervaloPix) {
        clearInterval(window.intervaloPix);
        window.intervaloPix = null;
    }

    if (window.paymentBrickController) {
        try {
            window.paymentBrickController.unmount(); // ESTÁ AQUI! ✅
            window.paymentBrickController = null;
            console.log("🧹 Brick desmontado via prepararTrocaDeMetodo");
        } catch (e) {
            console.warn("Aviso ao desmontar Brick:", e);
        }
    }

    localStorage.removeItem('ultimo_pedido_id');
    localStorage.removeItem('dados_pix_resultado');
    localStorage.removeItem('metodo_pagamento');
}

export async function destruirInstanciasAnteriores() {
    // Chamamos a função de cima para garantir que o estado do PIX pare
    prepararTrocaDeMetodo();

    // E aqui limpamos o HTML fisicamente
    const container = document.getElementById('paymentBrick_container');
    if (container) {
        container.innerHTML = "";
    }
}

/**
 * Inicializa a lógica visual de troca CPF/CNPJ
 */
export function inicializarLogicaDocumento() {
    const inputDoc = document.getElementById('cpfCliente');
    const labelDoc = document.getElementById('labelDoc');
    const erroDoc = document.getElementById('erro-doc'); 
    const radios = document.querySelectorAll('input[name="tipoDocumento"]');

    if (!inputDoc || !radios.length) return;

    // 1. Lógica para alternar entre CPF e CNPJ
    radios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            inputDoc.value = ""; 
            if (erroDoc) erroDoc.style.display = "none";
            inputDoc.style.borderBottom = "1px solid #ccc";

            if (e.target.value === "CPF") {
                labelDoc.innerText = "CPF (Obrigatório para PIX) *";
                inputDoc.maxLength = 14;
                console.log("🚀 Modo CPF ativado");
            } else {
                labelDoc.innerText = "CNPJ (Obrigatório para PIX) *";
                inputDoc.maxLength = 18;
                console.log("🚀 Modo CNPJ ativado");
            }
        });
    });

    // 2. Validação de Formato ao sair do campo (Blur) - CÓDIGO SÊNIOR AQUI
    inputDoc.addEventListener('blur', () => {
        const tipoElement = document.querySelector('input[name="tipoDocumento"]:checked');
        if (!tipoElement) return;

        const tipo = tipoElement.value;
        // Step: Remove tudo que não é número ANTES de validar
        const valorLimpo = inputDoc.value.replace(/\D/g, ''); 
        
        let invalido = false;

        // Regra 1: Tamanho
        if (tipo === "CPF" && valorLimpo.length !== 11) invalido = true;
        if (tipo === "CNPJ" && valorLimpo.length !== 14) invalido = true;

        // Regra 2: Números Repetidos (Ex: 000.000.000-00)
        if (/^(\d)\1+$/.test(valorLimpo)) invalido = true;

        if (invalido && valorLimpo.length > 0) {
            // 1. Esconde a mensagem de texto fixa (para não encavalar no e-mail)
            if (erroDoc) erroDoc.style.display = "none";
            
            // 2. Avisa o cliente via pop-up (OK para fechar)
            alert(`⚠️ ${tipo} Inválido!\nPor favor, verifique os números digitados.`);
            
            // 3. Limpa o campo e foca nele novamente para correção
            inputDoc.value = "";
            inputDoc.style.borderBottom = "2px solid #e91e63";
            inputDoc.focus();
        } else {
            inputDoc.style.borderBottom = "1px solid #ccc";
        }
    });
}
window.inicializarLogicaDocumento = inicializarLogicaDocumento;


export async function inicializarCheckoutTransparente() {
    if (isRendering) return;
    isRendering = true;

    const container = document.getElementById('paymentBrick_container');
    if (!container || container.offsetWidth === 0) {
        console.warn("❌ Container inválido ou invisível.");
        isRendering = false;
        return;
    }

    const mp = obterMercadoPago();
    if (!mp) { isRendering = false; return; }

    await destruirInstanciasAnteriores(); 
    inicializarLogicaDocumento();

    // --- BUSCA DE VALORES (Garantindo que não venha null) ---
    const totalCalculado = parseFloat(localStorage.getItem('valor_final_pagamento')) || 0;
    
    // PRIORIDADE: 1. Global | 2. Storage | 3. Pix (Fallback)
    const metodoReal = window.metodoSelecionado || localStorage.getItem('metodo_pagamento') || 'pix';

    const radioPJ = document.getElementById("tipoPJ");
    const tipoDocAtivo = (radioPJ && radioPJ.checked) ? "CNPJ" : "CPF";
    
    // CORREÇÃO: O Mercado Pago espera 'individual' ou 'association'
    const entityType = (tipoDocAtivo === "CNPJ") ? "association" : "individual";

    console.log("🚀 Sênior Log - Renderizando com:", { valor: totalCalculado, metodo: metodoReal });

    const bricksBuilder = mp.bricks();
    const settings = {
        initialization: {
            amount: totalCalculado,
            payer: {
                email: document.getElementById('emailCliente')?.value || "cliente@exemplo.com",
                entity_type: entityType,
                identification: {
                    type: tipoDocAtivo,
                    number: limparCPF(document.getElementById('cpfCliente')?.value || "")
                }
            },
        },
        customization: {
            paymentMethods: {
                // SE FOR CARTÃO: Desativa Pix completamente (não envia nem array vazio)
                // SE FOR PIX: Ativa Pix e desativa Cartão
                bankTransfer: (metodoReal === 'pix') ? ['pix'] : undefined,
                creditCard: (metodoReal === 'credit_card') ? 'all' : undefined,
                debitCard: (metodoReal === 'debit_card') ? 'all' : undefined,
                maxInstallments: 4,
                types: {
                    excluded: ['debit_card']
                }    
            },
            visual: { 
                style: { theme: 'default' },
                preserveTargetOnNoResult: true 
            }
        },
        callbacks: {
            onFormMounted: error => {
                if (error) console.warn('Erro ao montar o formulário', error);
            },
            onReady: () => {
                console.log("✅ Brick visível na tela!");
                isRendering = false;
            },
            onError: (error) => {
                console.error("❌ Erro do SDK:", error);
                isRendering = false;
            },
            onSubmit: ({ formData }) => {
                const docValue = document.getElementById('cpfCliente')?.value || "";
                if (tipoDocAtivo === "CPF" && !validarCPF(docValue)) return alert("CPF Inválido!");
                
                enviarPagamentoAoBackend(formData, totalCalculado);
            },
        },
    };

    setTimeout(async () => {
        try {
            // Limpa o container antes de renderizar (Segurança extra)
            container.innerHTML = ""; 
            window.paymentBrickController = await bricksBuilder.create("payment", "paymentBrick_container", settings);
        } catch (e) {
            console.error("❌ Falha crítica ao criar Brick:", e);
            isRendering = false;
        }
    }, 150); // Aumentei um pouco o delay para o DOM respirar
}

export async function enviarPagamentoAoBackend(formData, totalCalculado) {
    const inputDoc = document.getElementById('cpfCliente');
    const cpfLimpo = limparCPF(inputDoc.value);
    const tipoDoc = document.querySelector('input[name="tipoDocumento"]:checked')?.value || "CPF";

    // Suas validações originais
    if (tipoDoc === "CPF" && cpfLimpo.length !== 11) {
        alert("Por favor, digite um CPF válido.");
        inputDoc.focus(); return;
    } 
    if (tipoDoc === "CNPJ" && cpfLimpo.length !== 14) {
        alert("Por favor, digite um CNPJ válido.");
        inputDoc.focus(); return;
    }

    const containerMP = document.getElementById("container-pagamento-mp");
    if (containerMP) containerMP.innerHTML = "<h3>⏳ Processando pagamento seguro...</h3>";

    try {
        const response = await fetch(`${CONFIG.API_URL}/processar-pagamento`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ...formData, // Spread para garantir que todos os dados do Brick vão
                transaction_amount: totalCalculado,
                description: "Pedido de Bolo - Dayane Bolos",
                external_reference: "PED-" + Date.now(), 
                cliente: {
                    nome: document.getElementById('nomeCliente').value,
                    email: document.getElementById('emailCliente').value,
                    telefone: document.getElementById('telefoneCliente').value,
                    cpf: cpfLimpo 
                }
            }),
        });

        const resultado = await response.json();

        if (resultado.status === 'approved') {
            finalizarSucessoCartao();
        } 
        else if (resultado.qr_code_base64 || resultado.status === 'pending') {
            exibirPainelPix(resultado);
        }
    } catch (err) {
        console.error("Erro fatal:", err);
        alert("Erro de conexão.");
    }
}

// Funções de apoio separadas para clareza
function finalizarSucessoCartao() {
    const msg = "Oi! Meu pagamento foi aprovado. Pode conferir?";
    localStorage.removeItem('carrinho_dayane');
    window.location.href = `sucesso.html?whatsapp=https://wa.me/5534996360443?text=${encodeURIComponent(msg)}`;
}

function exibirPainelPix(resultado) {
    localStorage.setItem('ultimo_pedido_id', resultado.id);
    localStorage.setItem('dados_pix_resultado', JSON.stringify(resultado));
    
    const containerMP = document.getElementById("container-pagamento-mp");
    if (containerMP) containerMP.style.display = "none";
    document.getElementById("pix-container").style.display = "flex";

    setTimeout(() => {
        document.getElementById("pix-qr-img").src = `data:image/png;base64,${resultado.qr_code_base64}`;
        document.getElementById("pix-copia-e-cola").value = resultado.qr_code;
        verificarStatusPagamento(resultado.id);
    }, 200);
}

export function verificarStatusPagamento(paymentId) { 
    if (window.intervaloPix) clearInterval(window.intervaloPix);

    window.intervaloPix = setInterval(async () => {
        try {
            const response = await fetch(`${CONFIG.API_URL}/consultar-pagamento/${paymentId}`);
            const statusData = await response.json();

            if (statusData.status === 'approved') {
                clearInterval(window.intervaloPix);
                const pedidoRecuperado = JSON.parse(localStorage.getItem('pedido_salvo_para_automacao'));
                const msg = gerarMensagemWhatsCompleta(pedidoRecuperado);
                abrirWhatsApp("34996360443", msg);
                
                localStorage.clear();
                window.location.href = "sucesso.html";
            }
        } catch (err) { console.error("Erro consulta:", err); }
    }, 4000);
}

window.verificarStatusPagamento = verificarStatusPagamento;