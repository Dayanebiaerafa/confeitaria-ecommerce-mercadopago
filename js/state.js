export let metodoSelecionado = null;  
export let etapaAtual = 0;
export let porcentagemPagamento = 1.0;
// ====== OBJETO PRINCIPAL DO PEDIDO ======

const Salvo = localStorage.getItem('carrinho_dayane');

export let pedido = Salvo ? JSON.parse(Salvo) : {
    cliente: {
        nome: "",
        telefone: "",
        email: "",
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
    porcentagemPagamento: 1.0, // 0.5 (50%) ou 1.0 (100%)
    metodoPagamento: null, // 'pix' ou 'credit_card'
    subtotal: 0,
    valorPago: 0,
    valorTotal: 0,
};



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
        // Se o doce já existe, apenas atualiza a quantidade e o valor
        pedido.doces[index].qtd = novoDoce.quantidade;
        pedido.doces[index].valor = novoDoce.valor;
    } else {
        // Se não existe, adiciona o novo
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
    porcentagemPagamento = valor;
    pedido.porcentagemPagamento = valor;
}