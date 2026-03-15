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
    inicializarEventosDoces,
    restaurarEstadoBotoesPagamento,
    atualizarResumoFinal
   
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
window.restaurarEstadoBotoesPagamento = restaurarEstadoBotoesPagamento
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
window.atualizarResumoFinal = atualizarResumoFinal

// ================================================================
// 5. COMANDO DE INÍCIO (Executa quando a página termina de carregar)
// ================================================================
document.addEventListener("DOMContentLoaded", () => {
    const dadosSalvos = localStorage.getItem('carrinho_dayane'); 
    
    if (dadosSalvos) {
        const pedidoRecuperado = JSON.parse(dadosSalvos);
        Object.assign(pedido, pedidoRecuperado);

        // Sincronização vital
        window.porcentagemPagamento = pedido.pagamento?.porcentagem || 1.0;
        window.metodoSelecionado = pedido.pagamento?.metodo || null;

        console.log("✅ Carrinho e Globais reidratados.");

        // Reidratação dos Inputs
        if (pedido.cliente) {
            const campos = {
                'nomeCliente': pedido.cliente.nome,
                'telefoneCliente': pedido.cliente.telefone,
                'emailCliente': pedido.cliente.email,
                'dataPedido': pedido.cliente.data,
                'horarioPedido': pedido.cliente.horario
            };

            for (let id in campos) {
                const el = document.getElementById(id);
                if (el && campos[id]) el.value = campos[id];
            }
        }
    }


    const pixPendente = localStorage.getItem('ultimo_pedido_id');

    // SÊNIOR: Só limpamos o rascunho se não tivermos um Pix para recuperar
    if (!pixPendente) {
        pedido.pesoKg = 0;
        pedido.massa = "";
        pedido.recheios = [];
        pedido.modeloImagem = "";
        // ... outras limpezas que você já tem
    } else {
        console.log("⚠️ Limpeza abortada: Existe um pedido pendente no Storage.");
    }
    // 2. DEPOIS AS INICIALIZAÇÕES
    window.scrollTo(0, 0);
    const tipoPagina = document.body.getAttribute('data-pagina');
    console.log("Estou na página:", tipoPagina); // Verifique se aparece 'corte', 'personalizado' ou 'doces'

    if (tipoPagina === 'doces') {
        pedido.corForminhas = ""; // Limpa no sistema
        
        const inputCorForminhas = document.getElementById('corForminhas');
        if (inputCorForminhas) {
            inputCorForminhas.value = ""; // Limpa visualmente o campo
        }
    }
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
    const inputObs = document.getElementById('observacaoPedido');
    if (inputObs && pedido.observacao) {
        inputObs.value = pedido.observacao;
    }

    // NOVO: Reidratar Preferência de Peso (Marcar o rádio correto)
    if (pedido.preferenciaPeso) {
        const radioPeso = document.querySelector(`input[name="pesoPreferencia"][value="${pedido.preferenciaPeso}"]`);
        if (radioPeso) radioPeso.checked = true;
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

    const inputObsPedido = document.getElementById('observacaoPedido');
    if (inputObsPedido) {
        inputObsPedido.addEventListener('input', (e) => {
            // SÊNIOR: Atualiza o objeto global 'pedido'
            pedido.observacao = e.target.value;
            
            // SÊNIOR: Persiste no LocalStorage imediatamente
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

    // 2. Criamos uma função de inicialização de UI para garantir a ordem
    const inicializarUIConfirmacao = () => {
        console.log("🔍 Verificando estados finais...");

        if (pedido.cliente) {
            const elData = document.getElementById('dataPedido');
            const elHora = document.getElementById('horarioPedido');
            
            if (elData && pedido.cliente.data) {
                elData.value = pedido.cliente.data;
                
                // 🔥 O SEGREDO: Disparar manualmente o evento 'change' na data.
                // Isso força a função 'configurarCalendario' a criar as opções de hora agora!
                elData.dispatchEvent(new Event('change'));

                // Agora sim, damos um tempo para o HTML processar as novas opções e injetamos a hora
                setTimeout(() => {
                    if (elHora && pedido.cliente.horario) {
                        elHora.value = pedido.cliente.horario;
                        console.log("⏰ Horário injetado com sucesso:", elHora.value);
                    }
                }, 150); // Aumentei um pouquinho para garantir
            }
        }
   

        if (typeof restaurarEstadoBotoesPagamento === 'function') {
            restaurarEstadoBotoesPagamento();
        }

        if (typeof atualizarResumoFinal === 'function') {
            atualizarResumoFinal();
        }

        if (typeof verificarPedidoPendente === 'function') {
            verificarPedidoPendente(); 
        }
    };
    
    // Backup de segurança: se o usuário mudar algo, tentamos mostrar o banner de novo
    window.addEventListener('storage', (e) => {
        if (e.key === 'carrinho_dayane') verificarPedidoPendente();
    });

    setTimeout(inicializarUIConfirmacao, 100);

    console.log("🚀 Sistema sincronizado com sucesso!");
});
// main.js

function verificarPedidoPendente() {
    // 1. Verificações de bloqueio
    if (sessionStorage.getItem('banner_fechado')) return;
    if (window.location.pathname.includes('sucesso.html')) return;

    const ultimoId = localStorage.getItem('ultimo_pedido_id');
    const pixDados = localStorage.getItem('dados_pix_resultado');
    const carrinhoRaw = localStorage.getItem('carrinho_dayane');
    
    if (!ultimoId || !pixDados || !carrinhoRaw) {
        console.log("ℹ️ Banner: Faltam dados no Storage para exibir.");
        return;
    }

    let temAlgoParaPagar = false;
    try {
        const carrinho = JSON.parse(carrinhoRaw);
        
        // SÊNIOR: Verificação robusta. Se tem itens, doces OU um valor total, o banner deve aparecer
        const temItens = carrinho.itens && carrinho.itens.length > 0;
        const temDoces = carrinho.doces && carrinho.doces.length > 0;
        const temValor = (carrinho.valorTotal > 0);

        temAlgoParaPagar = temItens || temDoces || temValor;
        
        console.log("📊 Check Banner:", { temItens, temDoces, temValor });
    } catch (e) {
        console.error("❌ Erro ao ler carrinho para o banner", e);
    }

    if (temAlgoParaPagar) {
        if (document.getElementById('banner-pendente')) return;

        const banner = document.createElement('div');
        banner.id = "banner-pendente";
        banner.innerHTML = `
            <div style="position:fixed; bottom:20px; left:50%; transform:translateX(-50%); background:#783606; color:white; padding:15px; border-radius:10px; z-index:9999; box-shadow:0 4px 15px rgba(0,0,0,0.3); text-align:center; min-width:300px; border: 2px solid #fff;">
                <span id="fechar-banner-x" style="position:absolute; top:2px; right:10px; cursor:pointer; font-size:24px; font-weight:bold; color:white;">&times;</span>
                <p style="margin:0 0 10px 0; font-weight:bold;"> Você tem um pedido pendente!</p>
                <button id="btn-recuperar-pix" style="background:#fff; color:#783606; border:none; padding:10px 20px; border-radius:5px; font-weight:bold; cursor:pointer; width:100%;">Ver QR Code do Pix</button>
            </div>
        `;
        document.body.appendChild(banner);

        document.getElementById("fechar-banner-x").onclick = (e) => {
            e.stopPropagation();
            sessionStorage.setItem('banner_fechado', 'true');
            banner.remove();
        };

        document.getElementById("btn-recuperar-pix").onclick = () => {
            import('./ui-updates.js').then(m => {
                if(m.atualizarResumoFinal) m.atualizarResumoFinal(); 
                if(window.recuperarPixPendente) window.recuperarPixPendente();
            });
            banner.remove();
        };
        
        console.log("✅ Banner exibido com sucesso!");
    } else {
        console.log("ℹ️ Banner: Carrinho parece vazio, não exibindo.");
    }
}



window.recuperarPixPendente = function() {
    const dadosNoStorage = localStorage.getItem('carrinho_dayane');
    const pixDadosRaw = localStorage.getItem('dados_pix_resultado');
    
    if (dadosNoStorage && pixDadosRaw) {
        const pedidoReal = JSON.parse(dadosNoStorage);
        const pixDados = JSON.parse(pixDadosRaw);

        Object.assign(pedido, pedidoReal);
        
        // SÊNIOR: Força a recuperação da porcentagem. 
        // Se no storage estiver undefined ou 1, mas existe um Pix, assumimos o que está no estado global
        window.porcentagemPagamento = pedido.pagamento?.porcentagem || window.porcentagemPagamento || 0.5;
        // Recupera a porcentagem e o método do objeto salvo para as globais
        if (pedido.pagamento) {
            window.porcentagemPagamento = pedido.pagamento.porcentagem || 1;
            window.metodoSelecionado = pedido.pagamento.metodo || 'pix';
        }

        // 2. Abre o Drawer
        const drawer = document.getElementById('drawerCarrinho');
        if (drawer) {
            drawer.classList.add("ativo");
            document.getElementById('overlay')?.classList.add("ativo");
            
            // 3. Muda para a etapa 3 (Finalizar)
            if (typeof window.mostrarEtapa === 'function') {
                window.mostrarEtapa(3);
            }

            // Aumentamos um pouco o tempo para garantir que o DOM renderizou
            setTimeout(() => {
                // 4. Força a atualização de todos os campos de texto e cálculos
                if (typeof atualizarResumoFinal === 'function') {
                    atualizarResumoFinal();
                }

                // 5. INJEÇÃO DO PIX
                const pixContainer = document.getElementById("pix-container");
                const mpContainer = document.getElementById("container-pagamento-mp");
                const qrImg = document.getElementById("pix-qr-img");
                const copiaCola = document.getElementById("pix-copia-e-cola");

                if (pixContainer) pixContainer.style.display = "block";
                if (mpContainer) mpContainer.style.display = "none";

                if (qrImg) qrImg.src = `data:image/png;base64,${pixDados.qr_code_base64}`;
                if (copiaCola) copiaCola.value = pixDados.qr_code;

                console.log("💎 Recuperação Finalizada com Variáveis Globais sincronizadas.");
            }, 500); 
        }
    }
    if (typeof restaurarEstadoBotoesPagamento === 'function') {
        restaurarEstadoBotoesPagamento();
    }
};

window.removerItemSacola = (index) => {
    if (pedido.itens && pedido.itens[index]) {
        pedido.itens.splice(index, 1);
        localStorage.setItem('carrinho_dayane', JSON.stringify(pedido));
        
        // A ordem Sênior: Recalcula -> Salva -> Renderiza
        atualizarTudo(); 
        atualizarDadosCarrinho();
        if (window.atualizarContadorSacola) window.atualizarContadorSacola();
    }
};

window.abrirDrawer = abrirDrawer;


window.copiarPix = function() {
    const texto = document.getElementById("pix-copia-e-cola");
    texto.select();
    texto.setSelectionRange(0, 99999); // Para mobile
    document.execCommand("copy");

    // Feedback visual no botão
    const btn = event.target;
    const textoOriginal = btn.innerText;
    btn.innerText = "✅ Copiado!";
    btn.style.background = "#28a745"; // Verde

    setTimeout(() => {
        btn.innerText = textoOriginal;
        btn.style.background = "#783606"; // Volta ao marrom
    }, 2000);
};

// ... código existente
// No main.js
window.selecionarPorcentagem = function(valor) {
    console.log("🎯 Selecionando Porcentagem:", valor);
    
    // 1. Sincroniza Global e Objeto
    window.porcentagemPagamento = valor; 
    if (!pedido.pagamento) pedido.pagamento = {};
    pedido.pagamento.porcentagem = valor;
    
    // 2. Recalcula o valor pago imediatamente
    pedido.valorPago = (pedido.valorTotal || 0) * valor;

    // 3. Atualiza Visual dos Botões
    document.querySelectorAll('.btn-valor').forEach(btn => btn.classList.remove('active'));
    const idBotao = valor === 0.5 ? 'btnPagar50' : 'btnPagar100';
    document.getElementById(idBotao)?.classList.add('active');

    // 4. Salva o estado atualizado
    localStorage.setItem('carrinho_dayane', JSON.stringify(pedido));

    // 5. Renderiza o texto no resumo (Ex: "Pagar agora: R$ 50,00")
    if (typeof atualizarResumoFinal === 'function') {
        atualizarResumoFinal();
    }
};