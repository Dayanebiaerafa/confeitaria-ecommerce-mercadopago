const Salvo = localStorage.getItem("carrinho_dayane");
const pedidoRecuperado = Salvo ? JSON.parse(Salvo) : null;
export let etapaAtual = 0;

export let metodoSelecionado =
  pedidoRecuperado?.pagamento?.metodo ||
  localStorage.getItem("metodo_pagamento") ||
  null;
export let porcentagemPagamento =
  pedidoRecuperado?.pagamento?.porcentagem || 1.0;

// ====== OBJETO PRINCIPAL DO PEDIDO ======
export let pedido = pedidoRecuperado || {
  cliente: {
    nome: "",
    telefone: "",
    email: "",
    cpf: "",
    data: "",
    horario: "",
    entrega: "retirada",
    endereco: "",
  },
 
  tipo: "", 
  modelo: null, 
  pesoKg: 0,
  massa: "",
  recheios: [],
  complemento: null,
  formato: "",
  itens: [],


  topo: false,
  nomeTopo: "",
  idadeTopo: "",
  obsTopo: "",
  embalagem: false,
  valorTopo: 0,
  valorEmbalagem: 0,

 
  doces: [], 
  corForminhas: "",
  valorDoce: 0,


  observacao: "",
  preferenciaPeso: "Pode variar",


  pagamento: {
    metodo: null,
    porcentagem: 1.0,
    pixPendente: false,
  },

  subtotal: 0,
  valorPago: 0,
  valorTotal: 0,
};


if (Salvo) {
  const m = pedido.pagamento?.metodo || pedido.metodoPagamento;
  const p = pedido.pagamento?.porcentagem || pedido.porcentagemPagamento;

  if (m) {
    metodoSelecionado = m;
    if (!pedido.pagamento) pedido.pagamento = {};
    pedido.pagamento.metodo = m;
  }

  if (p !== undefined && p !== null) {
    porcentagemPagamento = p;
    if (!pedido.pagamento) pedido.pagamento = {};
    pedido.pagamento.porcentagem = p;
  }

 
  window.metodoSelecionado = metodoSelecionado;
  window.porcentagemPagamento = porcentagemPagamento;

  console.log("✅ Estado sincronizado:", { metodo: m, porcentagem: p });
}
export function excluirItemPedido(tipo) {
  if (tipo === "topo") {
    pedido.topo = false;
    pedido.nomeTopo = "";
    pedido.idadeTopo = "";
    pedido.obsTopo = "";
    pedido.valorTopo = 0;
  } else if (tipo === "embalagem") {
    pedido.embalagem = false;
    pedido.valorEmbalagem = 0;
  } else if (tipo === "bolo" || tipo === "modelo") {
    pedido.massa = null;
    pedido.recheios = [];
    pedido.complemento = null;
    pedido.pesoKg = 0;
    pedido.modelo = null;
  }


  import("/static/js/ui-updates.js").then((m) => {
    m.resetarBotoesVisualmente(tipo);
    m.atualizarDadosCarrinho();
  });

  import("/static/js/calculate.js").then((m) => m.atualizarTudo());
}


export function adicionarDoceAoPedido(novoDoce) {
  const index = pedido.doces.findIndex((d) => d.nome === novoDoce.nome);

  if (index > -1) {
   
    pedido.doces[index].qtd += novoDoce.quantidade || 25;
    pedido.doces[index].valor =
      pedido.doces[index].qtd * pedido.doces[index].precoUnit;
  } else {
    pedido.doces.push({
      nome: novoDoce.nome,
      qtd: novoDoce.quantidade,
      valor: novoDoce.valor,
      precoUnit: novoDoce.valor / novoDoce.quantidade,
    });
  }
}


export function resetarDadosBolo() {
  pedido.pesoKg = 0;
  pedido.massa = "";
  pedido.recheios = [];
  pedido.complemento = null;
  pedido.modelo = null;
  pedido.tipo = "";
}

export function setEtapaAtual(n) {
  etapaAtual = n;
}

export function removerDoceDoPedido(nomeDoce) {
  pedido.doces = pedido.doces.filter((d) => d.nome !== nomeDoce);
  import("/static/js/calculate.js").then((m) => m.atualizarTudo());
  import("/static/js/ui-updates.js").then((m) => m.atualizarDadosCarrinho());
}

export function salvarNoLocalStorage() {
  localStorage.setItem("carrinho_dayane", JSON.stringify(pedido));
}


export function excluirItemSacola(index) {
 
  if (pedido.itens && pedido.itens[index]) {
    pedido.itens.splice(index, 1);
  }

 
  salvarNoLocalStorage();

  
  import("/static/js/calculate.js").then((m) => m.atualizarTudo());
  import("/static/ui-updates.js").then((m) => m.atualizarDadosCarrinho());
}




export function setMetodoSelecionado(valor) {
  window.metodoSelecionado = valor; 
  localStorage.setItem("metodo_pagamento", valor); 

  if (typeof pedido !== "undefined") {
    if (!pedido.pagamento) pedido.pagamento = {};
    pedido.pagamento.metodo = valor;

   
    salvarNoLocalStorage();
  }
  console.log(`✅ ESTADO SINCRONIZADO: ${valor}`);
}

export function setPorcentagemPagamento(valor) {
  porcentagemPagamento = valor; 
  window.porcentagemPagamento = valor; 

  if (!pedido.pagamento) pedido.pagamento = {};
  pedido.pagamento.porcentagem = valor; 

}
