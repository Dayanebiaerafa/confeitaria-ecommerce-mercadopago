import { pedido, etapaAtual, setEtapaAtual, porcentagemPagamento, setMetodoSelecionado, metodoSelecionado, setPorcentagemPagamento } from './state.js';
import { formatarDataBR, removerLoteDoce } from './utils.js';
import { calcularTotal, atualizarTudo } from './calculate.js';


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
    // 1. Buscamos TODOS os badges de contador (caso tenha mais de um na página)
    const badges = document.querySelectorAll(".cart-count");
    if (badges.length === 0) return;

    // 2. Calculamos o total (Doces unidades + Bolo como 1 item)
    const totalDoces = (pedido.doces || []).reduce((acc, d) => acc + (d.qtd || 0), 0);
    const temBolo = (pedido.pesoKg > 0) ? 1 : 0;
    
    // IMPORTANTE: Para a página de doces, o cliente espera ver a quantidade de doces.
    // Para a página de bolos, ele vê 1. A soma garante os dois.
    const somaTotal = totalDoces + temBolo;

    // 3. Atualizamos todos os badges encontrados
    badges.forEach(badge => {
        badge.innerText = somaTotal;
        
        if (somaTotal > 0) {
            badge.style.setProperty('display', 'flex', 'important');
            badge.style.background = "red";
        } else {
            badge.style.display = "none";
        }
    });

    console.log("Sênior Log: Sacola atualizada para " + somaTotal);
}

export function abrirDrawer() {
    // Removemos a trava do "if (!temDoces...)" para permitir que o drawer abra 
    // e mostre a mensagem "Sua sacola está vazia" caso o clique seja muito rápido.
    
    const tipoPagina = document.body.getAttribute('data-pagina');
    const blocoBolo = document.getElementById('bloco-bolo-carrinho');

    if (tipoPagina === 'doces' && blocoBolo) {
        blocoBolo.style.display = 'none'; 
    }

    if (drawer && overlay) {
        drawer.classList.add("ativo");
        overlay.classList.add("ativo");
        
        // ESSENCIAL: Força a atualização dos dados assim que abre
        atualizarDadosCarrinho(); 
        mostrarEtapa(0);
    }
}

export function fecharDrawer() {
    if (drawer && overlay) {
        drawer.classList.remove("ativo");
        overlay.classList.remove("ativo");
    }
}

export function mostrarEtapa(index) {
    window.scrollTo(0, 0); 

    // 1. Alterna as etapas (Isso define quem fica visível)
    etapas.forEach((etapa, i) => {
        if (etapa) etapa.classList.toggle("hidden", i !== index);
    });

    // 2. Lógica específica para a Etapa de Pagamento (Index 3)
    if (index === 3) { 
        const etapaFinalizar = document.getElementById("etapaFinalizar");
        if (etapaFinalizar) {
            etapaFinalizar.classList.remove("hidden");
        }
    // FUNÇÃO DE VERIFICAÇÃO SÊNIOR
        const aguardarRenderizacao = () => {
                const brickContainer = document.getElementById("paymentBrick_container");
                
                // 1. Verifica se o container existe e está visível
                if (brickContainer && brickContainer.offsetWidth > 0) {
                    
                    // 2. TRAVA DE SEGURANÇA: Só inicializa se o container estiver vazio
                    // Se já tiver "iframe" ou "mp-bricks", significa que já carregou.
                    if (brickContainer.innerHTML.includes("iframe") || window.mpInstanciado) {
                        console.log("Sênior Log: Mercado Pago já carregado, pulando...");
                        return;
                    }

                    console.log("✅ Container pronto. Iniciando Mercado Pago...");
                    
                    // Marca que estamos instanciando para evitar duplicidade
                    window.mpInstanciado = true; 

                    if (typeof inicializarCheckoutTransparente === 'function') {
                        inicializarCheckoutTransparente();
                    } else {
                        // Caso a função venha de um import
                        import('./payment.js').then(m => m.inicializarCheckoutTransparente());
                    }
                } else {
                    console.warn("⏳ Aguardando container...");
                    setTimeout(aguardarRenderizacao, 200);
                }
            };
    };
    

    const btnVoltar = document.getElementById("btnVoltar");
    const btnAvancar = document.getElementById("btnAvancar");
    const rodape = document.querySelector(".drawer-footer"); 

    // 1. Lógica do Botão Voltar (Lado Esquerdo)
    if (btnVoltar) {
        if (index === 0) {
            btnVoltar.style.display = "none";
        } else {
            btnVoltar.style.display = "block";
            btnVoltar.style.marginRight = "auto"; // Garante que ele fique na esquerda
        }
    }

    // 2. Lógica do Botão Avançar (Lado Direito)
    if (btnAvancar) {
        // Na etapa 0, como não tem o botão Voltar, forçamos o Avançar para a direita
        if (index === 0) {
            btnAvancar.style.marginLeft = "auto"; 
            btnAvancar.style.marginRight = "0";
        } else {
            // Nas outras etapas, o space-between do rodapé já resolve, 
            // mas mantemos o margin-left auto por segurança.
            btnAvancar.style.marginLeft = "auto";
        }
    }

    // 3. Ajuste do Rodapé (Para garantir o alinhamento Flex)
    if (rodape) {
        rodape.style.display = "flex";
        rodape.style.justifyContent = "space-between";
        rodape.style.alignItems = "center";
    }

    // Mantendo suas funções de estado e visual
    setEtapaAtual(index); 
    atualizarStepper(index);

    if (typeof atualizarRodape === "function") {
        atualizarRodape(index);
    }
}
         

        

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


    // --- ATUALIZAÇÃO DA IMAGEM ---
    const imgProduto = document.getElementById('cartImagemCorte');
    if (imgProduto) {
        // Define o caminho com base no formato selecionado
        if (formato === 'Quadrado') {
            imgProduto.src = 'assets/modelo/boloquadrado.jpeg';
            imgProduto.alt = 'Bolo de Corte Quadrado';
        } else if (formato === 'Redondo') {
            imgProduto.src = 'assets/modelo/boloredondo.jpeg';
            imgProduto.alt = 'Bolo de Corte Redondo';
        } else if (formato === 'Coração') {
            // Se tiver imagem de coração, coloque o caminho aqui
            imgProduto.src = 'assets/modelo/bolocoracao.jpeg'; 
        }
        
        // Garante que a imagem apareça (caso esteja com display: none)
        imgProduto.style.display = 'block';
    }


    atualizarTudo();
    
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

    // 1. LÓGICA PARA DESMARCAR (Se clicar no que já está rosa)
    if (btn.classList.contains('ativo') || btn.classList.contains('active')) {
        pedido.topo = false;
        btn.classList.remove('ativo', 'active');
        
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

        const campos = document.getElementById('campos-topo');
        if (campos) campos.style.display = 'block';
    }

    atualizarTudo();
}

/* ===============================
   RESUMO E ATUALIZAÇÃO DO CARRINHO
=============================== */

// No arquivo ui-updates.js - SUBSTITUA a função existente por esta:

export function atualizarDadosCarrinho() {
    const imgBolo = document.getElementById('cartImagem');
    const descBolo = document.getElementById('cartDescricao');
    const pesoBolo = document.getElementById('cartPeso');
    const blocoBolo = document.querySelector('.bloco-produto'); 
    const listaDocesContainer = document.getElementById('lista-doces-itens');
    const blocoDoces = document.getElementById('bloco-doces-carrinho');
    const blocoForminhas = document.getElementById('bloco-custom-doces');
    const blocoPeso = document.getElementById('container-preferencia-peso');

    // 2. Lógica de Visibilidade (Só mostra se houver dado)
    const temBolo = (pedido.valorBolo > 0 || pedido.pesoKg > 0);
    const temDoces = (pedido.doces && pedido.doces.length > 0);

    // --- LÓGICA DO BOLO (Mantida original) ---
    // 1. Ajuste do Bloco de Preferência de Peso
    // 1. O Container Pai (que envolve os dois blocos) precisa ser Flex
    // --- AJUSTE SÊNIOR: VISIBILIDADE SEM QUEBRAR O LAYOUT ---
    // Removemos as manipulações de estilo manuais, pois o CSS já cuida disso.
   // --- AJUSTE SÊNIOR: VISIBILIDADE E CENTRALIZAÇÃO TOTAL ---
    if (blocoPeso) {
        // Garantimos que o bloco de peso seja um container flex centralizado
        blocoPeso.style.display = "flex";
        blocoPeso.style.flexDirection = "column";
        blocoPeso.style.justifyContent = "center"; // Centraliza vertical
        blocoPeso.style.alignItems = "center";     // Centraliza horizontal
        blocoPeso.style.textAlign = "center";

        if (temBolo) {
            blocoPeso.style.visibility = "visible";
            blocoPeso.style.opacity = "1";
            blocoPeso.style.pointerEvents = "auto";
        } else {
            blocoPeso.style.visibility = "hidden";
            blocoPeso.style.opacity = "0";
            blocoPeso.style.pointerEvents = "none";
        }
    }

    // Agora forçamos a centralização no Bloco de Valor Total (Card Azul)
    const cardTotal = document.getElementById("totalFinalPedido")?.parentElement;
    if (cardTotal) {
        cardTotal.style.display = "flex";
        cardTotal.style.flexDirection = "column";
        cardTotal.style.justifyContent = "center"; // Centraliza vertical
        cardTotal.style.alignItems = "center";     // Centraliza horizontal
        cardTotal.style.textAlign = "center";
    }

    // O cardTotal não precisa mais de ajustes via JS, 
    // pois o CSS com flex: 40% já mantém ele no lugar.
    if (blocoBolo) {
        blocoBolo.style.display = temBolo ? 'flex' : 'none';
        blocoBolo.style.flexShrink = "0"; // Também travamos o card do bolo
    }



    if (temBolo) {
        if (imgBolo) {
            imgBolo.src = pedido.modelo || 'assets/LOGO.jpg';
            imgBolo.style.display = pedido.modelo ? "block" : "none";
        }
        if (descBolo) {
            descBolo.innerHTML = `
                <p style="font-size: 13px; color: #333; line-height: 1.6; margin: 0;">
                    • <b>Formato:</b> ${pedido.formato || 'Redondo'}<br>
                    • <b>Massa:</b> ${pedido.massa || 'Padrão'}<br>
                    • <b>Recheio:</b> ${pedido.recheios.join(', ') || 'A definir'}
                    ${pedido.complemento ? `<br>• <b>Comp.:</b> ${pedido.complemento}` : ''}
                </p>`;
        }
        if (pesoBolo) pesoBolo.innerText = `${pedido.pesoKg} kg`;
    }

    // 3. Gerenciar Bloco de Doces (Cartões Azuis)
    if (blocoDoces) blocoDoces.style.display = temDoces ? 'block' : 'none';
    if (blocoForminhas) blocoForminhas.style.display = temDoces ? 'block' : 'none';

    // 4. RENDERIZAÇÃO DOS CARDS AZUIS (DOCES)
    if (listaDocesContainer) {
        listaDocesContainer.innerHTML = ''; // Limpa para não duplicar
        
        if (temDoces) {
            pedido.doces.forEach((doce, index) => {
                listaDocesContainer.innerHTML += `
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
                
            });
        }
    }
    



    // 1. ATUALIZAÇÃO DO BOLO COM AJUSTES VISUAIS
    if (pedido.pesoKg > 0) {
        if (blocoBolo) {
            blocoBolo.style.display = 'block';
            
            // GARANTIA DE ESPAÇAMENTO SÊNIOR:
            // Forçamos o Flexbox no bloco pai para separar a Pill da Descrição
            blocoBolo.style.display = 'flex';
            blocoBolo.style.flexDirection = 'column';
            blocoBolo.style.gap = '15px'; // Isso cria um espaço fixo entre a Pill e o Card
        }
        
        // Localize onde você atualiza a imagem do carrinho
        

        if (imgBolo) {
            if (pedido.modelo) {
                imgBolo.src = pedido.modelo;
                imgBolo.style.display = "block";
            } else {
                // Se não houver modelo, removemos o atributo src 
                // e escondemos para evitar o ícone de "imagem quebrada"
                imgBolo.removeAttribute('src');
                imgBolo.style.display = "none";
            }
        }

        // ATUALIZAÇÃO DA DESCRIÇÃO (Massa, Recheio, Complemento)
        if (descBolo) {
            descBolo.innerHTML = `
                <p style="font-size: 13px; color: #333; line-height: 1.6; margin: 0;">
                    • <b>Formato:</b> <span style="color: #000;">${pedido.formato || 'Redondo'}</span><br> • <b>Massa:</b> <span style="color: #000;">${pedido.massa || 'Padrão'}</span><br>
                    • <b>Recheio:</b> <span style="color: #000;">${pedido.recheios.length > 0 ? pedido.recheios.join(', ') : 'A definir'}</span>
                    ${pedido.complemento ? `<br>• <b>Complemento:</b> <span style="color: #000;">${pedido.complemento}</span>` : ''}
                </p>`;
        }
        
        // ATUALIZAÇÃO DO BADGE DE PESO (Onde estava o erro de sincronia)
        if (pesoBolo) {
            const containerBadge = pesoBolo.parentElement;
            containerBadge.style.display = "flex";
            containerBadge.style.alignItems = "center";
            containerBadge.style.gap = "5px"; 
            
            // Aqui garantimos que o texto do peso venha do objeto 'pedido' atualizado
            containerBadge.innerHTML = `
                <img src="assets/peso.png" style="width: 16px; height: 16px; object-fit: contain;" />
                <span id="cartPeso" style="color: #000; font-weight: bold;">${pedido.pesoKg} kg</span>
            `;
        
        }
    }

    

    // 4. LÓGICA DO TOPO E EMBALAGEM (Com seus IDs originais)
    const checkEmbalagem = document.getElementById('checkEmbalagem');
    const checkTopo = document.getElementById('checkTopo');
    const detalhesTopo = document.getElementById('detalhes-topo-carrinho');

    // Mostra/Esconde Embalagem
    if (checkEmbalagem) checkEmbalagem.style.display = pedido.embalagem ? 'flex' : 'none';

    // Mostra/Esconde Topo e detalhes
    if (pedido.topo && checkTopo) {
        checkTopo.classList.add('visivel');
        checkTopo.style.display = 'flex';
        
        // Pegamos os valores direto do objeto pedido (que já deve ter sido salvo pelos inputs)
        const nome = pedido.nomeTopo || "---";
        const idade = pedido.idadeTopo || "---";
        const obs = pedido.obsTopo || "---";
        
        if (detalhesTopo) {
            // Se houver qualquer informação, mostramos a div
            detalhesTopo.style.display = 'block';
            
            // Montamos a lista com quebras de linha <br>
            detalhesTopo.innerHTML = `
                <hr style="border:0.5px solid #eee; margin:5px 0;">
                - <b>Nome:</b> ${nome}<br>
                - <b>Idade:</b> ${idade} anos<br>
                - <b>Observação:</b> ${obs}`;
        }
    } else {
        if (checkTopo) {
            checkTopo.classList.remove('visivel');
            checkTopo.style.display = 'none';
        }
    }
    
    // Ajuste do Bloco de Valor Total
    const campoTotal = document.getElementById("totalFinalPedido");
    const containerTotal = campoTotal?.closest('.bloco-resumo-fixo') || campoTotal?.parentElement;

    if (containerTotal) {
        containerTotal.style.flexShrink = "0";   // IMPEDE de espremer o rodapé
        containerTotal.style.minHeight = "100px"; // Altura fixa para o total
        containerTotal.style.display = "flex";
        containerTotal.style.flexDirection = "column";
        containerTotal.style.justifyContent = "center";
    }

}


export function atualizarResumoFinal() {
    const tipoPg = document.body.getAttribute('data-pagina');
    
    // 1. PRIMEIRO: Calculamos os valores base (Ingredientes)
    const valorBaseBolo = typeof calcularTotal === "function" ? calcularTotal(pedido, tipoPg) : 0;
    const valorApenasDoces = (pedido.doces || []).reduce((acc, d) => acc + (parseFloat(d.valor) || 0), 0);

    
    // 2. SEGUNDO: Criamos o totalOriginal (A soma dos ingredientes)
    const totalOriginal = valorBaseBolo + valorApenasDoces;

    // 3. TERCEIRO: Agora que temos o total, calculamos o pagamento e o restante
    const valorPagarAgora = totalOriginal * (porcentagemPagamento || 1);
    const valorRestante = totalOriginal - valorPagarAgora;
    
    // 4. QUARTO: Criamos o formatador
    const formatador = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

   

    
    // --- 1. BLOCO NOME COMPLETO (IDENTIFICAÇÃO) ---
    const nome = document.getElementById("nomeCliente")?.value || "---";
    const tel = document.getElementById("telefoneCliente")?.value || "---";
    const email = document.getElementById("emailCliente")?.value || "---";
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
    if (pedido.pesoKg > 0) {
        // AJUSTE: Adicionado Formato
        if (pedido.formato) {
            htmlProdutos += `• <b>Formato:</b> ${pedido.formato}<br>`;
        }
        
        htmlProdutos += `• <b>Peso:</b> ${pedido.pesoKg}kg<br>`;
        
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
        const obsGeral = document.getElementById("observacaoPedido")?.value.trim();
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
            acc[d.nome] = (acc[d.nome] || 0) + d.qtd;
            return acc;
        }, {});

        // Adicionamos ao htmlProdutos que vai para o resumoDescricao
        htmlProdutos += `<br><b>Doces:</b><br>`;
        Object.entries(agrupados).forEach(([nome, qtdTotal]) => {
            htmlProdutos += `• ${qtdTotal} un. Docinho ${nome}<br>`;
        });
    }

    const elDesc = document.getElementById("resumoDescricao");
    if (elDesc) elDesc.innerHTML = htmlProdutos || "Nenhum item selecionado";

    // --- 3. BLOCO PAGAMENTO E CÁLCULOS ---
    const mSel = typeof metodoSelecionado !== 'undefined' ? metodoSelecionado : '';
    
    // AJUSTE: Negrito aplicado nas escritas Pix e Cartão
    const txtMetodo = mSel === 'pix' ? '<b>Pix</b>' : (mSel === 'credit_card' ? '<b>Cartão</b>' : '---');
    const txtPorcentagem = (porcentagemPagamento === 0.5) ? '50% (Entrada)' : '100% (Total)';

    // Preenche Pagamento, Subtotal e Total
    const elPagamento = document.getElementById("resumoPagamento");
    if (elPagamento) {
        elPagamento.innerHTML = `${txtMetodo} - ${txtPorcentagem}`;
    }

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
    
    if (porcentagemPagamento === 0.5 && valorRestante > 0) {
        if (blocoFalta) blocoFalta.style.display = "flex";
        if (elRestante) elRestante.innerText = formatador.format(valorRestante);
    } else {
        if (blocoFalta) blocoFalta.style.display = "none";
    }


    const totalFinal = calcularTotalGeral();
    const campoTotal = document.getElementById("totalFinalPedido"); 
    if (campoTotal) {
        campoTotal.innerText = totalFinal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }

    // Data e Horário
    const dataInput = document.getElementById("dataPedido")?.value;
    const dataBr = dataInput ? dataInput.split('-').reverse().join('/') : "---";
    const elData = document.getElementById("resumoData");
    const elHora = document.getElementById("resumoHorario");
    
    if (elData) elData.innerText = dataBr;
    if (elHora) elHora.innerText = document.getElementById("horarioPedido")?.value || "---";


    // --- ACRESCENTE ESTE BLOCO AQUI (Final da função) ---
    // Usamos o valorPagarAgora que você já calculou no passo 3 da sua função
    const elResumoTotal = document.getElementById("resumoTotal");
    if (elResumoTotal) {
        elResumoTotal.innerText = formatador.format(valorPagarAgora);
    }

}


/* ===============================
   MODAIS E UTILITÁRIOS VISUAIS
=============================== */
export const fecharModalTermos = () => { if(modalTermos) modalTermos.style.display = "none"; };
export const fecharErro = () => { if (modalErro) modalErro.style.display = "none"; };
export const abrirModalTermos = () => { if(modalTermos) modalTermos.style.display = "block"; };



export function escolherMetodo(metodo) {
    setMetodoSelecionado(metodo);
    window.metodoSelecionado = metodo; // Linha de segurança para o payment.js ler
    
    document.querySelectorAll('.btn-pagamento').forEach(btn => btn.classList.remove('selected'));
    const idAlvo = metodo === 'pix' ? 'btnMetodoPix' : 'btnMetodoCartao';
    const elemento = document.getElementById(idAlvo);
    if (elemento) elemento.classList.add('selected');
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




export function selecionarPorcentagem(valor) {
    // 1. Atualiza o valor no estado global
    setPorcentagemPagamento(valor);

    // 2. Atualiza o visual dos botões
    const btn50 = document.getElementById("btnPagar50");
    const btn100 = document.getElementById("btnPagar100");

    if (valor === 0.5) {
        btn50?.classList.add("active");
        btn100?.classList.remove("active");
    } else {
        btn100?.classList.add("active");
        btn50?.classList.remove("active");
    }
    
    // 3. Atualiza o valor total no resumo, se necessário
    if (typeof atualizarResumoFinal === "function") atualizarResumoFinal();
}

// Função para resetar visualmente todos os botões da página
// Adicione ao final do seu arquivo ui-updates.js
export function resetarBotoesVisualmente(tipo) {
    const classesDestaque = ['ativo', 'active', 'selecionado'];
    
    // --- 1. CASO: EMBALAGEM (Global) ---
    if (tipo === 'embalagem') {
        const btns = document.querySelectorAll('.coluna-embalagem .btn-eu-quero, [data-tipo="embalagem"]');
        limparElementos(btns, classesDestaque, "Eu quero");
    }

    // --- 2. CASO: TOPO (Diferencia Personalizado vs Pedido) ---
    else if (tipo === 'topo') {
        // Tenta limpar botões Sim/Não (Personalizado)
        const btnsOpcao = document.querySelectorAll('#btn-topo-sim, #btn-topo-nao');
        limparElementos(btnsOpcao, classesDestaque);

        // Tenta limpar botões "Eu quero" (Pedido)
        const btnsTopo = document.querySelectorAll('.coluna-topo .btn-eu-quero, [data-tipo="topo"]');
        limparElementos(btnsTopo, classesDestaque, "Eu quero");

        // Limpa inputs de texto do topo
        ['topo-nome', 'topo-idade', 'topo-obs'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = "";
        });
    }

    // --- 3. CASO: DOCES ---
    else if (tipo === 'doce') {
        const btnsDoces = document.querySelectorAll('.btn-eu-quero[data-tipo="doce"]');
        limparElementos(btnsDoces, classesDestaque, "Pedir 25 un.");
    }

    // --- 4. CASO: ENCOMENDA (Bolo - Pedido, Corte, Personalizado) ---
    else if (tipo === 'encomenda' || tipo === 'bolo') {
        // Seletores comuns de todos os bolos
        const seletoresBolo = [
            '.massa-item', '.recheio-item', '.btn-kg', 
            '.complemento-box label', '.recheios-box label',
            '.btn-corte', // Para o bolo de corte (Redondo/Quadrado)
            '[data-tipo="modelo"]' // Para a página de pedido
        ];

        const itensBolo = document.querySelectorAll(seletoresBolo.join(', '));
        limparElementos(itensBolo, classesDestaque, "Eu quero");

        // Reseta especificamente os selects
        const selects = ['pesoSelect', 'massaSelect', 'pesoBolo'];
        selects.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = "";
        });

        // Caso especial Bolo de Corte: Garante que o Redondo volte a ser o padrão ou limpe ambos
        const btnCorte = document.querySelectorAll('.btn-corte');
        btnCorte.forEach(b => b.classList.remove('active'));
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
    const pesoBolo = document.getElementById('cartPeso');
    const imgBolo = document.getElementById('cartImagem');
    const campos = ['resumo-massa', 'resumo-recheio', 'resumo-peso', 'resumo-modelo'];
    campos.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerText = "";
    });

    if (descBolo) descBolo.innerHTML = ""; 
    if (pesoBolo) pesoBolo.innerText = ""; 
    
    if (imgBolo) {
        imgBolo.src = "";
        imgBolo.style.display = "none";
    }
}

export function atualizarInterfaceDoces(botao, nomeDoce) {
    if (!botao) {
        botao = document.querySelector(`.btn-eu-quero[data-nome="${nomeDoce}"]`);
    }
    
    const doce = pedido.doces.find(d => d.nome === nomeDoce);
    const qtdTotal = doce ? doce.qtd : 0;

    if (botao) {
        // Buscamos o container (o pai do botão) para inserir o botão de retirar depois dele
        const container = botao.parentElement;
        // Tentamos encontrar um botão de retirar que já existe para não duplicar
        let btnRetirar = container.querySelector('.btn-remover-doce');

        if (qtdTotal > 0) {
            const numLotes = qtdTotal / 25;
            botao.style.backgroundColor = "#e91e63";
            botao.style.color = "#fff";
            botao.innerHTML = `
                <div style="font-weight: bold;">${qtdTotal} unidades adicionadas</div>
                <small style="display:block;  font-size: 11px; color: #fff; opacity: 1;">(${numLotes} lotes de 25)</small>
            `;

            // Se o botão retirar não existe ainda, criamos ele EMBAIXO
            if (!btnRetirar) {
                btnRetirar = document.createElement('button');
                btnRetirar.type = 'button';
                btnRetirar.className = 'btn-remover-doce';
                btnRetirar.innerText = 'Retirar 25 un.';
                
                // CONFIGURAÇÃO DE CENTRALIZAÇÃO SÊNIOR
                btnRetirar.style.display = 'block';   // Ocupa a linha toda como bloco
                btnRetirar.style.width = '50%';       // Ajustei para 70% para caber melhor o texto
                btnRetirar.style.marginLeft = 'auto';  // Empurra da esquerda para o centro
                btnRetirar.style.marginRight = 'auto'; // Empurra da direita para o centro
                btnRetirar.style.marginTop = '8px';    // Dá um respiro do botão de cima

                // Configura o clique do retirar
                btnRetirar.onclick = () => removerLote(nomeDoce, botao);
                
                container.appendChild(btnRetirar);
            }
            
        } else {
            // Se zerou, volta o botão principal ao normal
            botao.style.backgroundColor = "";
            botao.style.color = "";
            botao.innerHTML = "Pedir 25 un.";
            
            // E remove o botão retirar se ele existir
            if (btnRetirar) btnRetirar.remove();
        }
    }

    // Atualizações de contadores e totais (MANTIDO)
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
        
        if (pedido.doces[index].qtd <= 0) {
            pedido.doces.splice(index, 1);
        } else {
            pedido.doces[index].valor = pedido.doces[index].qtd * pedido.doces[index].precoUnit;
        }
    }
    
    // IMPORTANTE: Se botaoOriginal for uma String (ID), precisamos converter para o elemento
    const btnElement = (typeof botaoOriginal === 'string') 
        ? document.querySelector(`[data-nome="${nomeDoce}"]`) 
        : botaoOriginal;

    atualizarInterfaceDoces(btnElement, nomeDoce);
    atualizarTudo();
}

export function calcularTotalGeral() {
    // 1. Valor do Bolo (se existir)
    const valorBolo = pedido.valorBolo || 0;

    // 2. Valor dos Doces (Soma o campo .valor de cada item no array)
    const valorDoces = (pedido.doces || []).reduce((acc, doce) => acc + (doce.valor || 0), 0);

    // 3. Adicionais (Topo, Embalagem, etc - se você cobrar por eles)
    const valorAdicionais = (pedido.topo ? (pedido.valorTopo || 0) : 0) + 
                            (pedido.embalagem ? (pedido.valorEmbalagem || 0) : 0);

    return valorBolo + valorDoces + valorAdicionais;
}

export function copiarPix() {
    const copyText = document.getElementById("pix-copia-e-cola");
    copyText.select();
    navigator.clipboard.writeText(copyText.value);
    alert("Código PIX copiado!");
}