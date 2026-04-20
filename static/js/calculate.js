import { pedido, salvarNoLocalStorage } from "/static/js/state.js";
import { atualizarContadorSacola } from "/static/js/ui-updates.js";
import * as config from "/static/js/config.js"; 


export function calcularTotal(item, tipoPagina) {
  let precoBaseKg = 0;
  let totalGeral = 0; 

  if (tipoPagina === "corte") {
    precoBaseKg = config.PRECO_CORTE;
  } else if (tipoPagina === "personalizado") {
    precoBaseKg = config.PRECO_PERSONALIZADO;
  } else if (tipoPagina === "pedido") {
    precoBaseKg = config.PRECO_POR_KG;
  } else {
    precoBaseKg = item.modelo ? config.PRECO_PERSONALIZADO : config.PRECO_CORTE;
  }

  const peso = parseFloat(item.pesoKg) || 0;
  let valorIndividualDesteItem = peso * precoBaseKg;


  const temAdicional =
    item.recheios?.some((r) => r.includes("Nutella")) ||
    (item.complemento && item.complemento.includes("Geleia"));

  if (temAdicional) {
    valorIndividualDesteItem += config.ADICIONAL_NUTELLA_GELEIA * peso;
  }

  if (item.topo) {
    const tipoDoTopo =
      item.topoTipo ||
      (tipoPagina === "personalizado" ? "personalizado" : "padrao");

    valorIndividualDesteItem +=
      tipoDoTopo === "personalizado"
        ? config.VALOR_TOPO_PERSONALIZADO
        : config.VALOR_TOPO_PADRAO;
  }


  if (item.embalagem) valorIndividualDesteItem += config.PRECO_EMBALAGEM;

  pedido.itens.forEach((it) => {
    totalGeral += it.valorIndividual || 0;
  });

 
  if (peso > 0) {
    totalGeral += valorIndividualDesteItem;
  }

 
  if (pedido.doces) {
    pedido.doces.forEach((doce) => {
      totalGeral += doce.valor || 0;
    });
  }


  pedido.valorTotal = totalGeral;

  const displayTotal = document.getElementById("valorTotalRodape");
  if (displayTotal) {
    displayTotal.innerText = `R$ ${totalGeral.toFixed(2).replace(".", ",")}`;
  }

  
  return valorIndividualDesteItem;
}

export function atualizarTudo() {
  const paginaAtual = document.body.getAttribute("data-pagina");
  const camposTopoHTML = document.getElementById("campos-topo");

  if (camposTopoHTML) {
    if (pedido.topo && paginaAtual === "personalizado") {
      camposTopoHTML.style.display = "block";
    } else {
      camposTopoHTML.style.display = "none";
    }
  }
  
  if (!pedido.topo) {
    pedido.nomeTopo = "";
    pedido.idadeTopo = "";
    pedido.obsTopo = "";
  }

  const containerInputsTopo = document.getElementById("campos-topo");
  if (containerInputsTopo && paginaAtual !== "personalizado") {
  }

  const valorRascunhoAtual =
    pedido.pesoKg > 0 ? calcularValorApenasDesteBolo() : 0;


  const totalSacola = (pedido.itens || []).reduce((acc, item) => {
    return acc + (item.valorIndividual || 0);
  }, 0);

 
  const totalDoces = (pedido.doces || []).reduce(
    (acc, d) => acc + (d.valor || 0),
    0,
  );

 
  pedido.valorTotal = valorRascunhoAtual + totalSacola + totalDoces;

 
  const porc = window.porcentagemPagamento || parseFloat(localStorage.getItem("porcentagem_salva")) || 1.0;
  
  pedido.valorPago = pedido.valorTotal * porc;


  const valorParaSalvar = pedido.valorPago.toFixed(2);
  localStorage.setItem("valor_final_pagamento", valorParaSalvar);
  
  console.log("💾 Storage Atualizado:", valorParaSalvar);

 
  if (window.paymentBrickController) {
      window.paymentBrickController.update({
          amount: parseFloat(valorParaSalvar)
      });
  }


  if (!pedido.pagamento) pedido.pagamento = {};
  pedido.pagamento.porcentagem = porc;
  pedido.pagamento.metodo = window.metodoSelecionado || pedido.pagamento.metodo;
  
  const totalFormatado = pedido.valorTotal.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

 
  const idsParaAtualizar = [
    "valorTotalDoces",
    "valorTotalPersonalizado",
    "valorTotalCorte",
    "valorTotalPedido",
    "valorTotalRodape",
    "valorTotalResumo",
  ];

  idsParaAtualizar.forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.innerText = totalFormatado;
  });

  salvarNoLocalStorage();
  if (typeof atualizarContadorSacola === "function") atualizarContadorSacola();
}


export function calcularValorApenasDesteBolo() {
  const peso = parseFloat(pedido.pesoKg) || 0;
  const tipoPagina = document.body.getAttribute("data-pagina") || "pedido";

  if (peso <= 0) return 0;

  // 1. Preço Base
  let precoKg = config.PRECO_POR_KG;
  if (tipoPagina === "corte") precoKg = config.PRECO_CORTE;
  if (tipoPagina === "personalizado") precoKg = config.PRECO_PERSONALIZADO;

  
  const temEspecial = pedido.recheios?.some(
    (r) =>
      r.toLowerCase().includes("nutella") || r.toLowerCase().includes("geleia"),
  );
  if (temEspecial) precoKg += config.ADICIONAL_NUTELLA_GELEIA;

  let totalBolo = peso * precoKg;

  
  if (pedido.topo) {
    if (tipoPagina === "personalizado") {
      totalBolo += config.VALOR_TOPO_PERSONALIZADO;
      pedido.topoTipo = "personalizado";
    } else {
      totalBolo += config.VALOR_TOPO_PADRAO; 
      pedido.topoTipo = "padrao"; 
    }
  }

  if (pedido.embalagem) totalBolo += config.PRECO_EMBALAGEM;

  return totalBolo;
}
