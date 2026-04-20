import { feriadosFixos, CONFIG } from "/static/js/config.js";
import { pedido } from "/static/js/state.js";
import { atualizarTudo } from "/static/js/calculate.js";

/* ===============================
    CALENDÁRIO E DATAS
=============================== */
export function configurarCalendario() {
  const dataInput = document.getElementById("dataPedido");
  if (!dataInput) return;

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0); 

  const temPersonalizado = pedido.itens?.some(
    (item) => item.tipo === "personalizado",
  );
  const temDoces =
    (pedido.doces && pedido.doces.length > 0) ||
    pedido.itens?.some((item) => item.tipo === "doces") ||
    document.body.getAttribute("data-pagina") === "doces";

  const diasAntecedencia = temPersonalizado || temDoces ? 2 : 1;

  let dataMinima = new Date(hoje);
  dataMinima.setDate(hoje.getDate() + diasAntecedencia);


  const dataFormatada = dataMinima.toISOString().split("T")[0];
  dataInput.setAttribute("min", dataFormatada);

  
  let validando = false;

  dataInput.addEventListener("blur", function () {

    if (validando) return;

    const valor = this.value;
    if (!valor || valor.length < 10) return; 

    validando = true;

  
    const dataSelecionada = new Date(valor + "T00:00:00");
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const diffTempo = dataSelecionada.getTime() - hoje.getTime();
    const diffDias = Math.round(diffTempo / (1000 * 60 * 60 * 24));
    const diaSemana = dataSelecionada.getDay();

  
    if (diffDias < diasAntecedencia || diaSemana === 0) {
      setTimeout(() => {
        const msg =
          diaSemana === 0
            ? "🧁 Não realizamos entregas aos domingos."
            : `🧁 Ops! Para este pedido precisamos de ${diasAntecedencia} dia(s) de antecedência.`;

        alert(msg);
        this.value = "";
        validando = false;
      }, 500); 
      return;
    }

    
    if (typeof window.gerarOpcoesDeHorario === "function") {
      window.gerarOpcoesDeHorario(dataSelecionada);
    }

    if (!pedido.cliente) pedido.cliente = {};
    pedido.cliente.data = valor;
    localStorage.setItem("carrinho_dayane", JSON.stringify(pedido));

    setTimeout(() => {
      validando = false;
    }, 1000); 
  });
}

export function gerarOpcoesDeHorario(dataSelecionada) {
  const horarioSelect = document.getElementById("horarioPedido");
  if (!horarioSelect) return;

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const amanha = new Date(hoje);
  amanha.setDate(hoje.getDate() + 1);


  const ehAmanha =
    dataSelecionada.getDate() === amanha.getDate() &&
    dataSelecionada.getMonth() === amanha.getMonth() &&
    dataSelecionada.getFullYear() === amanha.getFullYear();

  const diaSemana = dataSelecionada.getDay();
  horarioSelect.innerHTML = '<option value="">Selecione o horário</option>';

  let horarios = []; 
  // REGRA 1: Pedido para AMANHÃ (Somente Corte/Clássico)
  if (ehAmanha) {
    if (diaSemana === 6) {
      // Se amanhã for Sábado
      horarios = ["16h às 17h"];
    } else {
      // Segunda a Sexta
      horarios = ["16h às 17h", "17h às 18h", "18h às 19h"];
    }
  }
  // REGRA 2: Pedido com 2 dias ou mais (Horário Comercial)
  else {
    if (diaSemana === 6) {
      // Sábados
      horarios = [
        "09h às 10h",
        "10h às 11h",
        "11h às 12h",
        "13h às 14h",
        "14h às 15h",
        "15h às 16h",
        "16h às 17h",
      ];
    } else {
      // Dias de semana
      horarios = [
        "09h às 10h",
        "10h às 11h",
        "11h às 12h",
        "13h às 14h",
        "15h às 16h",
        "16h às 17h",
        "17h às 18h",
        "18h às 19h",
      ];
    }
  }

  horarios.forEach((h) => {
    const opt = document.createElement("option");
    opt.value = h;
    opt.textContent = h;
    horarioSelect.appendChild(opt);
  });
}

window.gerarOpcoesDeHorario = gerarOpcoesDeHorario;

export function formatarDataBR(data) {
  if (!data) return "Não selecionada";
  const [ano, mes, dia] = data.split("-");
  return `${dia}/${mes}/${ano}`;
}

export function aplicarMascaraTelefone() {
  const telInput = document.getElementById("telefoneCliente");
  if (!telInput) return;

  telInput.addEventListener("input", (e) => {
    let value = e.target.value.replace(/\D/g, "");
    if (value.length > 11) value = value.slice(0, 11);

    if (value.length > 10) {
      value = value.replace(/^(\2d)(\d{5})(\d{4})/, "($1) $2-$3");
    } else if (value.length > 5) {
      value = value.replace(/^(\2d)(\d{4})(\d{0,4})/, "($1) $2-$3");
    } else if (value.length > 2) {
      value = value.replace(/^(\2d)(\d{0,5})/, "($1) $2");
    } else if (value.length > 0) {
      value = value.replace(/^(\d*)/, "($1");
    }
    e.target.value = value;
  });
}

export function obterRecheiosSelecionados() {
  return Array.from(
    document.querySelectorAll('input[name="recheio"]:checked'),
  ).map((cb) => cb.value);
}

export async function uploadFoto(arquivo) {
  try {
    const formData = new FormData();
    formData.append("image", arquivo);

    const url = `https://api.imgbb.com/1/upload?key=${CONFIG.IMGBB_API_KEY}`;

    const response = await fetch(url, {
      method: "POST",
      body: formData,
    });

    const data = await response.json();

    if (data.success) {
      console.log("✅ Upload feito com sucesso!");
      return data.data.url; 
    } else {
      console.error("❌ Erro no ImgBB:", data.error.message);
      return null;
    }
  } catch (error) {
    console.error("❌ Erro na rede:", error);
    return null;
  }
}


export async function previewImagem(event) {
  const file = event.target.files[0];
  if (!file) return;

  if (file.size > 10 * 1024 * 1024) {
    // 10MB
    alert("A imagem é muito pesada! Escolha uma foto menor que 10MB.");
    event.target.value = "";
    return;
  }

  const reader = new FileReader();

  
  reader.onload = async function () {
    const output = document.getElementById("preview-img");
    if (output) {
      output.src = reader.result;
      output.style.display = "block";
    }

   
    console.log("Subindo imagem para o servidor...");

  
    const linkOficial = await uploadFoto(file);

    if (linkOficial) {
     
      pedido.modeloImagem = linkOficial;
      window.imagemReferenciaCliente = linkOficial;

      console.log("✅ Imagem pronta:", linkOficial);
      salvarNoLocalStorage();
      atualizarDadosCarrinho();
    } else {
      alert("Erro ao processar imagem. Tente novamente.");
    }
  };

  reader.readAsDataURL(file);
}

export function removerLoteDoce(nome) {
  
  const index = pedido.doces.findIndex((d) => d.nome === nome);
  if (index > -1) {
    pedido.doces.splice(index, 1);
    pedido.valorDoce = pedido.doces.reduce((t, i) => t + i.valor, 0);
    atualizarTudo();
  }
}

export function validarCarrinhoAntesDeAbrir() {
  const temDoces = pedido.doces && pedido.doces.length > 0;
  const temBolo = pedido.pesoKg > 0 && pedido.massa;

  
  if (!temDoces && !temBolo) {
    alert("Sua sacola está vazia! Escolha um bolo ou docinhos.");
    return false;
  }

  
  if (pedido.pesoKg > 0 && !pedido.massa) {
    alert("Você selecionou o peso do bolo, mas esqueceu de escolher a massa!");
    return false;
  }

  return true;
}
