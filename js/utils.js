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
    let dataMinima = new Date(hoje);
    dataMinima.setDate(hoje.getDate() + 1);
    dataInput.setAttribute("min", dataMinima.toISOString().split("T")[0]);

    dataInput.addEventListener("change", function() {
        if (!this.value) return;

        const dataSelecionada = new Date(this.value + "T00:00:00");
        const diaSemana = dataSelecionada.getDay();
        const anoSelecionado = dataSelecionada.getFullYear();
        
        // Feriados Móveis (Ex: Carnaval 2026 - Ajuste conforme o ano se necessário)
        const inicioCarnaval = new Date(`${anoSelecionado}-02-14T00:00:00`);
        const fimCarnaval = new Date(`${anoSelecionado}-02-18T00:00:00`);

        const mesDia = (dataSelecionada.getMonth() + 1).toString().padStart(2, '0') + "-" + 
                       dataSelecionada.getDate().toString().padStart(2, '0');

        if (diaSemana === 0) {
            alert("🧁 Não realizamos entregas aos domingos.");
            this.value = "";
            return;
        }

        if (feriadosFixos.includes(mesDia)) {
            alert("🧁 Ops! Esta data é feriado e não teremos retiradas.");
            this.value = "";
            return;
        }

        if (dataSelecionada >= inicioCarnaval && dataSelecionada <= fimCarnaval) {
            alert("🎊 No período de Carnaval não teremos retiradas.");
            this.value = "";
            return;
        }
    });
}

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