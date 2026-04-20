import { pedido, metodoSelecionado, porcentagemPagamento } from "/static/js/state.js";
import { calcularTotal } from "/static/js/calculate.js";
import { CONFIG } from "/static/js/config.js";
import { gerarMensagemWhatsCompleta, abrirWhatsApp } from "./whatsapp.js";


export let paymentBrickController = null;
export let isRendering = false;
export let intervaloPix = null;
export let mpInstance = null;

export function limparCPF(doc) {
  return doc.replace(/\D/g, "");
}

export function validarCPF(cpf) {
  cpf = limparCPF(cpf);
  if (cpf.length !== 11 || !!cpf.match(/(\d)\1{10}/)) return false;
  
  return true;
}

export function validarCNPJ(cnpj) {
  cnpj = limparCPF(cnpj);
  return cnpj.length === 14;
}

export function obterMercadoPago() {
  if (mpInstance) return mpInstance;
  if (typeof window.MercadoPago === "undefined") {
    console.error("❌ Erro: SDK do Mercado Pago não encontrado.");
    return null;
  }
  try {
    mpInstance = new window.MercadoPago(CONFIG.MP_PUBLIC_KEY, {
      locale: "pt-BR",
    });
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
      window.paymentBrickController.unmount(); 
      window.paymentBrickController = null;
      console.log("🧹 Brick desmontado via prepararTrocaDeMetodo");
    } catch (e) {
      console.warn("Aviso ao desmontar Brick:", e);
    }
  }

  localStorage.removeItem("ultimo_pedido_id");
  localStorage.removeItem("dados_pix_resultado");
  localStorage.removeItem("metodo_pagamento");
}

export async function destruirInstanciasAnteriores() {

  prepararTrocaDeMetodo();

 
  const container = document.getElementById("paymentBrick_container");
  if (container) {
    container.innerHTML = "";
  }
}


export function inicializarLogicaDocumento() {
  const inputDoc = document.getElementById("cpfCliente");
  const labelDoc = document.getElementById("labelDoc");
  const erroDoc = document.getElementById("erro-doc");
  const radios = document.querySelectorAll('input[name="tipoDocumento"]');

  if (!inputDoc || !radios.length) return;


  radios.forEach((radio) => {
    radio.addEventListener("change", (e) => {
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

 
  inputDoc.addEventListener("blur", () => {
    const tipoElement = document.querySelector(
      'input[name="tipoDocumento"]:checked',
    );
    if (!tipoElement) return;

    const tipo = tipoElement.value;
   
    const valorLimpo = inputDoc.value.replace(/\D/g, "");

    let invalido = false;

  
    if (tipo === "CPF" && valorLimpo.length !== 11) invalido = true;
    if (tipo === "CNPJ" && valorLimpo.length !== 14) invalido = true;

 
    if (/^(\d)\1+$/.test(valorLimpo)) invalido = true;

    if (invalido && valorLimpo.length > 0) {
      
      if (erroDoc) erroDoc.style.display = "none";

     
      alert(`⚠️ ${tipo} Inválido!\nPor favor, verifique os números digitados.`);

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

  const container = document.getElementById("paymentBrick_container");
  if (!container || container.offsetWidth === 0) {
    console.warn("❌ Container inválido ou invisível.");
    isRendering = false;
    return;
  }

  const mp = obterMercadoPago();
  if (!mp) {
    isRendering = false;
    return;
  }

  await destruirInstanciasAnteriores();
  inicializarLogicaDocumento();


  const totalCalculado = parseFloat(localStorage.getItem("valor_final_pagamento")) || 0;

  const metodoReal = window.metodoSelecionado || localStorage.getItem("metodo_pagamento") || "pix";

  const radioPJ = document.getElementById("tipoPJ");
  const tipoDocAtivo = radioPJ && radioPJ.checked ? "CNPJ" : "CPF";
  const entityType = (tipoDocAtivo === "CNPJ") ? "association" : "individual";

  console.log("DEBUG MOBILE DOC:", { tipoDocAtivo, entityType });
  console.log("🚀 Sênior Log - Renderizando com:", { valor: totalCalculado, metodo: metodoReal });

  const bricksBuilder = mp.bricks();
  
  const settings = {
    initialization: {
      amount: totalCalculado,
      payer: {
        email: document.getElementById("emailCliente")?.value || "cliente@exemplo.com",
        entity_type: entityType,
        identification: {
          type: tipoDocAtivo,
          number: limparCPF(document.getElementById("cpfCliente")?.value || ""),
        },
      },
    },
    customization: {
      paymentMethods: {
        bankTransfer: metodoReal === "pix" ? ["pix"] : undefined,
        creditCard: metodoReal === "credit_card" ? "all" : undefined,
        debitCard: metodoReal === "debit_card" ? "all" : undefined,
        maxInstallments: 4, 
      },
      
      installments: 1,
      visual: {
        style: { theme: "default" },
      },
    }, 
    callbacks: {
      onFormMounted: (error) => {
        if (error) console.warn("Erro ao montar o formulário", error);
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
        const docValue = document.getElementById("cpfCliente")?.value || "";
        if (tipoDocAtivo === "CPF" && !validarCPF(docValue)) return alert("CPF Inválido!");
        enviarPagamentoAoBackend(formData, totalCalculado);
      },
    },
  };

  setTimeout(async () => {
    try {
      container.innerHTML = "";
      window.paymentBrickController = await bricksBuilder.create(
        "payment",
        "paymentBrick_container",
        settings
      );
    } catch (e) {
      console.error("❌ Falha crítica ao criar Brick:", e);
      isRendering = false;
    }
  }, 150);
}

export async function enviarPagamentoAoBackend(formData, totalCalculado) {

  const inputDoc = document.getElementById("cpfCliente");
  const nomeCli = document.getElementById("nomeCliente");
  const emailCli = document.getElementById("emailCliente");
  
  if (!inputDoc || !nomeCli) {
    console.error("❌ Erro Sênior: Elementos do formulário não encontrados no DOM.");
    return;
  }

  const cpfLimpo = limparCPF(inputDoc.value);
  const tipoDoc = document.querySelector('input[name="tipoDocumento"]:checked')?.value || "CPF";

 
  if (tipoDoc === "CPF" && cpfLimpo.length !== 11) {
    alert("Por favor, digite um CPF válido.");
    inputDoc.focus();
    return;
  }


  const containerMP = document.getElementById("container-pagamento-mp");
  if (containerMP) {
    containerMP.innerHTML = "<h3>⏳ Processando pagamento seguro...</h3>";
  }

  try {
    
    const urlFinal = (typeof CONFIG !== 'undefined' && CONFIG.API_URL) 
      ? `${CONFIG.API_URL}/processar-pagamento` 
      : '/processar-pagamento';

    console.log("🚀 Disparando fetch para:", urlFinal);

    const response = await fetch(urlFinal, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Accept": "application/json" 
      },
      body: JSON.stringify({
        ...formData,
        transaction_amount: totalCalculado,
        description: "Pedido de Bolo - Dayane Bolos",
        external_reference: "PED-" + Date.now(),
        cliente: {
          nome: nomeCli.value,
          email: emailCli?.value || "cliente@exemplo.com",
          telefone: document.getElementById("telefoneCliente")?.value || "",
          cpf: cpfLimpo,
        },
      }),
    });

   
    if (!response.ok) {
        const erroTexto = await response.text();
        throw new Error(`Erro no Servidor (${response.status}): ${erroTexto}`);
    }

    const resultado = await response.json();
    console.log("✅ Resposta do Backend:", resultado);

    if (resultado.status === "approved") {
      finalizarSucessoCartao();
    } else if (resultado.qr_code_base64 || resultado.status === "pending") {
      exibirPainelPix(resultado);
    } else {
      alert("Pagamento não aprovado. Verifique os dados ou saldo.");
    
      location.reload(); 
    }
  } catch (err) {
    console.error("❌ Erro fatal no envio:", err);
    alert("Erro de conexão ou erro interno no servidor.");
    if (containerMP) containerMP.innerHTML = ""; 
  }
}
// Funções de apoio separadas para clareza
function finalizarSucessoCartao() {
  const msg = "Oi! Meu pagamento foi aprovado. Pode conferir?";
  localStorage.removeItem("carrinho_dayane");
  window.location.href = `/sucesso?whatsapp=https://wa.me/5534996360443?text=${encodeURIComponent(msg)}`;
}

function exibirPainelPix(resultado) {
  localStorage.setItem("ultimo_pedido_id", resultado.id);
  localStorage.setItem("dados_pix_resultado", JSON.stringify(resultado));

  const containerMP = document.getElementById("container-pagamento-mp");
  if (containerMP) containerMP.style.display = "none";
  document.getElementById("pix-container").style.display = "flex";

  setTimeout(() => {
    document.getElementById("pix-qr-img").src =
      `data:image/png;base64,${resultado.qr_code_base64}`;
    document.getElementById("pix-copia-e-cola").value = resultado.qr_code;
    verificarStatusPagamento(resultado.id);
  }, 200);
}

export function verificarStatusPagamento(paymentId) {
  if (window.intervaloPix) clearInterval(window.intervaloPix);

  window.intervaloPix = setInterval(async () => {
    try {
      const response = await fetch(
        `${CONFIG.API_URL}/consultar-pagamento/${paymentId}`,
      );
      const statusData = await response.json();

      if (statusData.status === "approved") {
        clearInterval(window.intervaloPix);
        const pedidoRecuperado = JSON.parse(
          localStorage.getItem("pedido_salvo_para_automacao"),
        );
        const msg = gerarMensagemWhatsCompleta(pedidoRecuperado);
        abrirWhatsApp("34996360443", msg);

        localStorage.clear();
        window.location.href = "/sucesso";
      }
    } catch (err) {
      console.error("Erro consulta:", err);
    }
  }, 4000);
}

window.verificarStatusPagamento = verificarStatusPagamento;
