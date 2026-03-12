// 1. IMPORTAÇÕES DE UTILITÁRIOS E CÁLCULOS
import { configurarCalendario, aplicarMascaraTelefone, previewImagem, removerLoteDoce } from './utils.js';
import { atualizarTudo, calcularValorApenasDesteBolo } from './calculate.js';

// 2. IMPORTAÇÕES DE INTERFACE (UI)
import { 
    escolherMetodo, 
    selecionarPorcentagem, 
    selecionarFormato, 
    carregarPesosPersonalizados, 
    toggleTopo, 
    toggleEmbalagem,
    scrollCarousel,
    mostrarNotificacao,
    abrirDrawer,
    atualizarDadosCarrinho,
    limparDescricoesCarrinho,
    resetarBotoesVisualmente,
    excluirTopo,       // Adicione aqui
    excluirEmbalagem,  // Adicione aqui
    excluirEncomenda,   // Adicione aqui
    excluirDoce,
    atualizarInterfaceDoces,
    atualizarContadorSacola,
    calcularTotalGeral,
    removerLote,
    copiarPix,
    atualizarVisualMetodo,
    adicionarBoloAoCarrinho,
    confirmarBoloNoCarrinho,
    inicializarEventosDoces
   
} from './ui-updates.js';

// 3. IMPORTAÇÕES DE EVENTOS (GRUPOS DE ATIVAÇÃO)
import { 
    inicializarEventosBase, 
    inicializarEventosBotoes, 
    inicializarFluxoCarrinho,
    inicializarEventosModais,
    inicializarCookies,
    inicializarEventosInputTopo,
    inicializarEventosRemocaoCarrinho,
    inicializarEventosSetas,
    
    
} from './events.js';

import { 
    pedido,
    salvarNoLocalStorage 
} from './state.js';

import { inicializarCheckoutTransparente } from './payment.js';
// ================================================================
// 4. EXPOSIÇÃO GLOBAL (Para que os 'onclick' do HTML funcionem)
// ================================================================
window.escolherMetodo = escolherMetodo;
window.confirmarBoloNoCarrinho = confirmarBoloNoCarrinho;
window.calcularValorApenasDesteBolo = calcularValorApenasDesteBolo;
window.adicionarBoloAoCarrinho = adicionarBoloAoCarrinho;
window.salvarNoLocalStorage = salvarNoLocalStorage;
window.selecionarPorcentagem = selecionarPorcentagem;
window.selecionarFormato = selecionarFormato;
window.toggleTopo = toggleTopo;
window.toggleEmbalagem = toggleEmbalagem;
window.previewImagem = previewImagem;
window.removerLoteDoce = removerLoteDoce;
window.atualizarTudo = atualizarTudo;
window.scrollCarousel = scrollCarousel;
window.mostrarNotificacao = mostrarNotificacao;
window.pedido = pedido;
window.abrirDrawer = abrirDrawer;
window.atualizarDadosCarrinho = atualizarDadosCarrinho;
window.drawer = document.getElementById("drawerCarrinho");
window.overlay = document.getElementById("overlay");
window.atualizarInterfaceDoces = atualizarInterfaceDoces;
window.limparDescricoesCarrinho = limparDescricoesCarrinho;
window.excluirTopo = excluirTopo;
window.excluirEmbalagem = excluirEmbalagem;
window.excluirEncomenda = excluirEncomenda;
window.excluirDoce = excluirDoce;
window.atualizarContadorSacola = atualizarContadorSacola;
window.calcularTotalGeral = calcularTotalGeral;
window.removerLote = removerLote;
window.copiarPix = copiarPix;
window.inicializarCookies = inicializarCookies;
window.inicializarCheckoutTransparente = inicializarCheckoutTransparente;
window.atualizarVisualMetodo = atualizarVisualMetodo;
window.removerItemSacola = (index) => {
    if (pedido.itens && pedido.itens[index]) {
        pedido.itens.splice(index, 1); // Remove do array
        atualizarTudo(); // Recalcula valores
        atualizarDadosCarrinho(); // Atualiza a tela
        atualizarContadorSacola(); // Atualiza a bolinha do ícone
    }
};
window.inicializarEventosDoces = inicializarEventosDoces;

// ================================================================
// 5. COMANDO DE INÍCIO (Executa quando a página termina de carregar)
// ================================================================
document.addEventListener("DOMContentLoaded", () => {
    const dadosSalvos = localStorage.getItem('carrinho_dayane'); 
    if (dadosSalvos) {
        try {
            const pedidoRecuperado = JSON.parse(dadosSalvos);
            // Sênior tip: Object.assign mantém a referência do objeto original
            Object.assign(pedido, pedidoRecuperado); 
            console.log("✅ Dados recuperados do LocalStorage:", pedido.itens.length, "itens encontrados.");
        } catch (e) {
            console.error("Erro ao ler LocalStorage:", e);
        }
    }

    // 2. LIMPEZA DO RASCUNHO (Para evitar que o bolo da página anterior apareça na nova)
    // Quando mudamos de página, queremos ver os itens salvos, mas não o rascunho incompleto
    pedido.pesoKg = 0;
    pedido.massa = "";
    pedido.recheios = [];
    pedido.modeloImagem = "";
    // 2. DEPOIS AS INICIALIZAÇÕES
    window.scrollTo(0, 0);
    const tipoPagina = document.body.getAttribute('data-pagina');
    console.log("Estou na página:", tipoPagina); // Verifique se aparece 'corte', 'personalizado' ou 'doces'

    // Inicializações Básicas
    configurarCalendario();
    aplicarMascaraTelefone();
   
    
    if (tipoPagina === 'personalizado') carregarPesosPersonalizados();
    if (tipoPagina === 'corte') selecionarFormato('Redondo');

    // Ativação de Eventos
    inicializarEventosBase();
    inicializarEventosBotoes();
    inicializarFluxoCarrinho();
    inicializarEventosModais();
    inicializarCookies();
    inicializarEventosInputTopo();
    inicializarEventosRemocaoCarrinho();
    inicializarEventosSetas();
    inicializarEventosDoces();

    // Ouvinte de mudança de peso
    const pesoSelect = document.getElementById('pesoSelect');
    if (pesoSelect) {
        pesoSelect.addEventListener('change', atualizarTudo);
    }

    const btnConfirmar = document.getElementById('btnConfirmarPedido');
    if (btnConfirmar) {
        btnConfirmar.addEventListener('click', () => {
            // Chamamos a função que "salva" o bolo atual na lista de itens
            adicionarBoloAoCarrinho(); 
            
            // Abrimos a sacola (drawer) para o cliente ver que adicionou
            if (typeof abrirDrawer === "function") abrirDrawer();
        });
    }

    // Sênior: Preenchimento seguro (apenas se o input existir na página atual)
    // --- Captura os inputs primeiro ---
    const inputNomeTopo = document.getElementById('topo-nome');
    const inputIdadeTopo = document.getElementById('topo-idade');
    const inputObsTopo = document.getElementById('topo-obs');

    // Sênior: Preenchimento seguro (apenas se o input existir na página atual)
   if (inputNomeTopo && pedido.nomeTopo) {
        inputNomeTopo.value = pedido.nomeTopo;
    }
    if (inputIdadeTopo && pedido.idadeTopo) {
        inputIdadeTopo.value = pedido.idadeTopo;
    }
    if (inputObsTopo && pedido.obsTopo) {
        inputObsTopo.value = pedido.obsTopo;
    }
    


    if (tipoPagina === 'doces') {
        inicializarEventosDoces();
        
        // Sênior: Se o usuário voltou para a página de doces, 
        // precisamos pintar os botões dos doces que já estão no pedido.
        if (pedido.doces && pedido.doces.length > 0) {
            pedido.doces.forEach(doce => {
                // Chamamos sua função de interface para cada doce salvo
                atualizarInterfaceDoces(null, doce.nome);
            });
        }
    }
    const inputCorForminhas = document.getElementById('corForminhas');
    if (inputCorForminhas) {
        inputCorForminhas.addEventListener('input', (e) => {
            pedido.corForminhas = e.target.value;
            // Sênior: Salvando o estado completo para não perder ao navegar
            localStorage.setItem('carrinho_dayane', JSON.stringify(pedido));
        });
    }

    window.addEventListener('click', (event) => {
    // Só fecha se o clique NÃO for no botão e NÃO for dentro do menu
        if (!event.target.closest('.dropbtn') && !event.target.closest('.dropdown-content')) {
            document.querySelectorAll('.dropdown-content').forEach(menu => {
                menu.classList.remove('show');
            });
        }
    });

    // SINCRONIZAÇÃO INICIAL (O pulo do gato)
    // Primeiro rodamos o atualizarTudo para processar o que veio do localStorage
    atualizarTudo(); 
    atualizarDadosCarrinho();

    console.log(`🚀 Sistema Dayane Bolos sincronizado! Página: ${tipoPagina || 'Geral'}`);
});

function verificarPedidoPendente() {
    const ultimoId = localStorage.getItem('ultimo_pedido_id');
    if (ultimoId) {
        // Cria um pequeno banner ou botão flutuante na tela
        const banner = document.createElement('div');
        banner.innerHTML = `
            <div style="position:fixed; bottom:20px; left:50%; transform:translateX(-50%); background:#783606; color:white; padding:15px; border-radius:10px; z-index:9999; box-shadow:0 4px 15px rgba(0,0,0,0.3); text-align:center;">
                <p style="margin:0 0 10px 0;">Você tem um pedido aguardando pagamento!</p>
                <button onclick="recuperarPixPendente()" style="background:#fff; color:#783606; border:none; padding:8px 15px; border-radius:5px; font-weight:bold; cursor:pointer;">Ver QR Code do Pix</button>
            </div>
        `;
        document.body.appendChild(banner);
    }
}

// Chame essa função ao carregar a página
window.onload = verificarPedidoPendente;

window.recuperarPixPendente = function() {
    const paymentId = localStorage.getItem('ultimo_pedido_id');
    const dadosPedido = JSON.parse(localStorage.getItem('dados_ultimo_pedido'));
    
    if (paymentId && dadosPedido) {
        // Abre a tela de pagamento novamente ou chama o verificador
        // Se você já estiver na página de checkout, pode apenas re-exibir o container do Pix
        const pixContainer = document.getElementById("pix-container");
        if (pixContainer) {
            pixContainer.style.display = "flex";
            pixContainer.scrollIntoView({ behavior: 'smooth' });
        }
        // Reinicia a verificação automática para ver se ele pagou enquanto estava fora
        verificarStatusPagamento(paymentId, dadosPedido);
    }
};