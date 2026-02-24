import { pedido } from './state.js';
import { atualizarDadosCarrinho } from './ui-updates.js';

// ====== 1. CONSTANTES DE PREÇO ======
// Usar constantes evita que você tenha que mudar o número em vários lugares depois
const PRECO_POR_KG = 95;             
const PRECO_CORTE = 90;              
const PRECO_PERSONALIZADO = 105;     
const VALOR_TOPO_PERSONALIZADO = 30;
const VALOR_TOPO_PADRAO = 20;
const PRECO_EMBALAGEM = 10;
const ADICIONAL_NUTELLA_GELEIA = 20;

// ====== 2. FUNÇÃO DE CÁLCULO TOTAL ======
export function calcularTotal(p, tipoPagina) {
    let total = 0;
    
    // Lógica para DOCES
    // Se for página de doces, não calculamos peso de bolo
    if (tipoPagina === 'doces') {
        // Retornamos apenas adicionais fixos se houver (topo/embalagem)
        // A soma dos doces em si será feita na atualizarTudo para evitar erro
        if (p.topo) total += VALOR_TOPO_PADRAO;
        if (p.embalagem) total += PRECO_EMBALAGEM;
        return total;
    }

    // Lógica para BOLOS
    let precoBaseKg = PRECO_POR_KG; 
    if (tipoPagina === 'corte') {
        precoBaseKg = PRECO_CORTE;
    } else if (tipoPagina === 'personalizado') {
        precoBaseKg = PRECO_PERSONALIZADO;
    }

    const peso = parseFloat(p.pesoKg) || 0;

    // Cálculo do peso do Bolo
    if (peso > 0) {
        total += (peso * precoBaseKg);
        
        // Adicionais de Recheio (Nutella) - Multiplicado pelo peso
        if (p.recheios && p.recheios.includes("Nutella")) {
            total += (ADICIONAL_NUTELLA_GELEIA * peso);
        }
        
        // Adicionais de Complemento (Geleias) - Multiplicado pelo peso
        if (p.complemento && p.complemento.includes("Geleia")) {
            total += (ADICIONAL_NUTELLA_GELEIA * peso);
        }
    }

    // Itens Fixos (Não multiplicam pelo peso)
    if (p.topo) {
        total += (tipoPagina === 'personalizado') ? VALOR_TOPO_PERSONALIZADO : VALOR_TOPO_PADRAO;
    }
    
    if (p.embalagem) {
        total += PRECO_EMBALAGEM;
    }

    return total;
}

// ====== 3. ATUALIZAÇÃO DA INTERFACE ======
export function atualizarTudo() {
    const tipoPagina = document.body.getAttribute('data-pagina') || 'doces';
    
    const campoPeso = document.getElementById('pesoSelect') || document.getElementById('pesoBolo');
    if (campoPeso) {
        pedido.pesoKg = parseFloat(campoPeso.value) || 0;
    }

    // 1. Pega o valor base (Bolo ou Adicionais)
    const valorBase = calcularTotal(pedido, tipoPagina); 

    // 2. Soma os doces
    const valorApenasDoces = (pedido.doces || []).reduce((acc, d) => acc + (parseFloat(d.valor) || 0), 0);
    
    // 3. Valor Final Real
    const valorFinal = valorBase + valorApenasDoces;
    pedido.valorTotal = valorFinal;

    const totalFormatado = valorFinal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    // 4. Mapeamento correto para evitar o erro "is not defined"
    const mapaIdsPagina = {
        'doces': 'valorTotalDoces',
        'personalizado': 'valorTotalPersonalizado',
        'corte': 'valorTotalCorte',
        'pedido': 'valorTotalPedido'
    };

    // 5. Atualização em massa de todos os campos de total conhecidos
    const idsParaAtualizar = [
        'valorTotalDoces', 
        'valorTotalPersonalizado', 
        'valorTotalCorte', 
        'valorTotalPedido', 
        'valorTotalRodape', 
        'valorTotalResumo'
    ];

    idsParaAtualizar.forEach(id => {
        const elemento = document.getElementById(id);
        if (elemento) {
            elemento.innerText = totalFormatado;
        }
    });


    // 6. Atualiza o display específico da página atual (usando o nome correto da variável)
    const idEspecifico = mapaIdsPagina[tipoPagina]; // Corrigido de mapaIds para mapaIdsPagina
    if (idEspecifico) {
        const displayPagina = document.getElementById(idEspecifico);
        if (displayPagina) {
            displayPagina.innerText = totalFormatado;
        }
    }


    // No calculate.js, dentro de atualizarTudo:
    const displayDrawer = document.getElementById('valorTotalRodape');
    if (displayDrawer) {
        displayDrawer.innerText = totalFormatado;
        
        // ACRESCENTAR: Isso garante que o valor vá para a direita independente do bloco de peso
        const containerPai = displayDrawer.closest('.total-card');
        if (containerPai) {
            containerPai.parentElement.style.display = "flex";
            containerPai.parentElement.style.justifyContent = "flex-end";
            containerPai.parentElement.style.width = "100%";
        }
    }

    // --- AJUSTE DO FALTA PAGAR ---
    const displayFaltaPagar = document.getElementById('valorFaltaPagar'); // Verifique se este é o seu ID

    if (displayFaltaPagar) {
        // 1. Pegamos o valor total que já calculamos antes na função
        const total = pedido.valorTotal || 0;

        // 2. Pegamos o valor que o cliente já digitou no campo de "Valor Pago"
        // Mantendo o ID que costuma estar no seu HTML
        const inputJaPago = document.getElementById('valorPagoInput'); 
        const jaPago = inputJaPago ? parseFloat(inputJaPago.value) || 0 : 0;

        // 3. Cálculo sênior: total menos o que já foi pago
        const faltaPagar = total - jaPago;

        // 4. Exibição (Garante que não mostre números negativos)
        const valorDisplay = faltaPagar > 0 ? faltaPagar : 0;
        
        displayFaltaPagar.innerText = valorDisplay.toLocaleString('pt-BR', { 
            style: 'currency', 
            currency: 'BRL' 
        });
    }
    // 7. Sincroniza a Sacola e o Carrinho (Sem duplicar chamadas)
    if (typeof atualizarContadorSacola === "function") {
        atualizarContadorSacola();
    }
}
