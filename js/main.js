// 1. IMPORTAÇÕES DE UTILITÁRIOS E CÁLCULOS
import { configurarCalendario, aplicarMascaraTelefone, previewImagem, removerLoteDoce } from './utils.js';
import { atualizarTudo } from './calculate.js';

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
    copiarPix
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
    pedido 
} from './state.js';

import { inicializarCheckoutTransparente } from './payment.js';
// ================================================================
// 4. EXPOSIÇÃO GLOBAL (Para que os 'onclick' do HTML funcionem)
// ================================================================
window.escolherMetodo = escolherMetodo;
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
window.inicializarCheckoutTransparente = inicializarCheckoutTransparente;
// ================================================================
// 5. COMANDO DE INÍCIO (Executa quando a página termina de carregar)
// ================================================================
document.addEventListener("DOMContentLoaded", () => {
    
    window.scrollTo(0, 0);
    
    // A. Identificação da Página
    const tipoPagina = document.body.getAttribute('data-pagina');

    // B. Inicialização de Utilitários
    configurarCalendario();
    aplicarMascaraTelefone();
    
    // C. Lógica Específica por Página
    if (tipoPagina === 'personalizado') {
        carregarPesosPersonalizados();
    } 
    else if (tipoPagina === 'corte') {
        selecionarFormato('Redondo'); // Inicia padrão para bolo de corte
    }

    // D. Ativação dos Grupos de Eventos
    inicializarEventosBase();            // Peso, Massa, Recheios
    inicializarEventosBotoes();          // Botões "Eu Quero"
    inicializarFluxoCarrinho();          // Abrir/Fechar com Validação e Navegação
    inicializarEventosModais();          // Termos e Erros
    inicializarCookies();                // Banner de Cookies
    inicializarEventosInputTopo();       // Digitação de Nome/Idade no Topo
    inicializarEventosRemocaoCarrinho(); // Lixeiras dentro do Drawer
    inicializarEventosSetas();

    // E. Escutas Adicionais
    const pesoSelect = document.getElementById('pesoSelect');
    if (pesoSelect) {
        pesoSelect.addEventListener('change', atualizarTudo);
    }
    
    console.log(`🚀 Sistema Dayane Bolos iniciado! Página: ${tipoPagina || 'Geral'}`);
});


