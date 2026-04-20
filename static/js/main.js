// 1. IMPORTAÇÕES DE UTILITÁRIOS E CÁLCULOS
import {
  configurarCalendario,
  aplicarMascaraTelefone,
  previewImagem,
  removerLoteDoce,
  gerarOpcoesDeHorario,
} from "/static/js/utils.js";
import { atualizarTudo, calcularValorApenasDesteBolo } from "/static/js/calculate.js";

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
  excluirTopo, 
  excluirEmbalagem, 
  excluirEncomenda, 
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
  atualizarResumoFinal,
} from "/static/js/ui-updates.js";

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
} from "/static/js/events.js";

import { pedido, salvarNoLocalStorage } from "/static/js/state.js";

import {
  inicializarCheckoutTransparente,
  inicializarLogicaDocumento,
} from "/static/js/payment.js";
// ================================================================
// 4. EXPOSIÇÃO GLOBAL (Para que os 'onclick' do HTML funcionem)
// ================================================================
window.escolherMetodo = escolherMetodo;
window.inicializarLogicaDocumento = inicializarLogicaDocumento;
window.restaurarEstadoBotoesPagamento = restaurarEstadoBotoesPagamento;
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
    pedido.itens.splice(index, 1); 
    atualizarTudo(); 
    atualizarDadosCarrinho();
    atualizarContadorSacola(); 
  }
};
window.inicializarEventosDoces = inicializarEventosDoces;
window.atualizarResumoFinal = atualizarResumoFinal;
window.gerarOpcoesDeHorario = gerarOpcoesDeHorario;
window.configurarCalendario = configurarCalendario;
// ================================================================
// 5. COMANDO DE INÍCIO (Executa quando a página termina de carregar)
// ================================================================
document.addEventListener("DOMContentLoaded", () => {
  console.clear();

  const dadosSalvos = localStorage.getItem("carrinho_dayane");

  if (dadosSalvos) {
    const pedidoRecuperado = JSON.parse(dadosSalvos);
    Object.assign(pedido, pedidoRecuperado);

  
    window.porcentagemPagamento = pedido.pagamento?.porcentagem || 1.0;
    window.metodoSelecionado = pedido.pagamento?.metodo || null;

    console.log("✅ Carrinho e Globais reidratados.");

    
    if (pedido.cliente) {
      const campos = {
        nomeCliente: pedido.cliente.nome,
        telefoneCliente: pedido.cliente.telefone,
        emailCliente: pedido.cliente.email,
        dataPedido: pedido.cliente.data,
        horarioPedido: pedido.cliente.horario,
      };

      for (let id in campos) {
        const el = document.getElementById(id);
        if (el && campos[id]) el.value = campos[id];
      }
    }
  }

  const pixPendente = localStorage.getItem("ultimo_pedido_id");

  
  if (!pixPendente) {
    pedido.pesoKg = 0;
    pedido.massa = "";
    pedido.recheios = [];
    pedido.modeloImagem = "";
   
  }
 
  window.scrollTo(0, 0);
  const tipoPagina = document.body.getAttribute("data-pagina");
  console.log("Estou na página:", tipoPagina); 
  if (tipoPagina === "doces") {
    pedido.corForminhas = ""; 

    const inputCorForminhas = document.getElementById("corForminhas");
    if (inputCorForminhas) {
      inputCorForminhas.value = ""; 
    }
  }
  // Inicializações Básicas
  configurarCalendario();
  aplicarMascaraTelefone();

  if (tipoPagina === "personalizado") carregarPesosPersonalizados();
  if (tipoPagina === "corte") selecionarFormato("Redondo");

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
  inicializarLogicaDocumento();

  console.log("✅ Lógica de Documento carregada e ativa!");

 
  const pesoSelect = document.getElementById("pesoSelect");
  if (pesoSelect) {
    pesoSelect.addEventListener("change", atualizarTudo);
  }

  const inputNomeTopo = document.getElementById("topo-nome");
  const inputIdadeTopo = document.getElementById("topo-idade");
  const inputObsTopo = document.getElementById("topo-obs");

  
  if (inputNomeTopo && pedido.nomeTopo) {
    inputNomeTopo.value = pedido.nomeTopo;
  }
  if (inputIdadeTopo && pedido.idadeTopo) {
    inputIdadeTopo.value = pedido.idadeTopo;
  }
  if (inputObsTopo && pedido.obsTopo) {
    inputObsTopo.value = pedido.obsTopo;
  }
  const inputObs = document.getElementById("observacaoPedido");
  if (inputObs && pedido.observacao) {
    inputObs.value = pedido.observacao;
  }


  if (pedido.preferenciaPeso) {
    const radioPeso = document.querySelector(
      `input[name="pesoPreferencia"][value="${pedido.preferenciaPeso}"]`,
    );
    if (radioPeso) radioPeso.checked = true;
  }

  if (tipoPagina === "doces") {
    inicializarEventosDoces();

    if (pedido.doces && pedido.doces.length > 0) {
      pedido.doces.forEach((doce) => {
  
        atualizarInterfaceDoces(null, doce.nome);
      });
    }
  }
  const inputCorForminhas = document.getElementById("corForminhas");
  if (inputCorForminhas) {
    inputCorForminhas.addEventListener("input", (e) => {
      pedido.corForminhas = e.target.value;
    
      localStorage.setItem("carrinho_dayane", JSON.stringify(pedido));
    });
  }

  const inputObsPedido = document.getElementById("observacaoPedido");
  if (inputObsPedido) {
    inputObsPedido.addEventListener("input", (e) => {
      
      pedido.observacao = e.target.value;

      localStorage.setItem("carrinho_dayane", JSON.stringify(pedido));
    });
  }

  window.addEventListener("click", (event) => {
   
    if (
      !event.target.closest(".dropbtn") &&
      !event.target.closest(".dropdown-content")
    ) {
      document.querySelectorAll(".dropdown-content").forEach((menu) => {
        menu.classList.remove("show");
      });
    }
  });


  const inicializarUIConfirmacao = () => {
    console.log("🔍 Verificando estados finais...");

    if (typeof atualizarTudo === "function") {
      atualizarTudo();
    }

    if (pedido.cliente && pedido.cliente.data) {
      const elData = document.getElementById("dataPedido");
      const elHora = document.getElementById("horarioPedido");

      if (elData) {
        elData.value = pedido.cliente.data;

       
        if (typeof window.gerarOpcoesDeHorario === "function") {
          
          const dataCorreta = new Date(pedido.cliente.data + "T00:00:00");
          window.gerarOpcoesDeHorario(dataCorreta);
          console.log("🕒 Horas geradas manualmente na reidratação");
        }

       
        elData.dispatchEvent(new Event("change"));

        setTimeout(() => {
          if (elHora && pedido.cliente.horario) {
            elHora.value = pedido.cliente.horario;
           
            if (elHora.value === "") {
              console.error(
                "❌ Falha ao injetar hora: valor não existe nas opções.",
              );
            }
          }
        }, 400); 
      }
    }

    if (typeof restaurarEstadoBotoesPagamento === "function") {
      restaurarEstadoBotoesPagamento();
    }

    if (typeof atualizarResumoFinal === "function") {
      atualizarResumoFinal();
    }

    if (typeof verificarPedidoPendente === "function") {
      verificarPedidoPendente();
    }
  };

  
  window.addEventListener("storage", (e) => {
    if (e.key === "carrinho_dayane") verificarPedidoPendente();
  });

  setTimeout(inicializarUIConfirmacao, 100);

  console.log("🚀 Sistema sincronizado com sucesso!");
});


function verificarPedidoPendente() {
  
  if (sessionStorage.getItem("banner_fechado")) return;
  if (window.location.pathname.includes("/sucesso")) return;

  const ultimoId = localStorage.getItem("ultimo_pedido_id");
  const pixDados = localStorage.getItem("dados_pix_resultado");
  const carrinhoRaw = localStorage.getItem("carrinho_dayane");

  console.log("DEBUG CHECKOUT:", { ultimoId, pixDados });

  if (!ultimoId || !pixDados || !carrinhoRaw) {
    console.log("ℹ️ Banner: Faltam dados no Storage para exibir.");
    return;
  }

  let temAlgoParaPagar = false;
  try {
    const carrinho = JSON.parse(carrinhoRaw);

   
    const temItens = carrinho.itens && carrinho.itens.length > 0;
    const temDoces = carrinho.doces && carrinho.doces.length > 0;
    const temValor = carrinho.valorTotal > 0;

    temAlgoParaPagar = temItens || temDoces || temValor;

    console.log("📊 Check Banner:", { temItens, temDoces, temValor });
  } catch (e) {
    console.error("❌ Erro ao ler carrinho para o banner", e);
  }

  if (temAlgoParaPagar) {
    if (document.getElementById("banner-pendente")) return;

    const banner = document.createElement("div");
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
      sessionStorage.setItem("banner_fechado", "true");
      banner.remove();
    };

    document.getElementById("btn-recuperar-pix").onclick = () => {
      import("/static/js/ui-updates.js").then((m) => {
        if (m.atualizarResumoFinal) m.atualizarResumoFinal();
        if (window.recuperarPixPendente) window.recuperarPixPendente();
      });
      banner.remove();
    };

    console.log("✅ Banner exibido com sucesso!");
  } else {
    console.log("ℹ️ Banner: Carrinho parece vazio, não exibindo.");
  }
}

window.recuperarPixPendente = function () {
  const dadosNoStorage = localStorage.getItem("carrinho_dayane");
  const pixDadosRaw = localStorage.getItem("dados_pix_resultado");

  if (dadosNoStorage && pixDadosRaw) {
    const pedidoReal = JSON.parse(dadosNoStorage);
    const pixDados = JSON.parse(pixDadosRaw);

    Object.assign(pedido, pedidoReal);

    
    window.porcentagemPagamento =
      pedido.pagamento?.porcentagem || window.porcentagemPagamento || 0.5;

    if (pedido.pagamento) {
      window.porcentagemPagamento = pedido.pagamento.porcentagem || 1;
      window.metodoSelecionado = pedido.pagamento.metodo || "pix";
    }

 
    const drawer = document.getElementById("drawerCarrinho");
    if (drawer) {
      drawer.classList.add("ativo");
      document.getElementById("overlay")?.classList.add("ativo");

 
      if (typeof window.mostrarEtapa === "function") {
        window.mostrarEtapa(3);
      }

 
      setTimeout(() => {
   
        if (typeof atualizarResumoFinal === "function") {
          atualizarResumoFinal();
        }

        const pixContainer = document.getElementById("pix-container");
        const mpContainer = document.getElementById("container-pagamento-mp");
        const qrImg = document.getElementById("pix-qr-img");
        const copiaCola = document.getElementById("pix-copia-e-cola");

        if (pixContainer) pixContainer.style.display = "block";
        if (mpContainer) mpContainer.style.display = "none";

        if (qrImg)
          qrImg.src = `data:image/png;base64,${pixDados.qr_code_base64}`;
        if (copiaCola) copiaCola.value = pixDados.qr_code;

        console.log(
          "💎 Recuperação Finalizada com Variáveis Globais sincronizadas.",
        );
      }, 500);
    }
  }
  if (typeof restaurarEstadoBotoesPagamento === "function") {
    restaurarEstadoBotoesPagamento();
  }
};

window.removerItemSacola = (index) => {
  if (pedido.itens && pedido.itens[index]) {
    pedido.itens.splice(index, 1);
    localStorage.setItem("carrinho_dayane", JSON.stringify(pedido));

   
    atualizarTudo();
    atualizarDadosCarrinho();
    if (window.atualizarContadorSacola) window.atualizarContadorSacola();
  }
};

window.abrirDrawer = abrirDrawer;

window.copiarPix = function () {
  const texto = document.getElementById("pix-copia-e-cola");
  texto.select();
  texto.setSelectionRange(0, 99999); 
  document.execCommand("copy");

 
  const btn = event.target;
  const textoOriginal = btn.innerText;
  btn.innerText = "✅ Copiado!";
  btn.style.background = "#28a745"; 

  setTimeout(() => {
    btn.innerText = textoOriginal;
    btn.style.background = "#783606"; 
  }, 2000);
};
