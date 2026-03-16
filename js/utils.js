import { feriadosFixos } from './config.js';
import { pedido } from './state.js';
import { atualizarTudo } from './calculate.js';

/* ===============================
    CALENDÁRIO E DATAS
=============================== */
export function configurarCalendario() {
    const dataInput = document.getElementById("dataPedido");
    if (!dataInput) return;

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0); // Garante que o cálculo comece do início do dia

    const temPersonalizado = pedido.itens?.some(item => item.tipo === 'personalizado');
    const temDoces = (pedido.doces && pedido.doces.length > 0) || 
                     (pedido.itens?.some(item => item.tipo === 'doces')) ||
                     (document.body.getAttribute('data-pagina') === 'doces');
    
    // Define se pula 1 ou 2 dias
    const diasAntecedencia = (temPersonalizado || temDoces) ? 2 : 1;

    let dataMinima = new Date(hoje);
    dataMinima.setDate(hoje.getDate() + diasAntecedencia);
    
    // FORMATAÇÃO MANUAL (Evita o erro de fuso horário do ISOString)
    const ano = dataMinima.getFullYear();
    const mes = String(dataMinima.getMonth() + 1).padStart(2, '0');
    const dia = String(dataMinima.getDate()).padStart(2, '0');
    const dataFormatada = `${ano}-${mes}-${dia}`;

    // AQUI ESTAVA O ERRO: Use apenas a dataFormatada
    dataInput.setAttribute("min", dataFormatada);

    dataInput.addEventListener("change", function() {
        if (!this.value) return;

        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);

        // Corrigindo o erro de fuso horário e declarando a variável
        const dataSelecionada = new Date(this.value + "T00:00:00");
        
        // CALCULA AQUI (A causa do seu erro era a falta desta linha ou da declaração let/const)
        const diffDias = Math.ceil((dataSelecionada - hoje) / (1000 * 60 * 60 * 24));
        
        const diaSemana = dataSelecionada.getDay();

        // Pega os dados do pedido para saber a antecedência
        const temPersonalizado = pedido.itens?.some(item => item.tipo === 'personalizado');
        const temDoces = (pedido.doces && pedido.doces.length > 0);
        const diasNecessarios = (temPersonalizado || temDoces) ? 2 : 1;

        if (diffDias < diasNecessarios) {
            alert(`🧁 Ops! Para este pedido precisamos de ${diasNecessarios} dia(s) de antecedência.`);
            this.value = "";
            return;
        }

        if (diaSemana === 0) {
            alert("🧁 Não realizamos entregas aos domingos.");
            this.value = "";
            return;
        }

        if (typeof window.gerarOpcoesDeHorario === 'function') {
            window.gerarOpcoesDeHorario(dataSelecionada);
        }
        
        if (!pedido.cliente) pedido.cliente = {};
        pedido.cliente.data = this.value;
        localStorage.setItem('carrinho_dayane', JSON.stringify(pedido));
    });
}

export function gerarOpcoesDeHorario(dataSelecionada) {
    const horarioSelect = document.getElementById("horarioPedido");
    if (!horarioSelect) return;

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    
    const amanha = new Date(hoje);
    amanha.setDate(hoje.getDate() + 1);

    // Compara se a data clicada é igual a AMANHÃ
    const ehAmanha = dataSelecionada.getDate() === amanha.getDate() && 
                     dataSelecionada.getMonth() === amanha.getMonth() &&
                     dataSelecionada.getFullYear() === amanha.getFullYear();

    const diaSemana = dataSelecionada.getDay(); 
    horarioSelect.innerHTML = '<option value="">Selecione o horário</option>';
    
    let horarios = []; // Declaramos uma vez só aqui no topo

    // REGRA 1: Pedido para AMANHÃ (Somente Corte/Clássico)
    if (ehAmanha) {
        if (diaSemana === 6) { // Se amanhã for Sábado
            horarios = ["16h às 17h"];
        } else { // Segunda a Sexta
            horarios = ["16h às 17h", "17h às 18h", "18h às 19h"];
        }
    } 
    // REGRA 2: Pedido com 2 dias ou mais (Horário Comercial)
    else {
        if (diaSemana === 6) { // Sábados
            horarios = ["09h às 10h", "10h às 11h", "11h às 12h", "13h às 14h", "14h às 15h", "15h às 16h", "16h às 17h"];
        } else { // Dias de semana
            horarios = ["09h às 10h", "10h às 11h", "11h às 12h", "13h às 14h", "15h às 16h", "16h às 17h", "17h às 18h", "18h às 19h"];
        }
    }

    horarios.forEach(h => {
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
/* ===============================
    MÁSCARAS E INPUTS
=============================== */
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
    return Array.from(document.querySelectorAll('input[name="recheio"]:checked')).map(cb => cb.value);
}

/* ===============================
    IMAGENS E MÍDIA
=============================== */
export function previewImagem(event) {
    const file = event.target.files[0];
    const reader = new FileReader();

    reader.onload = function() {
        // --- MANTER SUAS REGRAS VISUAIS ---
        const output = document.getElementById('preview-img');
        if(output) {
            output.src = reader.result;
            output.style.display = "block";
        }
        
        window.imagemReferenciaCliente = reader.result; 
        
        const imgCart = document.getElementById('cartImagemPersonalizada');
        if (imgCart) {
            imgCart.src = reader.result;
            imgCart.style.display = 'block';
        }

        // --- ACRÉSCIMO SÊNIOR: PERSISTÊNCIA ---
        // Aqui conectamos o upload ao objeto que vai para a sacola
        pedido.modeloImagem = reader.result; 
        salvarNoLocalStorage();
        atualizarDadosCarrinho(); 
    };
    
    if (file) reader.readAsDataURL(file);
}

/* ===============================
    LOGICA DE CARRINHO / VALIDAÇÃO
=============================== */
export function removerLoteDoce(nome) {
    // Remove apenas o primeiro lote encontrado desse sabor
    const index = pedido.doces.findIndex(d => d.nome === nome);
    if (index > -1) {
        pedido.doces.splice(index, 1);
        pedido.valorDoce = pedido.doces.reduce((t, i) => t + i.valor, 0);
        atualizarTudo();
    }
}

export function validarCarrinhoAntesDeAbrir() {
    const temDoces = pedido.doces && pedido.doces.length > 0;
    const temBolo = pedido.pesoKg > 0 && pedido.massa;

    // Se não tem nada, bloqueia
    if (!temDoces && !temBolo) {
        alert("Sua sacola está vazia! Escolha um bolo ou docinhos.");
        return false;
    }

    // Se ele começou a montar um bolo mas não terminou (faltou massa ou recheio)
    if (pedido.pesoKg > 0 && !pedido.massa) {
        alert("Você selecionou o peso do bolo, mas esqueceu de escolher a massa!");
        return false;
    }

    return true; 
}