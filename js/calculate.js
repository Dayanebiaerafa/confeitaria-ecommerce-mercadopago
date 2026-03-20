import { pedido, salvarNoLocalStorage } from "./state.js";
import { atualizarContadorSacola } from "./ui-updates.js";
import * as config from "./config.js"; // Importa tudo do config

// ====== 2. FUNÇÃO DE CÁLCULO TOTAL (Ajustada para não ignorar o bolo) ======
export function calcularTotal(item, tipoPagina) {
  let precoBaseKg = 0;
  let totalGeral = 0; // Criada corretamente aqui (resolve o erro de undefined)

  // 1. DEFINIÇÃO DO PREÇO BASE (Bolo sendo montado)
  if (tipoPagina === "corte") {
    precoBaseKg = config.PRECO_CORTE;
  } else if (tipoPagina === "personalizado") {
    precoBaseKg = config.PRECO_PERSONALIZADO;
  } else if (tipoPagina === "pedido") {
    precoBaseKg = config.PRECO_POR_KG;
  } else {
    precoBaseKg = item.modelo ? config.PRECO_PERSONALIZADO : config.PRECO_CORTE;
  }

  // 2. CÁLCULO DO VALOR DESTE ITEM ESPECÍFICO
  const peso = parseFloat(item.pesoKg) || 0;
  let valorIndividualDesteItem = peso * precoBaseKg;

  // Regra: Adicional Nutella/Geleia por KG
  const temAdicional =
    item.recheios?.some((r) => r.includes("Nutella")) ||
    (item.complemento && item.complemento.includes("Geleia"));

  if (temAdicional) {
    valorIndividualDesteItem += config.ADICIONAL_NUTELLA_GELEIA * peso;
  }

  // Regra: Topos (NA FUNÇÃO calcularTotal)
  if (item.topo) {
    // Se o item JÁ TEM um topoTipo salvo (ex: "personalizado"), usamos ele.
    // Se não tiver, verificamos a página.
    const tipoDoTopo =
      item.topoTipo ||
      (tipoPagina === "personalizado" ? "personalizado" : "padrao");

    valorIndividualDesteItem +=
      tipoDoTopo === "personalizado"
        ? config.VALOR_TOPO_PERSONALIZADO
        : config.VALOR_TOPO_PADRAO;
  }

  // Regra: Embalagem
  if (item.embalagem) valorIndividualDesteItem += config.PRECO_EMBALAGEM;

  // --- AQUI VEM O PULO DO GATO DO SÊNIOR ---

  // 3. SOMA DE TODOS OS ITENS DA SACOLA (Para o Rodapé)
  // Somamos o que já está na sacola
  pedido.itens.forEach((it) => {
    totalGeral += it.valorIndividual || 0;
  });

  // Somamos o rascunho do bolo atual que ainda não "entrou" na sacola oficialmente
  // apenas se ele tiver peso definido
  if (peso > 0) {
    totalGeral += valorIndividualDesteItem;
  }

  // Somamos os doces (caso ainda use o array separado)
  if (pedido.doces) {
    pedido.doces.forEach((doce) => {
      totalGeral += doce.valor || 0;
    });
  }

  // 4. ATUALIZAÇÃO DA INTERFACE
  pedido.valorTotal = totalGeral;

  const displayTotal = document.getElementById("valorTotalRodape");
  if (displayTotal) {
    displayTotal.innerText = `R$ ${totalGeral.toFixed(2).replace(".", ",")}`;
  }

  // Retornamos o valor do BOLO atual (para funções que precisam apenas do preço dele)
  return valorIndividualDesteItem;
}
// ====== 3. ATUALIZAÇÃO DA INTERFACE ======
// SUBSTITUA seu atualizarTudo por esta versão mais "Blindada"
export function atualizarTudo() {
  const paginaAtual = document.body.getAttribute("data-pagina");
  const camposTopoHTML = document.getElementById("campos-topo");

  if (camposTopoHTML) {
    // Regra: Os inputs de NOME/IDADE só devem aparecer se:
    // 1. O usuário clicou em "SIM" (pedido.topo === true)
    // 2. A página atual é "personalizado"
    if (pedido.topo && paginaAtual === "personalizado") {
      camposTopoHTML.style.display = "block";
    } else {
      // Em qualquer outra página (como 'corte'), mesmo que pedido.topo seja true,
      // escondemos os inputs de texto, pois o topo é padrão/simples.
      camposTopoHTML.style.display = "none";
    }
  }
  // 2. REGRA SÊNIOR: Se não houver topo selecionado, limpamos os textos para não lixar o pedido
  if (!pedido.topo) {
    pedido.nomeTopo = "";
    pedido.idadeTopo = "";
    pedido.obsTopo = "";
  }

  // 3. REGRA DE EXIBIÇÃO: Se estivermos em uma página que NÃO é a 'personalizado'
  // mas o elemento de inputs do topo existir, escondemos ele se o seu sistema
  // exigir que nome/idade seja só no personalizado.
  const containerInputsTopo = document.getElementById("campos-topo");
  if (containerInputsTopo && paginaAtual !== "personalizado") {
  }
  // 1. Calcula o valor do que o usuário está mexendo AGORA (Rascunho)
  const valorRascunhoAtual =
    pedido.pesoKg > 0 ? calcularValorApenasDesteBolo() : 0;

  // 2. Valor de quem JÁ ESTÁ na sacola
  const totalSacola = (pedido.itens || []).reduce((acc, item) => {
    return acc + (item.valorIndividual || 0);
  }, 0);

  // 3. Valor dos DOCES
  const totalDoces = (pedido.doces || []).reduce(
    (acc, d) => acc + (d.valor || 0),
    0,
  );

  // 4. SOMA FINAL: Rascunho + Sacola + Doces
  pedido.valorTotal = valorRascunhoAtual + totalSacola + totalDoces;

  // 5. Formatação
  const porc = window.porcentagemPagamento || 1.0;
  pedido.valorPago = pedido.valorTotal * porc;

  localStorage.setItem('valor_final_pagamento', pedido.valorPago.toFixed(2));
  console.log("💾 Storage Atualizado via atualizarTudo:", pedido.valorPago.toFixed(2));

  // Garante que o objeto pagamento esteja sincronizado
  if (!pedido.pagamento) pedido.pagamento = {};
  pedido.pagamento.porcentagem = porc;
  pedido.pagamento.metodo = window.metodoSelecionado || pedido.pagamento.metodo;
  // --- FIM DA CORREÇÃO SÊNIOR ---

  // 6. Formatação
  const totalFormatado = pedido.valorTotal.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

  // 6. Atualiza todos os IDs de preço na tela
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

  // 7. Sincronização e UI
  salvarNoLocalStorage();
  if (typeof atualizarContadorSacola === "function") atualizarContadorSacola();
}

// Importe as constantes do seu arquivo de config
// import { PRECO_POR_KG, PRECO_CORTE, PRECO_PERSONALIZADO, VALOR_TOPO_PERSONALIZADO, VALOR_TOPO_PADRAO, PRECO_EMBALAGEM, ADICIONAL_NUTELLA_GELEIA } from './config.js';

export function calcularValorApenasDesteBolo() {
  const peso = parseFloat(pedido.pesoKg) || 0;
  const tipoPagina = document.body.getAttribute("data-pagina") || "pedido";

  if (peso <= 0) return 0;

  // 1. Preço Base
  let precoKg = config.PRECO_POR_KG;
  if (tipoPagina === "corte") precoKg = config.PRECO_CORTE;
  if (tipoPagina === "personalizado") precoKg = config.PRECO_PERSONALIZADO;

  // 2. Adicionais por KG (Sincronizado com a outra função)
  const temEspecial = pedido.recheios?.some(
    (r) =>
      r.toLowerCase().includes("nutella") || r.toLowerCase().includes("geleia"),
  );
  if (temEspecial) precoKg += config.ADICIONAL_NUTELLA_GELEIA;

  let totalBolo = peso * precoKg;

  // 3. REGRA DO TOPO (Ajustada para nunca dar erro)
  // 3. REGRA DO TOPO (Ajuste Exato)
  if (pedido.topo) {
    // Se a página for 'personalizado', cobra 30.
    // Para QUALQUER outra (corte, pedido, etc), cobra 20.
    if (tipoPagina === "personalizado") {
      totalBolo += config.VALOR_TOPO_PERSONALIZADO; // 30
      pedido.topoTipo = "personalizado"; // Sincroniza o estado
    } else {
      totalBolo += config.VALOR_TOPO_PADRAO; // 20
      pedido.topoTipo = "padrao"; // Sincroniza o estado
    }
  }

  // 4. Embalagem
  if (pedido.embalagem) totalBolo += config.PRECO_EMBALAGEM;

  return totalBolo;
}
