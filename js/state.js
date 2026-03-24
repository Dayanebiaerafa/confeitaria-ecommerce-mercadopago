const Salvo = localStorage.getItem('carrinho_dayane');
const pedidoRecuperado = Salvo ? JSON.parse(Salvo) : null;
export let etapaAtual = 0;
// SÊNIOR: Se existe algo no storage, usamos o que está lá. Se não, usamos o padrão.
export let metodoSelecionado = pedidoRecuperado?.pagamento?.metodo || null;  
export let porcentagemPagamento = pedidoRecuperado?.pagamento?.porcentagem || 1.0; 

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
    // Dados do Bolo (Personalizado, Corte ou Tradicional)
    tipo: "", // 'personalizado', 'corte', 'tradicional'
    modelo: null, // URL da imagem ou nome do modelo
    pesoKg: 0,
    massa: "",
    recheios: [],
    complemento: null,
    formato: '',
    itens: [],
     
    // Adicionais
    topo: false,
    nomeTopo: "",
    idadeTopo: "",
    obsTopo: "",
    embalagem: false,
    valorTopo: 0,
    valorEmbalagem: 0,
    
    // Doces
    doces: [], // Array de objetos {nome, qtd, valor, precoUnit}
    corForminhas: "",
    valorDoce: 0,

    // Pagamento e Valores
    observacao: "",
    preferenciaPeso: "Pode variar",
    
    // O GRUPO TEM QUE SER ASSIM:
    pagamento: {
        metodo: null,
        porcentagem: 1.0,
        pixPendente: false
    },
    
    subtotal: 0,
    valorPago: 0,
    valorTotal: 0
};

// ... código existente (pedidoRecuperado, etc)

if (Salvo) {
    // SÊNIOR: Tenta buscar do lugar novo (pagamento.porcentagem) 
    // OU do lugar antigo (porcentagemPagamento) caso tenha sobrado lixo no storage
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
    
    // Sincroniza com o window
    window.metodoSelecionado = metodoSelecionado;
    window.porcentagemPagamento = porcentagemPagamento;

    console.log("✅ Estado sincronizado:", { metodo: m, porcentagem: p });
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


// Função para adicionar doce sem duplicar o item (apenas soma se já existir)
export function adicionarDoceAoPedido(novoDoce) {
    const index = pedido.doces.findIndex(d => d.nome === novoDoce.nome);
    
    if (index > -1) {
        // SOMAR em vez de substituir para não perder a contagem anterior
        pedido.doces[index].qtd += (novoDoce.quantidade || 25); 
        pedido.doces[index].valor = pedido.doces[index].qtd * pedido.doces[index].precoUnit;
    } else {
        pedido.doces.push({
            nome: novoDoce.nome,
            qtd: novoDoce.quantidade,
            valor: novoDoce.valor,
            precoUnit: novoDoce.valor / novoDoce.quantidade
        });
    }
}

// Função para resetar partes específicas ao excluir
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
// Função para remover um doce específico (caso o cliente desista)
export function removerDoceDoPedido(nomeDoce) {
    pedido.doces = pedido.doces.filter(d => d.nome !== nomeDoce);
    import('./calculate.js').then(m => m.atualizarTudo());
    import('./ui-updates.js').then(m => m.atualizarDadosCarrinho());
}



export function salvarNoLocalStorage() {
    localStorage.setItem('carrinho_dayane', JSON.stringify(pedido));
}

// ====== FUNÇÃO PARA REMOVER BOLO DA SACOLA (Array itens) ======
export function excluirItemSacola(index) {
    // Remove o item do array pelo índice
    if (pedido.itens && pedido.itens[index]) {
        pedido.itens.splice(index, 1);
    }

    // Salva a nova lista no navegador
    salvarNoLocalStorage();

    // Atualiza a matemática e a tela
    import('./calculate.js').then(m => m.atualizarTudo());
    import('./ui-updates.js').then(m => m.atualizarDadosCarrinho());
}

// ====== FUNÇÕES DE ATUALIZAÇÃO DO PAGAMENTO ======

export function setMetodoSelecionado(valor) {
    metodoSelecionado = valor;
    pedido.metodoPagamento = valor; // Também salva dentro do objeto pedido
}

export function setPorcentagemPagamento(valor) {
    porcentagemPagamento = valor; // variável local do state
    window.porcentagemPagamento = valor; // global
    
    if (!pedido.pagamento) pedido.pagamento = {};
    pedido.pagamento.porcentagem = valor; // PADRÃO CORRETO
    
    // Remova a linha: pedido.porcentagemPagamento = valor; (ISSO É LIXO)
}