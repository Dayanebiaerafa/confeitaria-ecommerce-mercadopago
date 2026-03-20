import { pedido, etapaAtual, setEtapaAtual, porcentagemPagamento, setMetodoSelecionado, metodoSelecionado, setPorcentagemPagamento, removerDoceDoPedido, salvarNoLocalStorage, excluirItemSacola } from './state.js';
import { formatarDataBR, removerLoteDoce } from './utils.js';
import { calcularTotal, atualizarTudo, calcularValorApenasDesteBolo } from './calculate.js';


// --- ELEMENTOS PRINCIPAIS ---
export const drawer = document.getElementById("drawerCarrinho");
export const overlay = document.getElementById("overlay");
export const cartCount = document.querySelector(".cart-count");
export const etapas = [
    document.getElementById("etapaCarrinho"),
    document.getElementById("etapaIdentificacao"),
    document.getElementById("etapaPagamento"),
    document.getElementById("etapaFinalizar")
];
export const steps = document.querySelectorAll(".step");

// Elementos de controle do rodapé (Capturados aqui para evitar erro de 'not defined')
const rodapeAcoes = document.querySelector(".drawer-footer");
const btnAvancar = document.getElementById("btnAvancar");
const btnVoltar = document.getElementById("btnVoltar");

// Elementos de Modal
export const modalTermos = document.getElementById("modalTermos");
export const modalErro = document.getElementById("modalErroAceite");
export const checkTermos = document.getElementById("checkTermos");

/* ===============================
   FUNÇÕES DE UI E NAVEGAÇÃO
=============================== */

export function atualizarContadorSacola() {
    const badges = document.querySelectorAll(".cart-count");
    if (badges.length === 0) return;

    // 1. Soma os doces
    const totalDoces = (pedido.doces || []).reduce((acc, d) => acc + (d.qtd || 0), 0);
    
    // 2. Soma os bolos que já foram "Adicionados à Sacola"
    const totalBolosNaSacola = (pedido.itens || []).length;
    
    // 3. Verifica se tem um bolo sendo montado agora (antes de clicar em adicionar)
    const temBoloSendoMontado = (pedido.pesoKg > 0 && pedido.massa) ? 1 : 0;

    const somaTotal = totalDoces + totalBolosNaSacola + temBoloSendoMontado;

    badges.forEach(badge => {
        badge.innerText = somaTotal;
        badge.style.display = somaTotal > 0 ? 'flex' : 'none';
    });
}


export function abrirDrawer() {
    const drawer = document.getElementById('drawerCarrinho'); 
    const overlay = document.getElementById('overlay');

    if (drawer && overlay) {
        const dadosSalvos = localStorage.getItem('carrinho_dayane');
        if (dadosSalvos) {
            Object.assign(pedido, JSON.parse(dadosSalvos));
        }

        drawer.classList.add("ativo");
        overlay.classList.add("ativo");
        
        mostrarEtapa(0); 
        atualizarDadosCarrinho();

        // --- AQUI ESTÁ O SEGREDO SÊNIOR ---
        // Se a etapa 0 já for a de pagamento, ou se você quiser pré-carregar:
        inicializarCheckoutTransparente(); 
    } else {
        console.error("Erro: Elementos do drawer não encontrados!");
    }
}

export function fecharDrawer() {
    if (drawer && overlay) {
        drawer.classList.remove("ativo");
        overlay.classList.remove("ativo");
    }
}

export function mostrarEtapa(index) {
    console.trace("📍 Navegando para etapa: " + index);

    // --- SUA LÓGICA DE REDIRECIONAMENTO (MANTIDA) ---
    if (index === 1 && window.bloquearEtapa1) {
        console.warn("🚫 Redirecionando para Etapa 3...");
        window.bloquearEtapa1 = false;
        mostrarEtapa(3);
        return; 
    }

    window.scrollTo(0, 0); 

    // --- SUA LÓGICA DE RESET DE SCROLL (MANTIDA) ---
    const drawerContent = document.querySelector(".drawer-content");
    if (drawerContent) {
        drawerContent.scrollTop = 0;
    }

    // --- SUA LÓGICA DE SEGURANÇA NO INDEX 2 (MANTIDA E REFORÇADA) ---
    // Por que manter? Porque se o usuário volta para escolher o método, 
    // precisamos limpar os vestígios do Mercado Pago anterior.
    if (index === 2) {
        if (typeof restaurarEstadoBotoesPagamento === 'function') restaurarEstadoBotoesPagamento();
        if (typeof intervaloPix !== 'undefined') clearInterval(intervaloPix);
        
        window.mpInstanciado = false; 
        const brickContainer = document.getElementById("paymentBrick_container");
        if (brickContainer) brickContainer.innerHTML = ""; 

        const containerMP = document.getElementById("container-pagamento-mp");
        const pixContainer = document.getElementById("pix-container");
        if (containerMP) containerMP.style.display = "block";
        if (pixContainer) pixContainer.style.display = "none";
    }

    // --- GERENCIAMENTO DE DIVS (OTIMIZADO) ---
    const listaEtapas = [
        document.getElementById("etapaCarrinho"),
        document.getElementById("etapaIdentificacao"),
        document.getElementById("etapaPagamento"),
        document.getElementById("etapaFinalizar")
    ];

    listaEtapas.forEach((etapa, i) => {
        if (etapa) {
            if (i === index) {
                etapa.classList.remove("hidden");
                etapa.style.display = "block"; // Essencial para o Mercado Pago ler a largura
            } else {
                etapa.classList.add("hidden");
                etapa.style.display = "none";
            }
        }
    });

    // --- LÓGICA DA ETAPA DE PAGAMENTO (INDEX 3) - O AJUSTE SÊNIOR ---
    if (index === 3) {
        window.mpInstanciado = false; 
        const pixContainer = document.getElementById("pix-container");
        const containerMP = document.getElementById("container-pagamento-mp");
        const brickC = document.getElementById("paymentBrick_container");
        
        const dadosPixRaw = localStorage.getItem('dados_pix_resultado');
        const temPixPendente = localStorage.getItem('ultimo_pedido_id');

        if (temPixPendente && dadosPixRaw) {
            // --- SUA LÓGICA DE EXIBIÇÃO DE PIX (MANTIDA) ---
            const pixDados = JSON.parse(dadosPixRaw);
            if (containerMP) containerMP.style.display = "none";
            if (pixContainer) {
                pixContainer.style.display = "flex";
                pixContainer.style.flexDirection = "column";
                pixContainer.style.alignItems = "center";

                const qrImg = document.getElementById("pix-qr-img");
                const copiaCola = document.getElementById("pix-copia-e-cola");
                
                if (qrImg && !qrImg.src.includes('base64') && pixDados.qr_code_base64) {
                    qrImg.src = `data:image/png;base64,${pixDados.qr_code_base64}`;
                }
                if (copiaCola && !copiaCola.value && pixDados.qr_code) {
                    copiaCola.value = pixDados.qr_code;
                }
            }
        } else {
            // --- FLUXO MERCADO PAGO COM TÉCNICA SÊNIOR ---
            if (pixContainer) pixContainer.style.display = "none";
            if (containerMP) {
                containerMP.style.display = "block";
                if (brickC) brickC.innerHTML = ""; 
                
                // TÉCNICA SÊNIOR: Espera o navegador confirmar que a div está na tela
                if (typeof MercadoPago !== 'undefined') {
                    requestAnimationFrame(() => {
                        // O timeout de 100ms é o "doce" perfeito: rápido o suficiente para não notar, 
                        // lento o suficiente para o DOM estar pronto.
                        setTimeout(() => {
                            if (typeof inicializarCheckoutTransparente === 'function') {
                                inicializarCheckoutTransparente();
                            }
                        }, 100);
                    });
                }
            }
        }

        // --- GESTÃO INTELIGENTE DO BOTÃO ALTERAR ---
        let btnTroca = document.getElementById("btn-alterar-pagamento");
        if (!btnTroca) {
            btnTroca = document.createElement("button");
            btnTroca.id = "btn-alterar-pagamento";
            btnTroca.className = "btn-link-pequeno"; 
            btnTroca.innerText = "🔄 Alterar forma de pagamento";
            btnTroca.style.display = "block";
            btnTroca.style.margin = "20px auto";
            document.getElementById("etapaFinalizar").appendChild(btnTroca);
        }
        
        btnTroca.onclick = () => {
            localStorage.removeItem('ultimo_pedido_id');
            localStorage.removeItem('dados_pix_resultado');
            if (window.intervaloPix) clearInterval(window.intervaloPix);
            if (brickC) brickC.innerHTML = ""; 
            mostrarEtapa(2); 
        };
    }

    // --- CONTROLE DOS BOTÕES E RODAPÉ (MANTIDO) ---
    const btnVoltar = document.getElementById("btnVoltar");
    const btnAvancar = document.getElementById("btnAvancar");
    const rodape = document.querySelector(".rodape-acoes"); // Nome corrigido conforme seu print

    if (btnVoltar) {
        btnVoltar.style.display = (index === 0) ? "none" : "block";
    }

    if (btnAvancar) {
        btnAvancar.style.display = (index >= 3) ? "none" : "block";
    }

    if (rodape) {
        rodape.style.display = "flex";
        // TÉCNICA SÊNIOR: flex-end joga tudo para a direita quando o Voltar some.
        // space-between mantém um em cada ponta quando ambos aparecem.
        if (index === 0) {
            rodape.style.justifyContent = "flex-end";
        } else {
            rodape.style.justifyContent = "space-between";
        }
    }

    // Atualiza estados visuais (Suas funções originais mantidas)
    if (typeof setEtapaAtual === "function") setEtapaAtual(index); 
    if (typeof atualizarStepper === "function") atualizarStepper(index);
    if (typeof atualizarRodape === "function") atualizarRodape(index);
}

window.mostrarEtapa = mostrarEtapa;
        

function atualizarStepper(index) {
    steps.forEach((step, i) => {
        step.classList.remove("active", "completed");
        if (i < index) step.classList.add("completed");
        else if (i === index) step.classList.add("active");
    });
}

function atualizarRodape(index) {
    if (!rodapeAcoes || !btnAvancar || !btnVoltar) return;

    btnVoltar.style.display = index === 0 ? "none" : "inline-block";
    btnAvancar.textContent = index === 3 ? "Finalizar pedido" : "Avançar";
    
    if (index === 0) rodapeAcoes.classList.add("so-avancar");
    else rodapeAcoes.classList.remove("so-avancar");
}

/* ===============================
   LÓGICA DE PRODUTOS E PREÇOS
=============================== */

export function selecionarFormato(formato, event) {
    const selectPeso = document.getElementById('pesoSelect');
    if (!selectPeso) return;

    const paginaAtual = document.body.getAttribute('data-pagina') || 'corte';

    // 1. Limpa o select
    selectPeso.innerHTML = '<option value="">Selecione um peso</option>';
    pedido.pesoKg = 0; 

    let pesos = [];

    // 2. REGRAS DE PESO (Igual ao que você pediu)
    if (paginaAtual === 'corte') {
        if (formato === 'Quadrado') {
            pesos = [{t:"3kg - Serve até 30 pessoas",v:"3"},{t:"4kg - Serve até 40 pessoas",v:"4"},{t:"5kg - Serve até 50 pessoas",v:"5"},{t:"6kg - Serve até 60 pessoas",v:"6"},{t:"7kg - Serve até 70 pessoas",v:"7"},{t:"8kg - Serve até 80 pessoas",v:"8"}];
        } else {
            pesos = [{t:"1,5kg - Serve até 15 pessoas",v:"1.5"},{t:"2kg - Serve até 20 pessoas ⭐ Mais pedido",v:"2"},{t:"2,5kg - Serve até 25 pessoas",v:"2.5"},{t:"3kg - Serve até 30 pessoas",v:"3"},{t:"3,5kg - Serve até 35 pessoas",v:"3,5"},{t:"4kg - Serve até 40 pessoas",v:"4"},{t:"5kg - Serve até 50 pessoas",v:"5"},{t:"6kg - Serve até 60 pessoas",v:"6"},{t:"7kg - Serve até 70 pessoas",v:"7"},{t:"8kg - Serve até 80 pessoas",v:"8"}];
        }
    } 
    else if (paginaAtual === 'personalizado') {
        if (formato === 'Quadrado' || formato === 'Coração') {
            pesos = [{t:"3kg - Serve até 30 pessoas",v:"3"},{t:"4kg - Serve até 40 pessoas",v:"4"},{t:"5Kg - Serve até 50 pessoas",v:"5"},{t:"6kg - Serve até 60 pessoas",v:"6"},{t:"7kg - Serve até 70 pessoas",v:"7"},{t:"8kg - Serve até 80 pessoas",v:"8"}];
        } else {
            pesos = [{t:"2kg - Serve até 20 pessoas ⭐ Mais pedido",v:"2"},{t:"2,5kg - Serve até 25 pessoas",v:"2.5"},{t:"3kg - Serve até 30 pessoas",v:"3"},{t:"3,5kg - Serve até 35 pessoas",v:"3,5"},{t:"4kg - Serve até 40 pessoas",v:"4"},{t:"5kg - Serve até 50 pessoas",v:"5"},{t:"6kg - Serve até 60 pessoas",v:"6"},{t:"7kg - Serve até 70 pessoas",v:"7"},{t:"8kg - Serve até 80 pessoas",v:"8"}];
        }
    }
    else {
        pesos = [{t:"1,5kg - Serve até 15 pessoas",v:"1.5"},{t:"2kg - Serve até 20 pessoas ⭐ Mais pedido",v:"2"},{t:"2,5kg - Serve até 25 pessoas",v:"2.5"},{t:"3kg - Serve até 30 pessoas",v:"3"},{t:"3,5kg - Serve até 35 pessoas",v:"3,5"},{t:"4kg - Serve até 40 pessoas",v:"4"},{t:"5kg - Serve até 50 pessoas",v:"5"},{t:"6kg - Serve até 60 pessoas",v:"6"},{t:"7kg - Serve até 70 pessoas",v:"7"},{t:"8kg - Serve até 80 pessoas",v:"8"}];
    }

    pesos.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.v; opt.text = p.t;
        selectPeso.appendChild(opt);
    });
    selectPeso.value = ""; 
    pedido.pesoKg = 0;

    selectPeso.onchange = (e) => {
        pedido.pesoKg = parseFloat(e.target.value) || 0;
        atualizarTudo();
        atualizarDadosCarrinho();
    };

    // 3. ATUALIZAÇÃO VISUAL (O segredo está aqui)
    // 3. ATUALIZAÇÃO DO ESTADO E VISUAL
    pedido.formato = formato;
    
    if (event && event.currentTarget) {
        const botaoClicado = event.currentTarget;
        const container = botaoClicado.parentElement;
        
        container.querySelectorAll('.btn-corte').forEach(btn => {
            btn.classList.remove('active');
        });
        
        botaoClicado.classList.add('active');
    }

    

    
    // Se o clique veio de um evento, limpamos TODOS os botões irmãos e ativamos o clicado
    if (event && event.currentTarget) {
        const botaoClicado = event.currentTarget;
        const container = botaoClicado.parentElement;
        
        // Remove 'active' de qualquer botão dentro do mesmo container
        container.querySelectorAll('.btn-corte').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Adiciona 'active' no que você acabou de clicar
        botaoClicado.classList.add('active');
    }

    const txtFormatoCorte = document.getElementById('cartFormatoTextoCorte');
    if (txtFormatoCorte) txtFormatoCorte.innerText = ` | ${formato}`;


   // FORMA CORRETA (Sênior):
    let urlImagem = ""; 

   if (formato === 'Quadrado') urlImagem = 'assets/modelo/boloquadrado.jpeg';
   else if (formato === 'Redondo') urlImagem = 'assets/modelo/boloredondo.jpeg';
   else if (formato === 'Coração') urlImagem = 'assets/modelo/bolocoracao.jpeg';

   // 2º: Grava no objeto GLOBAL (Isso garante que o carrinho veja a foto)
   pedido.formato = formato;
   pedido.modeloImagem = urlImagem;
   pedido.tipo = document.body.getAttribute('data-pagina') || 'corte';

   // 3º: Atualiza a imagem da página (se o ID existir)
   const imgProduto = document.getElementById('cartImagem');
   if (imgProduto) {
       imgProduto.src = urlImagem;
       imgProduto.style.display = 'block';
   }

   // 4º: Força o carrinho a ler o novo 'pedido.modeloImagem'
   atualizarDadosCarrinho();
}



export function carregarPesosPersonalizados() {
    const selectPeso = document.getElementById('pesoSelect');
    if (!selectPeso) return;

    selectPeso.innerHTML = '<option value="">Selecione um peso</option>';
    const pesos = ["2", "2.5", "3", "3.5", "4", "5", "6", "7", "8", "9", "10"];

    pesos.forEach(p => {
        const option = document.createElement('option');
        option.value = p;
        option.textContent = `${p.replace('.', ',')} kg - Serve até 00 pessoas`;
        selectPeso.appendChild(option);
    });
}


// AJUSTE NA FUNÇÃO DE EMBALAGEM
// --- AJUSTE SÊNIOR: FUNÇÃO DE EMBALAGEM COM VISUAL ROSA ---
export function toggleEmbalagem(event) {
    // Buscamos o botão que foi clicado
    const btn = event?.currentTarget || event?.target?.closest('.btn-eu-quero');
    if (!btn) return;

    // Se já estiver ativo, desmarca (volta para o marrom/padrão)
    if (btn.classList.contains('selecionado')) {
        pedido.embalagem = false;
        btn.classList.remove('ativo', 'selecionado');
        btn.innerText = "Eu quero";
        btn.style.backgroundColor = ""; 
        btn.style.color = "";
    } else {
        // Marca como selecionado (Fica Rosa)
        pedido.embalagem = true;
        btn.classList.add('ativo', 'selecionado');
        btn.innerText = "✔ Selecionado";
        btn.style.backgroundColor = "#e91e63"; // Cor Rosa
        btn.style.color = "#fff";
    }
    
    // Atualiza os cálculos e o resumo
    if (typeof atualizarTudo === "function") atualizarTudo();
    if (typeof atualizarResumoFinal === "function") atualizarResumoFinal();
}

// AJUSTE NA FUNÇÃO DO TOPO
export function toggleTopo(selecionado, event) {
    const btn = event?.currentTarget || event?.target?.closest('.btn-eu-quero, .btn-opcao');
    if (!btn) return;


    // PEGA A PÁGINA ATUAL PARA DEFINIR O TIPO DE TOPO
    const paginaAtual = document.body.getAttribute('data-pagina');

    // 1. LÓGICA PARA DESMARCAR (Se clicar no que já está rosa)
    if (btn.classList.contains('ativo') || btn.classList.contains('active')) {
        pedido.topo = false;
        pedido.topoTipo = "padrao";
        
        if (btn.classList.contains('btn-eu-quero')) {
            btn.innerText = "Eu quero";
            btn.style.backgroundColor = ""; // Volta para o Marrom do CSS
            btn.style.color = "";
        }
        
        const campos = document.getElementById('campos-topo');
        if (campos) campos.style.display = 'none';
    } 
    // 2. LÓGICA PARA SELECIONAR
    else {
        // Limpa todos os outros botões de topo primeiro (Seleção Única)
        const container = btn.closest('.topo-cards') || document;
        container.querySelectorAll('.btn-eu-quero[data-tipo="topo"], .btn-opcao, .btn-corte').forEach(b => {
            b.classList.remove('ativo', 'active');
            if (b.classList.contains('btn-eu-quero')) {
                b.innerText = "Eu quero";
                b.style.backgroundColor = "";
                b.style.color = "";
            }
        });

        // Ativa o atual
        pedido.topo = true;
        if (btn.classList.contains('btn-eu-quero')) {
            btn.classList.add('ativo');
            btn.innerText = "✔ Selecionado";
            btn.style.backgroundColor = "#e91e63"; // Rosa
            btn.style.color = "#fff";
        } else {
            btn.classList.add('active');
        }

        if (paginaAtual === "personalizado") {
            pedido.topoTipo = "personalizado";
        } else {
            pedido.topoTipo = "padrao";
        }

        const campos = document.getElementById('campos-topo');
        if (campos) campos.style.display = 'block';
    }

    atualizarTudo();
}

/* ===============================
   RESUMO E ATUALIZAÇÃO DO CARRINHO
=============================== */

export function atualizarDadosCarrinho() {

    // --- 1. MAPEAMENTO DE ELEMENTOS ---
    const imgBolo = document.getElementById('cartImagem');
    const descBolo = document.getElementById('cartDescricao');
    const pesoSelect = document.getElementById('cartPeso');
    const blocoBolo = document.getElementById('bloco-bolo-carrinho');
    const listaDocesContainer = document.getElementById('lista-doces-itens');
    const blocoDoces = document.getElementById('bloco-doces-carrinho');
    const blocoForminhas = document.getElementById('bloco-custom-doces');
    const inputCorForminhas = document.getElementById('corForminhas');
    const displayTotalRodape = document.getElementById('valorTotalRodape');
    const containerItens = document.getElementById('itens-carrinho');
    const checkEmbalagem = document.getElementById('checkEmbalagem');
    const checkTopo = document.getElementById('checkTopo');
    

    const containerPreferencia = document.getElementById('container-preferencia-peso');
    const sacolaVaziaMsg = document.getElementById('mensagem-sacola-vazia');
    // --- 2. LÓGICA DE ESTADO ---
    const temBoloAgora = pedido.pesoKg > 0; 
   // --- 2. LÓGICA DE ESTADO AJUSTADA ---
    const itensDocesDefinitivos = (pedido.itens || []).filter(item => item.tipo === 'doces');
    const itensDocesRascunho = (pedido.doces || []);

    // Unimos os dois para garantir que o que foi clicado agora E o que já estava salvo apareçam
    const itensDoces = [...itensDocesDefinitivos, ...itensDocesRascunho];

    const temDocesNaSacola = itensDoces.length > 0;
    const temItensNaSacola = (pedido.itens && pedido.itens.length > 0);
    const temRascunho = pedido.pesoKg > 0 && pedido.massa !== "";
    // --- 3. ATUALIZAÇÃO DO BOLO ATUAL (O que está sendo montado) ---
    // --- 3. RENDERIZAÇÃO DO RASCUNHO SÊNIOR ---
    
    if (!containerItens) return;

    const itens = pedido.itens || [];

    if (itens.length === 0 && !temRascunho && itensDoces.length === 0) {
        containerItens.innerHTML = "";
        if (sacolaVaziaMsg) sacolaVaziaMsg.style.display = 'block';
        // Não damos return aqui para permitir que outros blocos (como totais) atualizem
    } else {
        if (sacolaVaziaMsg) sacolaVaziaMsg.style.display = 'none';
    }
    // Controle do Bloco de Forminhas
    if (blocoForminhas) {
        blocoForminhas.style.display = temDocesNaSacola ? 'block' : 'none';
        if (temDocesNaSacola && pedido.corForminhas) {
            document.getElementById('corForminhas').value = pedido.corForminhas;
        }
    }

    if (temRascunho) {
        if (blocoBolo) {
            blocoBolo.style.display = 'block'; 

            blocoBolo.innerHTML = `
                <span class="pill" id="labelTipoBolo">Encomenda</span>
                <div class="card-produto" style="background: #f0f7f7; padding: 10px; border-radius: 8px; display: flex; gap: 10px; position: relative; margin-top: 10px;">
                    
                    <img src="assets/lixeira.png" 
                        onclick="excluirBoloRascunho()" 
                        style="position: absolute; top: 10px; right: 10px; width: 18px; cursor: pointer; opacity: 0.6; z-index: 10;">

                    <img src="${pedido.modeloImagem && pedido.pesoKg > 0 ? pedido.modeloImagem : 'assets/LOGO.jpg'}" 
                        style="width: 100px; height: 100px; object-fit: cover; border-radius: 5px;">
                    
                    <div style="flex: 1;">
                        <div style="font-size: 13px; color: #333; padding-right: 30px; line-height: 1.4;">
                            • <b>Formato:</b> ${pedido.formato || '---'}<br>
                            • <b>Massa:</b> ${pedido.massa || 'Selecione...'}<br>
                            • <b>Recheios:</b> ${pedido.recheios?.length > 0 ? pedido.recheios.join(', ') : 'Selecione...'}
                            ${pedido.complemento ? `<br>• <b>Comp.:</b> ${pedido.complemento}` : ''}
                            
                            ${pedido.nomeTopo || pedido.idadeTopo || pedido.obsTopo ? `
                                <div style="margin-top: 5px; color: #783606;">
                                    ✔ <b>Com Topo:</b><br>
                                    <span style="margin-left: 10px;">• Nome: ${pedido.nomeTopo || '---'}</span><br>
                                    <span style="margin-left: 10px;">• Idade: ${pedido.idadeTopo || '---'}</span><br>
                                    <span style="margin-left: 10px;">• Obs: ${pedido.obsTopo || '---'}</span>
                                </div>
                            ` : ''}

                            ${pedido.embalagem ? `<div style="color: #783606; margin-top: 3px;">✔ <b>Com Embalagem</b></div>` : ''}
                        </div>

                        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 12px; border-top: 1px dashed #ccc; padding-top: 10px; width: 100%; gap: 10px;">
    
                            <div style="display: flex; align-items: center; flex-shrink: 0;">
                                <img src="assets/peso.png" style="width: 16px; height: 16px; margin-right: 2px; display: block; object-fit: contain;">
                                <span style="font-weight: bold; font-size: 14px; color: #333; white-space: nowrap;">${pedido.pesoKg}kg</span>
                            </div>

                            <div style="display: flex; align-items: center; flex-shrink: 0; text-align: right;">
                                <img src="assets/coins.png" style="width: 16px; height: 16px; margin-right: 4px; display: block; object-fit: contain;">
                                <span style="font-weight: bold; color: #e91e63; font-size: 16px; white-space: nowrap;">R$ ${(pedido.valorIndividual || 0).toFixed(2).replace('.', ',')}</span>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }
    }

    // --- 4. SACOLA (Múltiplos Bolos) ---
    if (containerItens) {
        containerItens.style.display = temItensNaSacola ? 'block' : 'none';
        if (temItensNaSacola) {
            let htmlSacola = `<span class="pill" style="margin-bottom: 10px; display: inline-block;">Encomendas na Sacola</span>`;
        
            htmlSacola += pedido.itens.map((item, idx) => {
                try {
                    return `
                
                
                        <div class="card-produto-sacola" style="background: #f9f9f9; border-radius: 12px; padding: 15px; margin-bottom: 15px; position: relative; border: 1px solid #eee;">
                            <div style="display: flex; gap: 12px;">
                                <img src="${item.modeloImagem}" style="width: 150px; height: 150px; object-fit: cover; border-radius: 8px;">

                                <div style="flex: 1;">
                                    <div style="font-size: 13px; color: #333; line-height: 1.4;">
                                        
                                        <div style="font-weight: bold; color: #e91e63; margin-bottom: 8px; font-size: 14px; text-transform: uppercase; padding-right: 25px;">
                                            ${item.titulo || 'Bolo'} 
                                        </div>
                                        
                                        • <b>Formato:</b> ${item.formato}<br>
                                        • <b>Massa:</b> ${item.massa}<br>
                                        • <b>Recheio:</b> ${item.recheios.join(', ')}<br>
                                        ${item.complemento ? `• <b>Complemento:</b> ${item.complemento}<br>` : ''}
                                        ${item.topo ? `
                                            <div style="margin-top: 5px;">
                                                <b style="color: #e91e63;">✔ Com Topo</b>
                                                
                                                ${(item.nomeTopo || item.idadeTopo || item.obsTopo) ? `
                                                    <div style="margin-top: 2px;">
                                                        <span style="margin-left: 10px; color: #333;">• <b>Nome:</b> ${item.nomeTopo || '---'}</span><br>
                                                        <span style="margin-left: 10px; color: #333;">• <b>Idade:</b> ${item.idadeTopo || '---'}</span><br>
                                                        <span style="margin-left: 10px; color: #333;">• <b>Obs:</b> ${item.obsTopo || '---'}</span>
                                                    </div>
                                                ` : ''}
                                            </div>
                                        ` : ''}
                                        ${item.embalagem ? `<span style="color: #e91e63; "> <b>✔ Com Embalagem</b></span>` : ''}
                                    </div>

                                    <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 12px; border-top: 1px dashed #ccc; padding-top: 10px; width: 100%; gap: 10px;">
            
                                        <div style="display: flex; align-items: center; flex-shrink: 0;">
                                            <img src="assets/peso.png" style="width: 16px; height: 16px; margin-right: 2px; display: block; object-fit: contain;">
                                            <span style="font-weight: bold; font-size: 14px; color: #333; white-space: nowrap;">${item.pesoKg}kg</span>
                                        </div>

                                        <div style="display: flex; align-items: center; flex-shrink: 0; text-align: right;">
                                            <img src="assets/coins.png" style="width: 16px; height: 16px; margin-right: 4px; display: block; object-fit: contain;">
                                            <span style="font-weight: bold; color: #e91e63; font-size: 16px; white-space: nowrap;">R$ ${item.valorIndividual.toFixed(2).replace('.', ',')}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <img src="assets/lixeira.png" onclick="removerItemSacola(${idx})" 
                                style="position: absolute; top: 10px; right: 10px; width: 20px; cursor: pointer; opacity: 0.6;">
                        </div>
                    `;

                } catch (err) {
                    console.error("Erro ao renderizar item do carrinho:", err);
                    return "";
                }
            }).join('');
            
            containerItens.innerHTML = htmlSacola;
    
        }
    }
    
    // --- 5. LÓGICA DA PREFERÊNCIA DE PESO ---
    // Importante: Mostrar se houver QUALQUER bolo (montando ou já salvo)
    if (containerPreferencia) {
        containerPreferencia.style.display = (temBoloAgora || temItensNaSacola) ? 'block' : 'none';
    }

    // --- 4. DOCES ---
    // Renderização visual dos doces no Carrinho
    if (blocoDoces && listaDocesContainer) {
    // Usando a sua constante itensDoces que você já definiu no topo
    if (itensDoces.length > 0) {
        blocoDoces.style.display = 'block';
        
        listaDocesContainer.innerHTML = itensDoces.map((doce, index) => {
            // Usando suas variáveis tratadas para evitar erro de undefined
            const qtd = doce.qtd || 0;
            const valorDoce = doce.valor || 0; // Use uma constante para o valor tratado
            const nomeDoce = doce.nome || "Doce";

            return `
                    <div class="doce-item-carrinho" style="
                        background-color: #C5DADB; 
                        color: #783606; 
                        border-radius: 12px; 
                        padding: 10px 15px; 
                        display: flex; 
                        flex-direction: row; /* Garante que info e lixeira fiquem lado a lado */
                        align-items: center; 
                        justify-content: space-between; 
                        margin-bottom: 10px;
                        position: relative; /* Mantém a lixeira contida aqui dentro */
                        width: 100%;
                        box-sizing: border-box;
                    ">
                        <div class="doce-info-carrinho" style="display: flex; flex-direction: column; flex: 1;">
                            <strong style="font-size: 14px; margin: 0;">${doce.nome}</strong>
                            <span style="font-size: 12px;">${doce.qtd} un. - R$ ${doce.valor.toFixed(2).replace('.', ',')}</span>
                        </div>
                        
                        <div class="lixeira-container" style="display: flex; align-items: center; justify-content: center; margin-left: 10px;">
                            <img src="assets/lixeira.png" 
                                class="lixeira-padrao" 
                                style="width: 20px; height: 20px; cursor: pointer; display: block; object-fit: contain;" 
                                onclick="excluirDoce(${index})"
                                alt="Remover">
                        </div>
                    </div>

                `;
            }).join('');          
        } else {
            blocoDoces.style.display = 'none';
            listaDocesContainer.innerHTML = '';
        }
    
    }  


    // Localize a parte que controla a visibilidade dos campos de texto do topo
    // --- LÓGICA DO TOPO (DINÂMICA POR PÁGINA) ---
    const paginaAtual = document.body.getAttribute('data-pagina');
    const camposTopo = document.getElementById('campos-topo');
    const detalhesContainer = document.getElementById('detalhes-topo-carrinho'); 
    // ^ Removi a duplicata que causava o erro

    if (camposTopo) {
        // Regra: Somente aparece os inputs na página 'personalizado'
        if (pedido.topo && paginaAtual === 'personalizado') {
            camposTopo.style.display = 'block';
        } else {
            camposTopo.style.display = 'none';
        }
    }

    if (detalhesContainer) {
        // Lógica de exibição no resumo (Drawer/Sacola)
        if (pedido.topo) {
            detalhesContainer.style.display = 'block';
            
            if (paginaAtual === 'bolo-corte' || paginaAtual === 'pedido') {
                detalhesContainer.innerHTML = `<strong>Topo:</strong> Padrão Selecionado`;
            } else if (pedido.nomeTopo || pedido.idadeTopo) {
                detalhesContainer.innerHTML = `<strong>Para:</strong> ${pedido.nomeTopo} - ${pedido.idadeTopo} anos`;
            } else {
                detalhesContainer.innerHTML = `<strong>Topo:</strong> Selecionado`;
            }
        } else {
            detalhesContainer.style.display = 'none';
        }
    }

    // --- MENSAGEM VAZIA ---
    if (sacolaVaziaMsg) {
        const temDocesNoPedido = (pedido.doces && pedido.doces.length > 0) || (pedido.itens && pedido.itens.some(i => i.tipo === 'doces'));
        const temItensNoPedido = (pedido.itens && pedido.itens.length > 0);
        const temRascunhoNoPedido = (pedido.pesoKg > 0);

        sacolaVaziaMsg.style.display = (!temDocesNoPedido && !temItensNoPedido && !temRascunhoNoPedido) ? 'block' : 'none';
    }

    // --- TOTAIS E RODAPÉ ---
    const valorTotalFormatado = (pedido.valorTotal || 0).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    });

    if (displayTotalRodape) { // Usei a variável que você mapeou no início da função
        displayTotalRodape.innerText = valorTotalFormatado;
    }

    const idsDePagina = ["valorTotalCorte", "valorTotalPersonalizado", "valorTotalDoces", "valorTotalPedido"];
    idsDePagina.forEach(id => {
        const elemento = document.getElementById(id);
        if (elemento) elemento.innerText = valorTotalFormatado;
    });

    // --- CONTROLE DE VISIBILIDADE DO CONTADOR DE DOCES ---
    const contadorDoces = document.getElementById('contador-fixo-doces');
    const paginaAtualDoces = document.body.getAttribute('data-pagina');

    if (contadorDoces) {
        // 1. Pegamos a div que representa o carrinho aberto (drawer)
        const drawerCarrinho = document.getElementById('drawerCarrinho');
        
        // 2. Verificamos se o carrinho está visível (se tem a classe 'ativo' ou se não está hidden)
        const carrinhoEstaAberto = drawerCarrinho && (
            drawerCarrinho.classList.contains('ativo') || 
            drawerCarrinho.style.display === 'flex' ||
            drawerCarrinho.style.display === 'block'
        );

        // 3. Lógica: Só mostra se estiver na página de doces E o carrinho estiver FECHADO
        if (paginaAtualDoces === 'doces' && !carrinhoEstaAberto) {
            const totalDoces = (pedido.doces || []).reduce((acc, d) => acc + (d.qtd || 0), 0);
            
            if (totalDoces > 0) {
                contadorDoces.style.setProperty('display', 'flex', 'important');
            } else {
                contadorDoces.style.setProperty('display', 'none', 'important');
            }
        } else {
            // Se abriu o carrinho ou mudou de página, esconde na hora
            contadorDoces.style.setProperty('display', 'none', 'important');
        }
    }
    
}


export function resetarBotoesVisualmente(tipo) {
    const classesDestaque = ['ativo', 'active', 'selecionado'];
    
    // Reset de Encomenda/Bolo (Seu código completo com seletores específicos)
    if (tipo === 'encomenda' || tipo === 'bolo') {
        const seletoresBolo = [
            '.massa-item', '.recheio-item', '.btn-kg', 
            '.complemento-box label', '.recheios-box label',
            '.btn-corte', '.btn-opcao', '.card-modelo', '.btn-massa', '.btn-recheio'
        ];
        const itensBolo = document.querySelectorAll(seletoresBolo.join(', '));
        limparElementos(itensBolo, classesDestaque, "Eu quero");

        const selects = ['pesoSelect', 'massaSelect', 'pesoSelect'];
        selects.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = "";
        });
    }

    // Reset de Topo (Seus inputs e botões)
    if (tipo === 'topo') {
        const btnsTopo = document.querySelectorAll('#btn-topo-sim, #btn-topo-nao, .coluna-topo .btn-eu-quero');
        limparElementos(btnsTopo, classesDestaque, "Eu quero");
        ['topo-nome', 'topo-idade', 'topo-obs', 'nomeTopo', 'idadeTopo', 'obsTopo'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = "";
        });
    }
}


export function atualizarResumoFinal() {
    const tipoPg = document.body.getAttribute('data-pagina');
    
    // --- AJUSTE SÊNIOR: Recuperação de variáveis globais ---
    // Se a variável global sumiu no refresh, tentamos pegar do objeto pedido
    const porcentagem = window.porcentagemPagamento || 1; 
    const metodo = window.metodoSelecionado || (pedido.pagamento ? pedido.pagamento.metodo : '');

    // 1. CÁLCULO DE VALORES
    const valorBaseBolo = typeof calcularTotal === "function" ? calcularTotal(pedido, tipoPg) : 0;
    const valorApenasDoces = (pedido.doces || []).reduce((acc, d) => acc + (parseFloat(d.valor) || 0), 0);
    const valorSacola = (pedido.itens || []).reduce((acc, item) => acc + (item.valorIndividual || 0), 0);

    // O Total real é a soma de tudo
    const totalOriginal = valorBaseBolo + valorApenasDoces + valorSacola;

    // 3. PAGAMENTO
    const valorPagarAgora = totalOriginal * porcentagem;
    const valorRestante = totalOriginal - valorPagarAgora;
    
    const formatador = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

    // --- IDENTIFICAÇÃO (Melhorado) ---
    // Prioriza o que está no objeto pedido (que veio do LocalStorage)
    const nome = pedido.cliente?.nome || document.getElementById("nomeCliente")?.value || "---";
    const tel = pedido.cliente?.telefone || document.getElementById("telefoneCliente")?.value || "---";
    const email = pedido.cliente?.email || document.getElementById("emailCliente")?.value || "---";

    const elNome = document.getElementById("resumoNome");
    if (elNome) {
        elNome.innerHTML = `
            <b>Nome:</b> ${nome}<br>
            <b>Tel:</b> ${tel}<br>
            <b>E-mail:</b> ${email}<br>
        `;
    }

    // --- 2. BLOCO PRODUTOS (ENCOMENDA) ---
    let htmlProdutos = "";

    if (pedido.itens && pedido.itens.length > 0) {
        htmlProdutos += `<b>Itens na Sacola:</b><br><br>`;
        
        pedido.itens.forEach((item) => {
            // Agora usamos o item.titulo que salvamos na inclusão
            htmlProdutos += `• <b>${item.titulo || 'Bolo'}</b><br>`;
            htmlProdutos += `&nbsp;&nbsp;<b>Kg:</b> ${item.pesoKg}kg<br>`;
            htmlProdutos += `&nbsp;&nbsp;<b>Formato:</b> ${item.formato || '---'}<br>`;
            htmlProdutos += `&nbsp;&nbsp;<b>Massa:</b> ${item.massa || '---'}<br>`;
            htmlProdutos += `&nbsp;&nbsp;<b>Recheio:</b> ${item.recheios?.join(', ') || '---'}<br>`;
            htmlProdutos += `&nbsp;&nbsp;<b>Complemento:</b> ${item.complemento || '---'}<br>`;
            
            
            // Lógica de Topo
            // ... dentro do loop de pedido.itens na função atualizarResumoFinal()

            // BLOCO DO TOPO
            if (item.topo) {
                htmlProdutos += `&nbsp;&nbsp;<b>Topo:</b> Sim<br>`;
                
                // REGRA: Informações detalhadas APENAS para Bolo Personalizado
                if (item.titulo === 'Bolo Personalizado') {
                    const infoTopo = [];
                    if (item.nomeTopo) infoTopo.push(item.nomeTopo);
                    if (item.idadeTopo) infoTopo.push(`${item.idadeTopo} anos`);
                    if (item.obsTopo) infoTopo.push(`Tema: ${item.obsTopo}`);
                    
                    if (infoTopo.length > 0) {
                        htmlProdutos += `&nbsp;&nbsp;&nbsp;&nbsp;<i>${infoTopo.join(', ')}</i><br>`;
                    }
                }
            }

            // BLOCO DA OBSERVAÇÃO GERAL
            if (item.observacao && item.observacao.trim() !== "") {
                htmlProdutos += `&nbsp;&nbsp;<b>Obs:</b> ${item.observacao}<br>`;
            }

            htmlProdutos += `&nbsp;&nbsp;<b>Embalagem:</b> ${item.embalagem ? 'Sim' : 'Não'}<br>`;
            htmlProdutos += `&nbsp;&nbsp;<b>Preferência:</b> ${item.preferenciaPeso || '---'}<br>`;
            
            
            // Valor alinhado à direita
            htmlProdutos += `<div style="text-align: right; font-weight: bold; margin-top: 5px;">${formatador.format(item.valorIndividual)}</div>`;
            htmlProdutos += `<hr style="border: 0; border-top: 1px dashed #ccc; margin: 10px 0;">`;
        });
    }

    if (pedido.pesoKg > 0) {
        htmlProdutos += `<b>Bolo em montagem:</b><br>`;
        // ... código existente (Formato, Peso, Preferência, Massa, etc)
        
        // AJUSTE: Topo (Lógica condicional preservada)
        if (pedido.topo) {
            htmlProdutos += `• <b>Topo:</b> Sim<br>`;
            // Simplificamos a verificação para cobrir se houver dados de topo
            if (tipoPg === 'personalizado' || pedido.nomeTopo) {
                htmlProdutos += `&nbsp;&nbsp;&nbsp;&nbsp;- <b>Nome:</b> ${pedido.nomeTopo || '---'}<br>`;
                htmlProdutos += `&nbsp;&nbsp;&nbsp;&nbsp;- <b>Idade:</b> ${pedido.idadeTopo || '---'} anos<br>`;
            }
        }
        
        // AJUSTE: Adicionada Preferência de Peso (Lógica do Select de preferência)
        // 1. Tenta pegar do objeto pedido
        let prefValor = pedido.preferenciaPeso;

        // 2. Se não estiver no objeto, tenta pegar direto do rádio que está selecionado (checked)
        if (!prefValor) {
            const radioSelecionado = document.querySelector('input[name="pesoPreferencia"]:checked');
            prefValor = radioSelecionado ? radioSelecionado.value : "";
        }

        // 3. Se encontrou um valor, adiciona ao HTML do resumo
        if (prefValor) {
            htmlProdutos += `• <b>Preferência:</b> ${prefValor}<br>`;
        }

        htmlProdutos += `• <b>Massa:</b> ${pedido.massa || 'Padrão'}<br>`;
        htmlProdutos += `• <b>Recheio:</b> ${pedido.recheios?.join(', ') || '---'}<br>`;
        
        if (pedido.complemento) {
            htmlProdutos += `• <b>Complemento:</b> ${pedido.complemento}<br>`;
        }

        // Observação do pedido
        const obsGeral = pedido.observacao || document.getElementById("observacaoPedido")?.value.trim();
        if (obsGeral) {
            htmlProdutos += `• <b>Observação:</b> ${obsGeral}<br>`;
        }

        // Topo (Lógica condicional)
        if (pedido.topo) {
            htmlProdutos += `• <b>Topo:</b> Sim<br>`;
            
            if (tipoPg === 'personalizado') {
                htmlProdutos += `&nbsp;&nbsp;&nbsp;&nbsp;- <b>Nome:</b> ${pedido.nomeTopo || '---'}<br>`;
                htmlProdutos += `&nbsp;&nbsp;&nbsp;&nbsp;- <b>Idade:</b> ${pedido.idadeTopo || '---'} anos<br>`;
                htmlProdutos += `&nbsp;&nbsp;&nbsp;&nbsp;- <b>Observação:</b> ${pedido.obsTopo || '---'}<br>`;
            }
        }

        // Embalagem
        if (pedido.embalagem) {
            htmlProdutos += `• <b>Embalagem:</b> Sim<br>`;
        }
    }

    // Doces extras
    // --- SUBSTITUIR O BLOCO DE DOCES EXTRAS POR ESTE ---
    // --- LÓGICA PARA A ETAPA FINALIZAR (DENTRO DE atualizarResumoFinal) ---
    // Fazemos o agrupamento aqui para exibir um embaixo do outro no resumo
    if (pedido.doces && pedido.doces.length > 0) {
        const agrupados = pedido.doces.reduce((acc, d) => {
            if (!acc[d.nome]) {
                acc[d.nome] = { qtd: 0, valor: 0 };
            }
            acc[d.nome].qtd += d.qtd;
            acc[d.nome].valor += (parseFloat(d.valor) || 0);
            return acc;
        }, {});

        htmlProdutos += `<b>Doces:</b><br>`;
        if (pedido.corForminhas) {
            htmlProdutos += `<span style="color: #000;">• <b>Cor das forminhas:</b> ${pedido.corForminhas}</span><br>`;
        }
        Object.entries(agrupados).forEach(([nome, info]) => {
            htmlProdutos += `<div style="display: flex; justify-content: space-between;">
                <span>• ${info.qtd} un. Docinho ${nome}</span>
                <span style="font-weight: bold;">${formatador.format(info.valor)}</span>
            </div>`;
        });
        htmlProdutos += `<hr style="border: 0; border-top: 1px solid #eee; margin: 10px 0;">`;
        
    }

    if (pedido.pesoKg <= 0 && (pedido.doces && pedido.doces.length > 0)) {
        const obsGeralDoces = pedido.observacao || document.getElementById("observacaoPedido")?.value.trim();
        if (obsGeralDoces) {
            htmlProdutos += `• <b>Observação:</b> ${obsGeralDoces}<br>`;
        }
    }

    const elDesc = document.getElementById("resumoDescricao");
    if (elDesc) elDesc.innerHTML = htmlProdutos || "Nenhum item selecionado";

    // --- 3. BLOCO PAGAMENTO E CÁLCULOS ---
    const mSel = typeof metodoSelecionado !== 'undefined' ? metodoSelecionado : '';
    
    // AJUSTE: Negrito aplicado nas escritas Pix e Cartão
    const txtMetodo = metodo === 'pix' ? '<b>Pix</b>' : (metodo === 'credit_card' ? '<b>Cartão</b>' : '---');
    const txtPorcentagem = (porcentagem === 0.5) ? '50% (Entrada)' : '100% (Total)';

    // Preenche Pagamento
    const elPagamento = document.getElementById("resumoPagamento");
    if (elPagamento) {
        // Buscamos diretamente das globais que sincronizamos no refresh
        const metodoAtivo = window.metodoSelecionado || pedido.pagamento?.metodo || "Não definido";
        const valorPorc = window.porcentagemPagamento || pedido.pagamento?.porcentagem || 1.0;

        const txtMetodoFormatado = metodoAtivo.toUpperCase();
        const txtPorcentagemFormatada = (valorPorc === 0.5) ? "50% (Sinal)" : "100% (Total)";

        elPagamento.innerHTML = `<b>${txtMetodoFormatado}</b> - ${txtPorcentagemFormatada}`;
    }

    // Atualiza os valores na tela
    const mappings = {
        "resumoSubtotal": formatador.format(totalOriginal),
        "resumoTotal": formatador.format(valorPagarAgora)
    };

    Object.entries(mappings).forEach(([id, valor]) => {
        const el = document.getElementById(id);
        if (el) el.innerText = valor;
    });

    // Lógica do "Falta Pagar"
    const blocoFalta = document.getElementById("blocoFaltaPagar");
    const elRestante = document.getElementById("resumoRestante");
    
    if (porcentagemPagamento < 1 && valorRestante > 0) {
        if (blocoFalta) blocoFalta.style.display = "flex";
        if (elRestante) elRestante.innerText = formatador.format(valorRestante);
    } else {
        if (blocoFalta) blocoFalta.style.display = "none";
    }


    
    // Sincronização com o campo final do pedido
    const campoTotal = document.getElementById("totalFinalPedido"); 
    if (campoTotal) {
        campoTotal.innerText = formatador.format(totalOriginal);
    }

    // Data e Horário
    
    // --- DATA E HORÁRIO (Sincronizado com Objeto e Input) ---
    const dataInput = document.getElementById("dataPedido")?.value;
    const dataObjeto = pedido.cliente?.data;
    const dataFinal = dataInput || dataObjeto || "";
    const dataBr = dataFinal ? dataFinal.split('-').reverse().join('/') : "---";

    const horaFinal = document.getElementById("horarioPedido")?.value || pedido.cliente?.horario || "---";

    const elData = document.getElementById("resumoData");
    const elHora = document.getElementById("resumoHorario");

    if (elData) elData.innerText = dataBr;
    if (elHora) elHora.innerText = horaFinal;


    // --- ACRESCENTE ESTE BLOCO AQUI (Final da função) ---
    // Usamos o valorPagarAgora que você já calculou no passo 3 da sua função
    const elResumoTotalFinal = document.getElementById("resumoTotal");
    if (elResumoTotalFinal) {
        elResumoTotalFinal.innerText = formatador.format(valorPagarAgora);
    }

}


/* ===============================
   MODAIS E UTILITÁRIOS VISUAIS
=============================== */
export const fecharModalTermos = () => { if(modalTermos) modalTermos.style.display = "none"; };
export const fecharErro = () => { if (modalErro) modalErro.style.display = "none"; };
export const abrirModalTermos = () => { if(modalTermos) modalTermos.style.display = "block"; };


// --- FUNÇÃO 2: Escolher o Método (Pix ou Cartão) ---
export function validarTermos() {
    const checkbox = document.getElementById('concordo-termos');
    if (!checkbox.checked) {
        alert("Dayane informa: Para prosseguir com o seu pedido, por favor aceite os termos e condições. 🍰");
        return false;
    }
    return true;
}

export function escolherMetodo(metodo) {
    // --- NOVO AJUSTE: VERIFICAÇÃO DO TERMO ANTES DE TUDO ---
    const checkboxTermos = document.getElementById('concordo-termos');
    const containerTermos = document.querySelector('.aceite-termos-container');

    if (!checkboxTermos || !checkboxTermos.checked) {
        alert("Dayane informa: Para prosseguir com o seu pedido, por favor aceite os termos e condições. 🍰");
        
        // Efeito visual para ajudar o cliente a achar onde clicar
        if (containerTermos) {
            containerTermos.style.border = "2px solid #e74c3c"; 
            containerTermos.style.backgroundColor = "#fff0f0";
            containerTermos.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        return; // PARA A EXECUÇÃO AQUI
    }

    // Se passou pela verificação, volta o visual ao normal e segue sua lógica sênior
    containerTermos.style.border = "1px solid #fce4ec";
    containerTermos.style.backgroundColor = "#fff5f7";

    console.log("Sênior Log: Método escolhido ->", metodo);
    
    // 1. Atualiza as variáveis globais
    window.metodoSelecionado = metodo; 
    
    // 2. SALVA NO STORAGE
    localStorage.setItem('metodo_pagamento', metodo);

    // 3. Atualiza o objeto pedido
    if (!pedido.pagamento) pedido.pagamento = {};
    pedido.pagamento.metodo = metodo;
    
    // 4. Feedback visual
    atualizarVisualMetodo(metodo);

    // 5. Limpa o Mercado Pago (Prevenção de Bug Sênior)
    const container = document.getElementById("paymentBrick_container");
    if (container) {
        container.innerHTML = "";
    }
    window.mpInstanciado = false; 

    // 6. Persistência e Resumo
    salvarNoLocalStorage(); 
    atualizarResumoFinal();

    // 7. Dispara a abertura do checkout conforme o método
    if (metodo === 'pix') {
        if (typeof gerarPixMercadoPago === "function") gerarPixMercadoPago();
    } else if (metodo === 'credit_card') {
        if (typeof abrirCheckoutCartao === "function") abrirCheckoutCartao();
    }
}

// EXPOSIÇÃO GLOBAL
window.escolherMetodo = escolherMetodo;



export function restaurarEstadoBotoesPagamento() {
    // SÊNIOR: Prioridade para a Global, depois Objeto, depois Padrão 1.0
    const porcSalva = window.porcentagemPagamento || pedido.pagamento?.porcentagem || 1.0;
    const metodoSalvo = window.metodoSelecionado || pedido.pagamento?.metodo || null;

    console.log("🎨 Restaurando visual:", { porcSalva, metodoSalvo });

    // Ajusta botões de porcentagem
    document.querySelectorAll('.btn-valor').forEach(btn => btn.classList.remove('active'));
    const idPorc = (porcSalva === 0.5) ? 'btnPagar50' : 'btnPagar100';
    const elPorc = document.getElementById(idPorc);
    if (elPorc) elPorc.classList.add('active');

    // Ajusta botões de método
    if (metodoSalvo && typeof atualizarVisualMetodo === 'function') {
        atualizarVisualMetodo(metodoSalvo);
    }
}






export function scrollCarousel(direction) {
  const carousel = document.getElementById('modeloCarousel');
  if (!carousel) return;

  // Seleciona o primeiro card para medir a largura
  const card = carousel.querySelector('.bolo-card');
  
  // Se o card existir, rola a largura dele + o espaço (gap)
  // Se não existir, usa um valor padrão de 300
  const scrollAmount = card ? card.offsetWidth + 20 : 300; 

  carousel.scrollBy({
    left: direction * scrollAmount,
    behavior: 'smooth' // Faz o movimento deslizar suavemente
  });
}





export function mostrarNotificacao(mensagem) {
    const alerta = document.getElementById("mensagem-sucesso");
    if (!alerta) return;

    alerta.innerText = mensagem;
    alerta.style.display = "block";

    // Some após 3 segundos
    setTimeout(() => {
        alerta.style.display = "none";
    }, 3000);
}




// Em ui-updates.js
// No seu arquivo de eventos/main
// main.js ou o arquivo onde ela reside
export function selecionarPorcentagem(valor) {
    console.log("🎯 Iniciando seleção de porcentagem:", valor);
    
    try {
        window.porcentagemPagamento = valor;

        if (typeof atualizarTudo === 'function') {
            atualizarTudo();
        }

        const totalBase = (typeof pedido !== 'undefined' && pedido.valorTotal) ? pedido.valorTotal : 0;
        const valorParaCobrar = parseFloat((totalBase * valor).toFixed(2));

        localStorage.setItem('valor_final_pagamento', valorParaCobrar.toString());
        
        console.log("🚀 SUCESSO: Gravado no Storage ->", valorParaCobrar);

        // --- CORREÇÃO AQUI ---
        // Em vez de atualizarVisualMetodo (que é para Pix/Cartão), 
        // use a que restaura o visual dos botões de valor/porcentagem.
        if (typeof restaurarEstadoBotoesPagamento === 'function') {
            restaurarEstadoBotoesPagamento();
        }

    } catch (erro) {
        console.error("🔥 Erro na selecionarPorcentagem:", erro.message);
    }
}

// Função auxiliar para evitar repetição de código
function limparElementos(lista, classes, textoOriginal = null) {
    lista.forEach(el => {
        el.classList.remove(...classes);
        el.style.backgroundColor = "";
        el.style.color = "";
        if (textoOriginal && (el.tagName === 'BUTTON' || el.classList.contains('btn-eu-quero'))) {
            el.innerText = textoOriginal;
        }
        const input = el.querySelector('input');
        if (input) {
            input.checked = false;
            input.disabled = false;
        }
    });
}

export function excluirTopo() {
    pedido.topo = false;
    pedido.topoValor = 0;
    resetarBotoesVisualmente('topo'); // <- Nome correto
    
    const divCampos = document.getElementById('campos-topo');
    if (divCampos) divCampos.style.display = 'none';
    
    atualizarTudo();
    atualizarDadosCarrinho();
}

export function excluirEmbalagem() {
    pedido.embalagem = false;
    resetarBotoesVisualmente('embalagem'); // <- Nome correto
    
    atualizarTudo();
    atualizarDadosCarrinho();
}



// Excluir Bolo (Pedido, Corte ou Personalizado)
export function excluirEncomenda() {
    // 1. Limpa os dados no objeto global
    pedido.pesoKg = 0;
    pedido.massa = "";
    pedido.recheios = [];
    pedido.modelo = ""; // Aqui zera o link da imagem/upload
    pedido.formato = ""; 

    // 1. Limpa o "caminho" do arquivo no input (essencial para o cliente poder subir a mesma foto de novo)
    const inputUpload = document.getElementById('foto-upload');
    if (inputUpload) inputUpload.value = ""; 

    // 2. Limpa o Preview visual
    const previewImg = document.getElementById('preview-img'); // Sua tag <img> de preview
    if (previewImg) {
        previewImg.src = ""; // Remove a imagem do cliente
        previewImg.style.display = "none"; // Esconde o elemento
    }

    // 3. Se você usa um texto de "Arquivo selecionado", limpe-o também
    const labelArquivo = document.getElementById('nome-arquivo');
    if (labelArquivo) labelArquivo.innerText = "Nenhuma imagem selecionada";


    // 4. Limpa as descrições escritas no drawer
    limparDescricoesCarrinho();  
    
    resetarBotoesVisualmente('encomenda');
    atualizarTudo();
    atualizarDadosCarrinho();

}

// Excluir um Doce específico ou todos
export function excluirDoce(index) {
    // 1. Remove do array
    if (pedido.doces && pedido.doces[index]) {
        const doceRemovido = pedido.doces[index];
        pedido.doces.splice(index, 1);

        // 2. Atualiza os botões da página principal (doces.html)
        if (typeof atualizarInterfaceDoces === "function") {
            atualizarInterfaceDoces(null, doceRemovido.nome);
        }

        // 3. Atualiza o contador da sacola (bolinha vermelha)
        atualizarContadorSacola();

        // 4. FORÇA O REDESENHO DO CARRINHO (Isso faz o card sumir na hora)
        // Chamamos diretamente para garantir que aconteça mesmo se o calculo der erro
        atualizarDadosCarrinho();

        // 5. Tenta atualizar os cálculos de preço
        try {
            atualizarTudo();
        } catch (e) {
            console.warn("Preço não atualizou, mas o item foi removido da tela.");
        }
    }
}






// Dentro de ui-updates.js
export function limparDescricoesCarrinho() {
    const descBolo = document.getElementById('cartDescricao');
    const pesoSelect = document.getElementById('cartPeso');
    const imgBolo = document.getElementById('cartImagem');
    const campos = ['resumo-massa', 'resumo-recheio', 'resumo-peso', 'resumo-modelo'];
    campos.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerText = "";
    });

    if (descBolo) descBolo.innerHTML = ""; 
    if (pesoSelect) pesoSelect.innerText = ""; 
    
    if (imgBolo) {
        imgBolo.src = "";
        imgBolo.style.display = "none";
    }
}

export function atualizarInterfaceDoces(botao, nomeDoce) {
    // --- TRECHO NOVO: INVESTIGAÇÃO SÊNIOR ---
    // Se a função for chamada sem nomeDoce, ela apenas tenta encontrar o container
    if (!nomeDoce) {
        console.log("🔍 Investigação: Função chamada no carregamento inicial.");
        // Tente encontrar o container onde os cards ficam. 
        // Se você souber o ID, substitua 'container-doces' pelo ID real abaixo:
        const containerGeral = document.getElementById('container-doces'); 
        console.log("🔍 O container de cards existe?", !!containerGeral);
    }

    // --- SUA REGRA ORIGINAL (MANTIDA) ---
    if (!botao && nomeDoce) {
        botao = document.querySelector(`.btn-eu-quero[data-nome="${nomeDoce}"]`);
    }
    
    // Proteção: Se não tem nome de doce e nem botão, para aqui para não dar erro de undefined
    if (!nomeDoce) return;

    const doce = pedido.doces.find(d => d.nome === nomeDoce);
    const qtdTotal = doce ? doce.qtd : 0;

    if (botao) {
        const container = botao.parentElement;
        let btnRetirar = container.querySelector('.btn-remover-doce');

        if (qtdTotal > 0) {
            const numLotes = qtdTotal / 25;
            botao.style.backgroundColor = "#e91e63";
            botao.style.color = "#fff";
            botao.innerHTML = `
                <div style="font-weight: bold;">${qtdTotal} unidades adicionadas</div>
                <small style="display:block; font-size: 11px; color: #fff; opacity: 1;">(${numLotes} lotes de 25)</small>
            `;

            if (!btnRetirar) {
                btnRetirar = document.createElement('button');
                btnRetirar.type = 'button';
                btnRetirar.className = 'btn-remover-doce';
                btnRetirar.innerText = 'Retirar 25 un.';
                btnRetirar.style.display = 'block';
                btnRetirar.style.width = '50%';
                btnRetirar.style.marginLeft = 'auto';
                btnRetirar.style.marginRight = 'auto';
                btnRetirar.style.marginTop = '8px';

                btnRetirar.onclick = () => removerLote(nomeDoce, botao);
                container.appendChild(btnRetirar);
            }
        } else {
            botao.style.backgroundColor = "";
            botao.style.color = "";
            botao.innerHTML = "Pedir 25 un.";
            if (btnRetirar) btnRetirar.remove();
        }
    }

    // --- SEUS CONTADORES (MANTIDOS) ---
    const totalUnidadesGeral = (pedido.doces || []).reduce((acc, d) => acc + (d.qtd || 0), 0);
    const boxFixo = document.getElementById('contador-fixo-doces');
    const txtTotalFixo = document.getElementById('total-unidades-doces');

    if (boxFixo && txtTotalFixo) {
        txtTotalFixo.innerText = totalUnidadesGeral;
        boxFixo.style.display = totalUnidadesGeral > 0 ? 'flex' : 'none';
    }

    atualizarContadorSacola();
    atualizarTudo(); 
}

// Função para o botão de "Retirar"
// Adicione o 'export' na frente da função
export function removerLote(nomeDoce, botaoOriginal) {
    let index = pedido.doces.findIndex(d => d.nome === nomeDoce);
    
    if (index !== -1) {
        pedido.doces[index].qtd -= 25;
        
        // --- ACRESCENTAR AQUI: Remove também da sacola visual ---
        let idxSacola = pedido.itens.findIndex(i => i.tipo === 'doces' && i.nome === nomeDoce);
        if (idxSacola !== -1) pedido.itens.splice(idxSacola, 1);
        // -------------------------------------------------------

        if (pedido.doces[index].qtd <= 0) {
            pedido.doces.splice(index, 1);
        } else {
            pedido.doces[index].valor = pedido.doces[index].qtd * pedido.doces[index].precoUnit;
        }
    }
    
    const btnElement = (typeof botaoOriginal === 'string') 
        ? document.querySelector(`[data-nome="${nomeDoce}"]`) 
        : botaoOriginal;

    atualizarInterfaceDoces(btnElement, nomeDoce);
    atualizarDadosCarrinho(); // Força a sacola a atualizar
    atualizarTudo();
}

export function calcularTotalGeral() {
    // 1. Soma todos os BOLOS já salvos na sacola
    const totalBolosConfirmados = pedido.itens.reduce((acc, item) => acc + (item.valorIndividual || 0), 0);

    // 2. Soma todos os DOCES salvos
    const totalDoces = pedido.doces.reduce((acc, doce) => acc + (doce.valor || 0), 0);

    // 3. Soma o rascunho ATUAL (se ele tiver peso, significa que está sendo editado)
    let temRascunho = 0;
    if (pedido.pesoKg > 0) {
        temRascunho = calcularValorApenasDesteBolo(); // sua função de cálculo unitário
    }

    // 4. Soma Adicionais Globais (Se você os cobrar fora do bolo)
    const adicionais = (pedido.valorTopo || 0) + (pedido.valorEmbalagem || 0);

    const totalFinal = totalBolosConfirmados + totalDoces + temRascunho + adicionais;

    // Atualiza no HTML (procure o ID correto do seu campo de total)
    const campoTotal = document.getElementById('valor-total-sacola');
    if (campoTotal) {
        campoTotal.innerText = `R$ ${totalFinal.toFixed(2).replace('.', ',')}`;
    }

    return totalFinal;
}

export function copiarPix() {
    const copyText = document.getElementById("pix-copia-e-cola");
    copyText.select();
    navigator.clipboard.writeText(copyText.value);
    alert("Código PIX copiado!");
}

export function atualizarVisualMetodo(metodo) {
    // Remove a classe 'selected' de todos os botões de pagamento
    document.querySelectorAll('.btn-pagamento').forEach(btn => {
        btn.classList.remove('selected');
        btn.style.border = "1px solid #ddd"; // Cor padrão
        btn.style.background = "white";
    });

    // Adiciona o destaque ao botão clicado
    const idAlvo = metodo === 'pix' ? 'btnMetodoPix' : 'btnMetodoCartao';
    const elemento = document.getElementById(idAlvo);
    if (elemento) {
        elemento.classList.add('selected');
        elemento.style.border = "2px solid #783606"; // Cor da sua marca
        elemento.style.background = "#fdf5e6"; // Fundo leve
    }
}

export function adicionarBoloAoCarrinho() {
    // 1. Validação de Segurança
    if (pedido.pesoKg <= 0 || !pedido.massa) {
        if (typeof mostrarNotificacao === "function") {
            mostrarNotificacao("Selecione o peso e a massa antes de adicionar.");
        }
        return;
    }
    // --- NOVIDADE SÊNIOR: MAPEAMENTO DO TÍTULO ---
    const paginaAtual = document.body.getAttribute('data-pagina');
    const nomesCategorias = {
        'personalizado': 'Bolo Personalizado',
        'corte': 'Bolo de Corte',
        'pedido': 'Bolos Clássicos',
        'doces': 'Doces Tradicionais'
    };
    const tituloDefinido = nomesCategorias[paginaAtual] || 'Bolo';
    
    const obsGeral = document.getElementById("observacaoPedido")?.value.trim() || "";
    const obsTopo = document.getElementById("topo-obs")?.value || "";
    // 2. Sincroniza textos do topo (se houver a função)
    if (typeof salvarDadosTopoNoPedido === "function") salvarDadosTopoNoPedido();

    // 3. Criamos o Objeto IMUTÁVEL (Snapshot do momento)
    const novoItem = {
        id: Date.now(),
        titulo: tituloDefinido, // <--- ADICIONADO AQUI
        tipo: paginaAtual || 'bolo',
        formato: pedido.formato || "Padrão",
        massa: pedido.massa,
        recheios: [...(pedido.recheios || [])],
        pesoKg: pedido.pesoKg,
        complemento: pedido.complemento || "",
        modeloImagem: pedido.modeloImagem || 'assets/LOGO.jpg',
        topo: pedido.topo || false,
        topoTipo: pedido.topoTipo || "padrao",
        nomeTopo: pedido.nomeTopo || "",
        idadeTopo: pedido.idadeTopo || "",
        obsTopo: obsTopo || "",
        embalagem: pedido.embalagem || false,
        preferenciaPeso: pedido.preferenciaPeso || "", // <--- IMPORTANTE SALVAR AQUI TAMBÉM
        observacao: obsGeral, // Agora a observação entra no DNA do item salvo
        valorIndividual: calcularValorApenasDesteBolo()
    };

    if (!pedido.itens) pedido.itens = [];
    pedido.itens.push(novoItem);

    if (document.getElementById("observacaoPedido")) document.getElementById("observacaoPedido").value = "";

    // 5. O PULO DO GATO: Resetar o rascunho IMEDIATAMENTE
    // Isso impede que a próxima página "herde" os dados do bolo anterior
    pedido.massa = "";
    pedido.recheios = [];
    pedido.pesoKg = 0;
    pedido.complemento = "";
    pedido.modeloImagem = "";
    pedido.modelo = null;
    pedido.formato = "";
    
    // Reset de opcionais para o próximo bolo não vir com topo/embalagem do anterior
    pedido.topo = false;
    pedido.topoTipo = "padrao";
    pedido.nomeTopo = "";
    pedido.idadeTopo = "";
    pedido.obsTopo = "";
    pedido.embalagem = false;

    // 6. RESET VISUAL (UI)
    const camposTopo = document.getElementById('campos-topo');
    if (camposTopo) camposTopo.style.display = 'none';

    // Limpa inputs de texto
    ['topo-nome', 'topo-idade', 'topo-obs'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = "";
    });

    // Reset de botões (Volta ao estado marrom/original)
    document.querySelectorAll('.btn-eu-quero, .btn-opcao').forEach(btn => {
        btn.classList.remove('ativo', 'selecionado', 'active');
        if (btn.innerText.includes("✔")) btn.innerText = "Eu quero";
        btn.style.backgroundColor = "";
        btn.style.color = "";
    });

    // 7. Persistência e Atualização Global
    localStorage.setItem('carrinho_dayane', JSON.stringify(pedido));
    if (typeof salvarNoLocalStorage === "function") salvarNoLocalStorage();

    // AGORA chamamos a atualização da interface
    if (typeof atualizarDadosCarrinho === "function") {
        atualizarDadosCarrinho(); 
    }


    

    const banner = document.getElementById('banner-pendente');
    if (banner) {
        banner.remove();
        console.log("🧹 Banner removido: Cliente iniciou uma nova compra.");
    }
    // POR ÚLTIMO, abrimos o carrinho
    // Não chame atualizarTudo() aqui se ela resetar o estado da página
    abrirDrawer(); 
    
    console.log("🚀 Bolo adicionado e carrinho comandado a abrir!");

}

export function inicializarEventosDoces() {
    const botoesDoce = document.querySelectorAll('.btn-eu-quero[data-tipo="doce"]');
    
    botoesDoce.forEach(btn => {
        btn.addEventListener('click', () => {
            const nome = btn.getAttribute('data-nome');
            const precoUnid = parseFloat(btn.getAttribute('data-preco'));
            const quantidade = 25; 
            const subtotal = precoUnid * quantidade;

            // 1. Controle interno para pintar botões
            if (!pedido.doces) pedido.doces = [];
            let doceExistente = pedido.doces.find(d => d.nome === nome);
            
            if (doceExistente) {
                doceExistente.qtd += quantidade;
                doceExistente.valor = doceExistente.qtd * precoUnid;
            } else {
                pedido.doces.push({
                    nome: nome,
                    qtd: quantidade,
                    precoUnit: precoUnid,
                    valor: subtotal
                });
            }

            // 2. Criar o objeto para a sacola (Carrinho)
            const novoDoce = {
                id: Date.now(), // Adicionado um ID único por segurança
                tipo: 'doces',
                nome: nome,
                quantidade: quantidade,
                valorIndividual: subtotal,
                imagem: btn.closest('.bolo-card').querySelector('img').src
            };

            // 3. Adiciona ao array global de itens
            if (!pedido.itens) pedido.itens = [];
            pedido.itens.push(novoDoce);

            // 4. Persistência
            localStorage.setItem('carrinho_dayane', JSON.stringify(pedido));

            // 5. ATUALIZAÇÃO DA TELA (Onde a mágica acontece)
            if (typeof atualizarInterfaceDoces === "function") {
                atualizarInterfaceDoces(btn, nome); 
            }
            
            // Atualiza os números dentro da sacola
            atualizarDadosCarrinho(); 
            
            // ABRE O CARRINHO IMEDIATAMENTE (Sem travas de termos)
            if (typeof abrirDrawer === "function") {
                abrirDrawer(); 
            }

            console.log(`✅ ${nome} adicionado e carrinho aberto!`);
        });
    });
}

