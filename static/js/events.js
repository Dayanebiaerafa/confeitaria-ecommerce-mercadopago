export let processandoClique = false;
export let fluxoJaInicializado = false;

import {
  pedido,
  etapaAtual,
  adicionarDoceAoPedido,
  salvarNoLocalStorage,
} from "/static/js/state.js";
import { atualizarTudo } from "/static/js/calculate.js";
import {
  validarCarrinhoAntesDeAbrir,
  configurarCalendario,
} from "/static/js/utils.js";
import {
  abrirDrawer,
  fecharDrawer,
  toggleTopo,
  toggleEmbalagem,
  atualizarDadosCarrinho,
  fecharModalTermos,
  fecharErro,
  modalTermos,
  modalErro,
  checkTermos,
  etapas,
  mostrarEtapa,
  scrollCarousel,
  mostrarNotificacao,
  atualizarResumoFinal,
  resetarBotoesVisualmente,
  limparDescricoesCarrinho,
  escolherMetodo,
  adicionarBoloAoCarrinho,
  drawer,
  overlay,
  atualizarContadorSacola,
  finalizarSelecaoPagamento,
} from "/static/js/ui-updates.js";


export function inicializarEventosBase() {
  const pesoSelect = document.getElementById("pesoSelect");
  pesoSelect?.addEventListener("change", (e) => {
    pedido.pesoKg = parseFloat(e.target.value) || null;
    atualizarTudo();
    atualizarDadosCarrinho();
    salvarNoLocalStorage();
  });

  const massaSelect = document.getElementById("massaSelect");
  massaSelect?.addEventListener("change", () => {
    pedido.massa = massaSelect.value;
    atualizarTudo();
    atualizarDadosCarrinho();
  });

  const inputHora = document.getElementById("horarioPedido");
  if (inputHora) {
    inputHora.addEventListener("change", (e) => {
      if (!pedido.cliente) pedido.cliente = {};
      pedido.cliente.horario = e.target.value;

      
      localStorage.setItem("carrinho_dayane", JSON.stringify(pedido));
      console.log("💾 Horário salvo no Storage:", e.target.value);
    });
  }

  document.querySelectorAll('input[name="recheio"]').forEach((r) => {
    r.addEventListener("change", () => {
      const selecionados = [
        ...document.querySelectorAll('input[name="recheio"]:checked'),
      ];
      const todos = [...document.querySelectorAll('input[name="recheio"]')];
      pedido.recheios = selecionados.map((el) => el.value);

      if (selecionados.length >= 2) {
        todos.forEach((el) => {
          if (!el.checked) el.disabled = true;
        });
      } else {
        todos.forEach((el) => (el.disabled = false));
      }
      atualizarTudo();
      atualizarDadosCarrinho();
    });
  });

  document.querySelectorAll('input[name="complemento"]').forEach((c) => {
    c.addEventListener("change", () => {
      const selecionados = [
        ...document.querySelectorAll('input[name="complemento"]:checked'),
      ];
      const todos = [...document.querySelectorAll('input[name="complemento"]')];
      pedido.complemento = selecionados[0]?.value || null;

      if (selecionados.length >= 1) {
        todos.forEach((el) => {
          if (!el.checked) el.disabled = true;
        });
      } else {
        todos.forEach((el) => (el.disabled = false));
      }
      atualizarTudo();
      atualizarDadosCarrinho();
    });
  });

  document
    .querySelectorAll('input[name="pesoPreferencia"]')
    .forEach((radio) => {
      radio.addEventListener("change", (e) => {
        pedido.preferenciaPeso = e.target.value;
        salvarNoLocalStorage(); 

        if (typeof atualizarResumoFinal === "function") {
          atualizarResumoFinal();
        }
      });
    });
}

export function inicializarEventosBotoes() {
  const botoes = document.querySelectorAll(".btn-eu-quero, .btn-opcao");

  botoes.forEach((btn) => {
    btn.addEventListener("click", function (e) {
      console.log("Clique detectado em:", e.target);
      e.stopPropagation();
      const tipo = e.currentTarget.getAttribute("data-tipo");
      const valorPersonalizado = this.innerText.trim().toLowerCase();
      console.log("Tipo clicado:", tipo);
      // --- 1. REGRA PÁGINA PERSONALIZADO: TOPO SIM/NÃO ---
      if (this.classList.contains("btn-opcao")) {
        const pai = this.parentElement;
        pai
          .querySelectorAll(".btn-opcao")
          .forEach((b) => b.classList.remove("active"));
        this.classList.add("active");

        const campos = document.getElementById("campos-topo");
        if (valorPersonalizado === "sim") {
          pedido.topo = true;
          if (campos) campos.style.display = "block";
        } else {
          pedido.topo = false;
          if (campos) campos.style.display = "none";
        }
        atualizarTudo();
        return;
      }

      
      if (
        tipo !== "doce" &&
        (this.classList.contains("ativo") ||
          this.classList.contains("selecionado"))
      ) {
        this.classList.remove("ativo", "selecionado");
        this.innerText = "Eu quero";
        this.style.backgroundColor = "";
        this.style.color = "";

        if (tipo === "modelo" || tipo === "bolo") pedido.modelo = null;
        if (tipo === "topo") {
          pedido.topo = false;
          const campos = document.getElementById("campos-topo");
          if (campos) campos.style.display = "none";
        }
        if (tipo === "embalagem") pedido.embalagem = false;

        atualizarTudo();
        return;
      }

      if (tipo === "modelo" || tipo === "bolo" || tipo === "topo") {
       
        const seletores =
          tipo === "topo"
            ? '.btn-eu-quero[data-tipo="topo"]'
            : '.btn-eu-quero[data-tipo="modelo"], .btn-eu-quero[data-tipo="bolo"]';

        document.querySelectorAll(seletores).forEach((b) => {
          b.classList.remove("ativo", "selecionado");
          b.innerText = "Eu quero";
          b.style.backgroundColor = "";
          b.style.color = "";
        });

       
        const botaoClicado = e.currentTarget;
        botaoClicado.classList.add("ativo", "selecionado");
        botaoClicado.innerText = "✔ Selecionado";
        botaoClicado.style.backgroundColor = "#e91e63";
        botaoClicado.style.color = "#fff";

        console.log("Visual atualizado: botão ficou rosa e texto mudou.");
      }

  
      if (tipo === "modelo" || tipo === "bolo") {
        
        const card = this.closest(".bolo-card") || this.closest(".topo-item");
        const img = card?.querySelector("img");

        if (img) {
          pedido.modelo = img.src; 
          pedido.modeloImagem = img.src; 
        }

        const pesoSel = document.getElementById("pesoSelect")?.value;
        if (pesoSel) pedido.pesoKg = parseFloat(pesoSel);

        
        salvarNoLocalStorage();
        atualizarTudo();
      }

      else if (tipo === "doce") {
        e.stopImmediatePropagation();
        const nomeDoce = this.getAttribute("data-nome");
        const precoUnid = parseFloat(this.getAttribute("data-preco"));

        let indexDoce = pedido.doces.findIndex((d) => d.nome === nomeDoce);

        if (indexDoce === -1) {
          pedido.doces.push({
            nome: nomeDoce,
            valor: precoUnid * 25,
            qtd: 25,
            precoUnit: precoUnid,
          });
        } else {
          pedido.doces[indexDoce].qtd += 25;
          pedido.doces[indexDoce].valor =
            pedido.doces[indexDoce].qtd * precoUnid;

          atualizarInterfaceDoces(this, nomeDoce); 
          atualizarTudo(); 
        }

       
        if (typeof atualizarInterfaceDoces === "function") {
          atualizarInterfaceDoces(this, nomeDoce);
        }
      } else if (tipo === "topo") {
        pedido.topo = true;
      } else if (tipo === "embalagem") {
       
        toggleEmbalagem({ currentTarget: this });
        return; 
      }

      atualizarTudo();
      salvarNoLocalStorage();
    });
  });


  const campoPeso = document.getElementById("pesoSelect");
  if (campoPeso) {
    campoPeso.addEventListener("input", (e) => {
      pedido.pesoKg = parseFloat(e.target.value) || 0;
      atualizarTudo();
    });
  }


  document
    .querySelectorAll('[data-tipo="modelo"], [data-tipo="bolo"]')
    .forEach((b) => {
      b.classList.remove("ativo");
      b.innerText = "Eu quero";
      b.style.backgroundColor = "";
      b.style.color = "";
    });


  const btnFechar = document.getElementById("btnConfirmarPedido");

  if (btnFechar) {
    const novoBotao = btnFechar.cloneNode(true);
    btnFechar.parentNode.replaceChild(novoBotao, btnFechar);

    novoBotao.addEventListener("click", (event) => {
      const check = document.getElementById("checkTermos");
      const pesoSelect = document.getElementById("pesoSelect");
      const pesoValor = pesoSelect ? parseFloat(pesoSelect.value) : 0;

 
      if (pesoValor <= 0) {
        alert("⚠️ Por favor, selecione o peso do bolo antes de adicionar.");
        pesoSelect?.focus();
        pesoSelect?.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }

      if (check && !check.checked) {
        const seta = document.getElementById("setaVermelha");
        if (seta) seta.style.display = "inline-block";

        const container = document.querySelector(".container-aceite");
        if (container) {
          container.scrollIntoView({ behavior: "smooth", block: "center" });
        }

        alert(
          "⚠️ Você precisa aceitar os termos de variação de peso para este bolo.",
        );
        return;
      }

    
      console.log("✅ Termos aceitos e peso ok. Adicionando...");

      
      const seta = document.getElementById("setaVermelha");
      if (seta) seta.style.display = "none";

      adicionarBoloAoCarrinho(); 
      abrirDrawer(); 
      mostrarNotificacao("Bolo adicionado com sucesso! 🎂");
    });
  }


  const check = document.getElementById("checkTermos");
  const btnConfirmar = document.getElementById("btnConfirmarPedido"); 

  if (check && btnConfirmar) {
  
    btnConfirmar.style.opacity = check.checked ? "1" : "0.5";

    check.addEventListener("change", () => {
 
      btnConfirmar.style.opacity = check.checked ? "1" : "0.5";

      
      if (check.checked) {
        const seta = document.getElementById("setaVermelha");
        const aviso = document.getElementById("avisoBloqueio");
        const container = document.querySelector(".container-aceite");

        if (seta) seta.style.display = "none";
        if (aviso) aviso.style.display = "none";
        if (container) container.style.border = "none";
      }
    });
  }

  document
    .querySelectorAll('input[name="pesoPreferencia"]')
    .forEach((radio) => {
      radio.addEventListener("change", (e) => {
        pedido.preferenciaPeso = e.target.value;
      
        if (typeof atualizarResumoFinal === "function") {
          atualizarResumoFinal();
        }
      });
    });

 
  const camposTextoTopo = ["topo-nome", "topo-idade", "topo-obs"];
  camposTextoTopo.forEach((id) => {
    const elemento = document.getElementById(id);
    if (elemento) {
      elemento.addEventListener("input", () => {
        
        salvarDadosTopoNoPedido();

       
        const resumo = document.getElementById("detalhes-topo-personalizado");
        if (resumo) {
          resumo.innerHTML = `
                        <strong>Topo para:</strong> ${pedido.nomeTopo || "..."} (${pedido.idadeTopo || "0"} anos)<br>
                        ${pedido.obsTopo ? `<small><strong>Obs:</strong> ${pedido.obsTopo}</small>` : ""}
                    `;
          resumo.style.display =
            pedido.nomeTopo || pedido.idadeTopo || pedido.obsTopo
              ? "block"
              : "none";
        }
      });
    }
  });


  const botoesDropdown = document.querySelectorAll(".dropbtn");

  botoesDropdown.forEach((btn) => {
    btn.onclick = function (e) {
      if (window.innerWidth <= 768) {
        e.preventDefault();
        e.stopPropagation(); 

        const pai = this.closest(".dropdown");
        const menu = pai.querySelector(".dropdown-content");

        if (menu) {
         
          document.querySelectorAll(".dropdown-content").forEach((m) => {
            if (m !== menu) m.classList.remove("show");
          });

          menu.classList.toggle("show");
          console.log("Menu alternado com sucesso!");
        }
      }
    };
  });
}


export function inicializarFluxoCarrinho() {
  if (fluxoJaInicializado) return; 
  fluxoJaInicializado = true;

  const btnAvancar = document.getElementById("btnAvancar");
  const btnVoltar = document.getElementById("btnVoltar");
  const btnCarrinhoIcone = document.getElementById("btnCarrinho");
  const btnFechar = document.getElementById("btnFecharCarrinho");
  const overlayLocal = document.getElementById("overlay");
  const emailInput = document.getElementById("emailCliente");

  const radiosTipo = document.querySelectorAll('input[name="tipoDocumento"]');
  const campoInput = document.getElementById("cpfCliente");

  if (campoInput && radiosTipo.length > 0) {
    radiosTipo.forEach((radio) => {
      radio.addEventListener("change", () => {
        campoInput.value = "";
        if (radio.value === "CPF") {
          campoInput.setAttribute("maxlength", "14");
          campoInput.placeholder = "000.000.000-00";
        } else {
          campoInput.setAttribute("maxlength", "18");
          campoInput.placeholder = "00.000.000/0000-00";
        }
        console.log(`Sênior Log: Modo alterado para ${radio.value}`);
      });
    });
  }
  if (campoInput) {
    campoInput.addEventListener("input", (e) => {
      let v = e.target.value.replace(/\D/g, ""); 
      const tipoDoc =
        document.querySelector('input[name="tipoDocumento"]:checked')?.value ||
        "CPF";

      if (tipoDoc === "CPF") {
    
        v = v.replace(/(\d{3})(\d)/, "$1.$2");
        v = v.replace(/(\d{3})(\d)/, "$1.$2");
        v = v.replace(/(\d{3})(\d{1,2})$/, "$1-$2");
      } else {
       
        v = v.replace(/^(\d{2})(\d)/, "$1.$2");
        v = v.replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3");
        v = v.replace(/\.(\d{3})(\d)/, ".$1/$2");
        v = v.replace(/(\d{4})(\d)/, "$1-$2");
      }

      e.target.value = v; 
    });
  }



  if (btnCarrinhoIcone) {
    btnCarrinhoIcone.onclick = function (e) {
      e.preventDefault();
      console.log("Ícone da sacola clicado");
      abrirDrawer(); 
    };
  }

  const btnPix = document.getElementById("btnMetodoPix");
  const btnCartao = document.getElementById("btnMetodoCartao");
  const btnPagar50 = document.getElementById("btnPagar50");
  const btnPagar100 = document.getElementById("btnPagar100");

 
  if (btnPagar50) {
    btnPagar50.addEventListener("click", () => selecionarPorcentagem(0.5));
  }
  if (btnPagar100) {
    btnPagar100.addEventListener("click", () => selecionarPorcentagem(1.0));
  }


  if (btnPix) {
    btnPix.addEventListener("click", () => escolherMetodo("pix"));
  }
  if (btnCartao) {
    btnCartao.addEventListener("click", () => escolherMetodo("credit_card"));
  }

 
  if (btnAvancar) {
    const novoBtnAvancar = btnAvancar.cloneNode(true);
    btnAvancar.parentNode.replaceChild(novoBtnAvancar, btnAvancar);

    novoBtnAvancar.addEventListener("click", (e) => {
    
      if (processandoClique) return;
      processandoClique = true;
      novoBtnAvancar.style.pointerEvents = "none";

      console.log("DEBUG: Clique ÚNICO real. Etapa:", etapaAtual);


      if (etapaAtual === 0 && pedido.pesoKg > 0) {
        console.log(
          "Sênior Log: Rascunho detectado. Salvando automaticamente...",
        );
        adicionarBoloAoCarrinho(); 
      }

      
      if (etapaAtual === 1) {
        const nome = document.getElementById("nomeCliente")?.value.trim();
        const tel = document.getElementById("telefoneCliente")?.value.trim();
        const email = document.getElementById("emailCliente")?.value.trim();
        const data = document.getElementById("dataPedido")?.value;
        const horario = document.getElementById("horarioPedido")?.value;
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

     
        if (!nome || nome.length < 3) {
          processandoClique = false;
          novoBtnAvancar.style.pointerEvents = "auto";
          return alert("⚠️ Digite seu nome.");
        }
        if (!tel || tel.length < 10) {
          processandoClique = false;
          novoBtnAvancar.style.pointerEvents = "auto";
          return alert("⚠️ Por favor, digite um telefone válido.");
        }
        if (!email || !emailRegex.test(email)) {
          processandoClique = false;
          novoBtnAvancar.style.pointerEvents = "auto";
          return alert("⚠️ Por favor, digite um e-mail válido.");
        }
        if (!data) {
          processandoClique = false;
          novoBtnAvancar.style.pointerEvents = "auto";
          return alert("⚠️ Por favor, selecione a data.");
        }
        if (!horario) {
          processandoClique = false;
          novoBtnAvancar.style.pointerEvents = "auto";
          return alert("⚠️ Por favor, selecione o horário.");
        }

        
        const inputDoc = document.getElementById("cpfCliente");
        const docValor = inputDoc?.value.replace(/\D/g, "") || "";
        const tipoDoc =
          document.querySelector('input[name="tipoDocumento"]:checked')
            ?.value || "CPF";

        let docErro = false;
        if (tipoDoc === "CPF" && docValor.length !== 11) docErro = true;
        if (tipoDoc === "CNPJ" && docValor.length !== 14) docErro = true;
        if (/^(\d)\1+$/.test(docValor)) docErro = true; 

        if (docErro) {
          processandoClique = false;
          novoBtnAvancar.style.pointerEvents = "auto";
          alert(`⚠️ O ${tipoDoc} informado é inválido.`);
          inputDoc?.focus();
          return;
        }

        if (!data) {
          processandoClique = false;
          novoBtnAvancar.style.pointerEvents = "auto";
          return alert("⚠️ Por favor, selecione a data.");
        }
        if (!horario) {
          processandoClique = false;
          novoBtnAvancar.style.pointerEvents = "auto";
          return alert("⚠️ Por favor, selecione o horário.");
        }

       
        pedido.cliente = {
          nome,
          telefone: tel,
          email,
          data,
          horario,
          documento: docValor, 
          tipoDocumento: tipoDoc, 
        };

        localStorage.setItem("carrinho_dayane", JSON.stringify(pedido));
        console.log("Sênior Log: Dados e Documento (" + tipoDoc + ") salvos.");
      }

   
      if (etapaAtual === 2) {
        const metodoReal =
          window.metodoSelecionado || localStorage.getItem("metodo_pagamento");
        if (!metodoReal) {
          processandoClique = false;
          novoBtnAvancar.style.pointerEvents = "auto";
          return alert("⚠️ Por favor, selecione uma forma de pagamento.");
        }

        const porcFinal = window.porcentagemPagamento || 1;

        pedido.pagamento = {
          metodo: metodoReal,
          pixPendente: metodoReal === "pix",
          porcentagem: porcFinal,
        };

        pedido.valorPago = (pedido.valorTotal || 0) * porcFinal;
        localStorage.setItem("carrinho_dayane", JSON.stringify(pedido));

       
        finalizarSelecaoPagamento();

    
        setTimeout(() => {
          processandoClique = false;
          novoBtnAvancar.style.pointerEvents = "auto";
        }, 500);

        return; 
      }

   
      if (etapaAtual < etapas.length - 1) {
        const proxima = etapaAtual + 1;

        if (proxima === 3) {
          atualizarResumoFinal();
          const containerMP = document.getElementById("container-pagamento-mp");
          if (containerMP) containerMP.style.display = "block";
        }

        mostrarEtapa(proxima);

        setTimeout(() => {
          processandoClique = false; 
          novoBtnAvancar.style.pointerEvents = "auto";
        }, 500);
      }
    });
  }

  btnVoltar?.addEventListener("click", () => {
    if (etapaAtual > 0) mostrarEtapa(etapaAtual - 1);
  });


  btnFechar?.addEventListener("click", fecharDrawer);
  overlayLocal?.addEventListener("click", fecharDrawer);


  if (emailInput) {
    emailInput.oninput = (e) => {
      if (!pedido.cliente) pedido.cliente = {}; 
      pedido.cliente.email = e.target.value.trim();
    };
  }
}

export function configurarDropdown(botaoId, menuId) {
  const btnProdutos = document.querySelector(".dropbtn");

  if (btnProdutos) {
   
    btnProdutos.replaceWith(btnProdutos.cloneNode(true));
    const novoBtn = document.querySelector(".dropbtn");

    novoBtn.addEventListener("click", function (e) {
      if (window.innerWidth <= 768) {
        e.preventDefault();
        e.stopPropagation();

       
        const menuApropriado =
          this.parentElement.querySelector(".dropdown-content");

        if (menuApropriado) {
          menuApropriado.classList.toggle("show");
          console.log("Classe 'show' aplicada ao menu:", menuApropriado);
          console.log(
            "Total de menus abertos:",
            document.querySelectorAll(".dropdown-content.show").length,
          );
        } else {
          console.error(
            "ERRO: O botão foi clicado, mas não encontrei o .dropdown-content ao lado dele!",
          );
        }
      }
    });
  }
}


export function inicializarEventosModais() {
  document.getElementById("abrirModal")?.addEventListener("click", (e) => {
    e.preventDefault();
    if (modalTermos) modalTermos.style.display = "block";
  });

  document
    .querySelector(".fechar")
    ?.addEventListener("click", fecharModalTermos);
  document.getElementById("entendiBtn")?.addEventListener("click", () => {
    fecharModalTermos();
    if (checkTermos) checkTermos.checked = true;
  });

  document
    .getElementById("fecharModalErro")
    ?.addEventListener("click", fecharErro);
  document
    .getElementById("entendiErroBtn")
    ?.addEventListener("click", fecharErro);

  window.addEventListener("click", (event) => {
    if (event.target === modalErro) fecharErro();
    if (event.target === modalTermos) fecharModalTermos();
  });
}

export function inicializarCookies() {
  const caixa = document.getElementById("caixa-cookies");
  const btnAceitar = document.getElementById("btn-aceitar-cookies");
  const btnFechar = document.getElementById("fechar-cookies");


  if (!localStorage.getItem("cookies_aceitos")) {
    if (caixa) caixa.style.display = "block";
  }

  if (btnAceitar) {
    btnAceitar.onclick = () => {
      localStorage.setItem("cookies_aceitos", "true");
      if (caixa) caixa.style.display = "none";
    };
  }

  if (btnFechar) {
    btnFechar.onclick = () => {
      if (caixa) caixa.style.display = "none";
    };
  }
}

export function salvarDadosTopoNoPedido() {
  pedido.nomeTopo = document.getElementById("topo-nome")?.value || "";
  pedido.idadeTopo = document.getElementById("topo-idade")?.value || "";
  pedido.obsTopo = document.getElementById("topo-obs")?.value || "";
}


export function inicializarEventosInputTopo() {
  const campos = ["nomeTopo", "idadeTopo", "obsTopo"];

  campos.forEach((id) => {
    const elemento = document.getElementById(id);
    if (elemento) {
      elemento.addEventListener("input", (e) => {
        pedido[id] = e.target.value;
        salvarNoLocalStorage(); 
        atualizarDadosCarrinho(); 
      });
    }
  });
}


export function inicializarEventosRemocaoCarrinho() {
  const drawerCarrinho = document.getElementById("drawerCarrinho");
  if (!drawerCarrinho) return;

  drawerCarrinho.addEventListener("click", function (event) {
    const btnExcluir = event.target.closest(".lixeira");
    if (!btnExcluir) return;

    const tipo = btnExcluir.getAttribute("data-item");

    if (tipo === "bolo") {
      pedido.pesoKg = 0; 
      pedido.massa = null;
      pedido.recheios = [];
      pedido.complemento = null;
      pedido.modelo = null;
    } else if (tipo === "topo") {
      pedido.topo = false;
      pedido.nomeTopo = "";
    } else if (tipo === "embalagem") {
      pedido.embalagem = false;
    }

    resetarBotoesVisualmente(tipo); 

    if (typeof atualizarTudo === "function") {
      atualizarTudo(); 
    }
    atualizarDadosCarrinho(); 
  });
}

export function inicializarEventosSetas() {
  const btnAnt = document.querySelector(".seta-anterior");
  const btnProx = document.querySelector(".seta-proximo");
  if (btnAnt) btnAnt.addEventListener("click", () => scrollCarousel(-1));
  if (btnProx) btnProx.addEventListener("click", () => scrollCarousel(1));
}


export function excluirPedidoBolo() {
  pedido.pesoKg = 0;
  pedido.recheios = [];
  pedido.massa = "";


  pedido.itens = (pedido.itens || []).filter((item) => item.tipo !== "bolo");

  resetarBotoesVisualmente("bolo");
  limparDescricoesCarrinho();
  atualizarTudo();
  atualizarContadorSacola(); 
}


window.clicarBotaoAdicionarDoce = function (nome, quantidade, precoUnitario) {
  const qtd = parseInt(quantidade);

  if (isNaN(qtd) || qtd < 25) {
    alert("A quantidade mínima é de 25 unidades por sabor.");
    return;
  }

  const novoDoce = {
    nome: nome,
    quantidade: qtd,
    valor: parseFloat(qtd * precoUnitario),
  };

  adicionarDoceAoPedido(novoDoce);

 
  console.log(`Sucesso: ${qtd}x ${nome} adicionados ao pedido.`);
};
