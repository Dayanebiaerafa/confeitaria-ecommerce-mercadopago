// ====== VARIÁVEIS DE CONTROLE GLOBAL ======
export let porcentagemPagamento = 1.0; // 1.0 = 100%, 0.5 = 50%
export let metodoSelecionado = '';    
export let etapaAtual = 0;

// ====== OBJETO PRINCIPAL DO PEDIDO ======
export const pedido = {
    pesoKg: 0,
    massa: null,
    recheios: [],
    complemento: null,
    formato: '',
    modelo: null,
    doces: [],
    corForminhas: "",
    valorDoce: 0,
    topo: false,
    valorTopo: 0,
    nomeTopo: "",
    idadeTopo: "",
    obsTopo: "",
    embalagem: false,
    valorEmbalagem: 0,
    observacao: "",
    preferenciaPeso: null,
    valorTotal: 0, // Campo essencial para os cálculos de exibição

    cliente: {
        nome: "",
        telefone: "",
        email: "",
        entrega: "retirada",
        endereco: "",
        data: "",
        horario: ""
    },
    pagamento: {
        metodo: null,      // 'pix' ou 'credit_card'
        porcentagem: 1.0,  // 0.5 ou 1.0
        valorPago: 0       // Valor exato enviado ao MP
    }
};

// ====== FUNÇÕES DE ATUALIZAÇÃO DE ESTADO ======
export function setEtapaAtual(novoValor) {
    etapaAtual = novoValor;
}

export function setPorcentagemPagamento(valor) {
    porcentagemPagamento = valor;
}

// Adicione ao final do state.js
export function setMetodoSelecionado(valor) {
    metodoSelecionado = valor;
}

export function excluirItemPedido(tipo) {
    if (tipo === 'topo') {
        pedido.topo = false;
        pedido.nomeTopo = "";
        pedido.idadeTopo = "";
        pedido.obsTopo = "";
        pedido.valorTopo = 0;
    } 
    else if (tipo === 'embalagem') {
        pedido.embalagem = false;
        pedido.valorEmbalagem = 0;
    } 
    else if (tipo === 'bolo' || tipo === 'modelo') {
        pedido.massa = null;
        pedido.recheios = [];
        pedido.complemento = null;
        pedido.pesoKg = 0;
        pedido.modelo = null;
    }

    // AQUI ESTÁ O SEGREDO: Chama as duas atualizações
    import('./ui-updates.js').then(m => {
        m.resetarBotoesVisualmente(tipo);
        m.atualizarDadosCarrinho();
    });
    
    import('./calculate.js').then(m => m.atualizarTudo());
}