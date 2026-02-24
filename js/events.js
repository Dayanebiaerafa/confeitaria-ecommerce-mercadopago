export let processandoClique = false;
export let fluxoJaInicializado = false;
// 1. UNIFICAÇÃO DE IMPORTS (Todos no topo, sem repetições)
import { pedido, etapaAtual, metodoSelecionado } from './state.js';
import { atualizarTudo } from './calculate.js';
import { validarCarrinhoAntesDeAbrir } from './utils.js';
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
    drawer,
    overlay
} from './ui-updates.js';
import { atualizarContadorSacola } from './ui-updates.js';



// --- EVENTOS DE SELEÇÃO BASE (Peso, Massa, Recheio) ---
export function inicializarEventosBase() {
    const pesoSelect = document.getElementById("pesoSelect");
    pesoSelect?.addEventListener("change", e => {
        pedido.pesoKg = parseFloat(e.target.value) || null;
        atualizarTudo();
        atualizarDadosCarrinho();
    });

    const massaSelect = document.getElementById("massaSelect");
    massaSelect?.addEventListener("change", () => {
        pedido.massa = massaSelect.value;
        atualizarTudo();
    });

    document.querySelectorAll('input[name="recheio"]').forEach(r => {
        r.addEventListener("change", () => {
            const selecionados = [...document.querySelectorAll('input[name="recheio"]:checked')];
            const todos = [...document.querySelectorAll('input[name="recheio"]')];
            pedido.recheios = selecionados.map(el => el.value);

            if (selecionados.length >= 2) {
                todos.forEach(el => { if (!el.checked) el.disabled = true; });
            } else {
                todos.forEach(el => el.disabled = false);
            }
            atualizarTudo();
        });
    });

    document.querySelectorAll('input[name="complemento"]').forEach(c => {
        c.addEventListener("change", () => {
            const selecionados = [...document.querySelectorAll('input[name="complemento"]:checked')];
            const todos = [...document.querySelectorAll('input[name="complemento"]')];
            pedido.complemento = selecionados[0]?.value || null;

            if (selecionados.length >= 1) {
                todos.forEach(el => { if (!el.checked) el.disabled = true; });
            } else {
                todos.forEach(el => el.disabled = false);
            }
            atualizarTudo();
        });
    });
}

// --- UNIFICADO: EVENTOS DE BOTÕES "EU QUERO" ---
export function inicializarEventosBotoes() {
    const botoes = document.querySelectorAll(".btn-eu-quero, .btn-opcao");

    botoes.forEach(btn => {
        btn.addEventListener("click", function() {
            const tipo = this.getAttribute('data-tipo');
            const valorPersonalizado = this.innerText.trim().toLowerCase();

            // --- 1. REGRA PÁGINA PERSONALIZADO: TOPO SIM/NÃO ---
            if (this.classList.contains('btn-opcao')) {
                const pai = this.parentElement;
                pai.querySelectorAll('.btn-opcao').forEach(b => b.classList.remove('active'));
                this.classList.add('active');

                const campos = document.getElementById('campos-topo');
                if (valorPersonalizado === 'sim') {
                    pedido.topo = true;
                    if (campos) campos.style.display = 'block';
                } else {
                    pedido.topo = false;
                    if (campos) campos.style.display = 'none';
                }
                atualizarTudo();
                return;
            }

            // --- 2. LÓGICA PARA DESMARCAR (Apenas Bolo, Modelo, Embalagem e Topo) ---
            // IMPORTANTE: Pulamos o 'doce' aqui porque ele tem lógica de somar/subtrair própria
            if (tipo !== 'doce' && (this.classList.contains('ativo') || this.classList.contains('selecionado'))) {
                this.classList.remove("ativo", "selecionado");
                this.innerText = "Eu quero";
                this.style.backgroundColor = ""; 
                this.style.color = "";
                
                if (tipo === "modelo" || tipo === "bolo") pedido.modelo = null;
                if (tipo === "topo") {
                    pedido.topo = false;
                    const campos = document.getElementById('campos-topo');
                    if (campos) campos.style.display = 'none';
                }
                if (tipo === "embalagem") pedido.embalagem = false;
                
                atualizarTudo();
                return; 
            }

            // --- 3. LÓGICA PARA SELECIONAR (Seleção Única para Bolos/Modelos) ---
            if (tipo === "modelo" || tipo === "bolo" || tipo === "topo") {
                const seletores = tipo === 'topo' ? '.btn-eu-quero[data-tipo="topo"]' : '[data-tipo="modelo"], [data-tipo="bolo"]';
                document.querySelectorAll(seletores).forEach(b => {
                    b.classList.remove("ativo", "selecionado");
                    b.innerText = "Eu quero";
                    b.style.backgroundColor = "";
                    b.style.color = "";
                });

                // Aplica o visual Selecionado (Rosa)
                this.classList.add("ativo", "selecionado");
                this.innerText = "✔ Selecionado";
                this.style.backgroundColor = "#e91e63"; 
                this.style.color = "#fff";
            }

            // --- 4. CAPTURA DE DADOS ESPECÍFICOS ---
            if (tipo === "modelo" || tipo === "bolo") {
                const img = this.closest(".bolo-card")?.querySelector("img") || this.closest(".topo-item")?.querySelector("img");
                if(img) pedido.modelo = img.src;
                const pesoSel = document.getElementById("pesoSelect")?.value;
                if (pesoSel) pedido.pesoKg = parseFloat(pesoSel);
            } 
            
            // --- LÓGICA DE DOCES (SOMA EM LOTES DE 25) ---
            else if (tipo === 'doce') {
                const nomeDoce = this.getAttribute('data-nome');
                const precoUnid = parseFloat(this.getAttribute('data-preco'));
                
                let indexDoce = pedido.doces.findIndex(d => d.nome === nomeDoce);

                if (indexDoce === -1) {
                    pedido.doces.push({ nome: nomeDoce, valor: precoUnid * 25, qtd: 25, precoUnit: precoUnid });
                } else {
                    pedido.doces[indexDoce].qtd += 25;
                    pedido.doces[indexDoce].valor = pedido.doces[indexDoce].qtd * precoUnid;

                    atualizarInterfaceDoces(this, nomeDoce); // Para mudar a cor do botão
                    atualizarTudo(); // Para atualizar o preço total na tela e no carrinho
                }

                // Atualiza a UI específica de doces (Contador 40% e botões)
                if (typeof atualizarInterfaceDoces === "function") {
                    atualizarInterfaceDoces(this, nomeDoce);
                }
            }
            
            else if (tipo === 'topo') { pedido.topo = true; }
            else if (tipo === 'embalagem') { 
                // Chamamos a função toggle que criamos acima para cuidar do visual
                toggleEmbalagem({ currentTarget: this });
                return; // Usamos return para não executar o atualizarTudo() duas vezes
            }

            atualizarTudo();
        });
    });

    // 1. Escuta o campo de peso manual
    const campoPeso = document.getElementById("pesoBolo");
    if (campoPeso) {
        campoPeso.addEventListener("input", (e) => {
            pedido.pesoKg = parseFloat(e.target.value) || 0; 
            atualizarTudo();
        });
    }

    // 2. Limpeza inicial
    document.querySelectorAll('[data-tipo="modelo"], [data-tipo="bolo"]').forEach(b => {
        b.classList.remove("ativo");
        b.innerText = "Eu quero";
        b.style.backgroundColor = ""; 
        b.style.color = "";          
    });

    // 3. Evento do botão final
    const btnFechar = document.getElementById('btn-fechar-pedido'); 
    if (btnFechar) {
        btnFechar.addEventListener('click', () => {
            atualizarDadosCarrinho(); 
            if (typeof atualizarContadorSacola === "function") atualizarContadorSacola();
            mostrarNotificacao("Pedido adicionado à sacola!");
        });
    }

    // Captura a preferência de peso (Radio Buttons)
    document.querySelectorAll('input[name="pesoPreferencia"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            pedido.preferenciaPeso = e.target.value;
            // Chamamos a atualização para o resumo final ler o dado novo
            if (typeof atualizarResumoFinal === "function") {
                atualizarResumoFinal();
            }
        });
    });
}

// --- FLUXO DO CARRINHO (Avançar, Voltar, Abrir/Fechar) ---
export function inicializarFluxoCarrinho() {

    if (fluxoJaInicializado) return; // Se já rodou uma vez, não roda de novo!
    fluxoJaInicializado = true;
    
    const btnAvancar = document.getElementById("btnAvancar");
    const btnVoltar = document.getElementById("btnVoltar");
    const btnCarrinhoIcone = document.getElementById('btnCarrinho');
    const btnFechar = document.getElementById("btnFecharCarrinho");
    const overlayLocal = document.getElementById("overlay");
    const emailInput = document.getElementById("emailCliente");


    // 1. Botão Confirmar do site (Abre o carrinho) - MANTIDO
    const btnConfirmar = document.getElementById("btnConfirmarPedido");
    if (btnConfirmar) {
        btnConfirmar.onclick = function() {
            if (!validarCarrinhoAntesDeAbrir()) return false;
            atualizarDadosCarrinho();
            mostrarNotificacao("Pedido adicionado com sucesso! 🎂");
            atualizarContadorSacola();
            atualizarTudo();
        };
    }

    // 2. Ícone da Sacola - MANTIDO
    if (btnCarrinhoIcone) {
        btnCarrinhoIcone.onclick = function(e) {
            e.preventDefault();
            if (typeof abrirDrawer === "function") {
                abrirDrawer();
                atualizarDadosCarrinho();
            }
        };
    }


    const btnPix = document.getElementById("btnMetodoPix");
    const btnCartao = document.getElementById("btnMetodoCartao");

    if (btnPix) {
        btnPix.addEventListener("click", () => escolherMetodo('pix'));
    }
    if (btnCartao) {
        btnCartao.addEventListener("click", () => escolherMetodo('credit_card'));
    }

    // --- 3. NAVEGAÇÃO AVANÇAR (VERSÃO AJUSTADA PARA NÃO DUPLICAR) ---
    if (btnAvancar) {
        // Limpeza de eventos acumulados (Técnica do Clone)
        const novoBtnAvancar = btnAvancar.cloneNode(true);
        btnAvancar.parentNode.replaceChild(novoBtnAvancar, btnAvancar);

        novoBtnAvancar.addEventListener("click", async () => {
            if (processandoClique) return; 
            processandoClique = true;

            console.log("DEBUG: Clique ÚNICO real. Etapa:", etapaAtual);

            // ETAPA 1: Validação de Dados do Cliente
            if (etapaAtual === 1) {
                const nome = document.getElementById("nomeCliente")?.value.trim();
                const tel = document.getElementById("telefoneCliente")?.value.trim();
                const email = document.getElementById("emailCliente")?.value.trim();
                const data = document.getElementById("dataPedido")?.value;
                const horario = document.getElementById("horarioPedido")?.value;
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

                // AJUSTE SÊNIOR: Liberar o clique em todos os alertas de erro
                if (!nome || nome.length < 3) { processandoClique = false; return alert("⚠️ Digite seu nome."); }
                if (!tel || tel.length < 10) { processandoClique = false; return alert("⚠️ Por favor, digite um telefone válido."); }
                if (!email || !emailRegex.test(email)) { processandoClique = false; return alert("⚠️ Por favor, digite um e-mail válido."); }
                if (!data) { processandoClique = false; return alert("⚠️ Por favor, selecione a data."); }
                if (!horario) { processandoClique = false; return alert("⚠️ Por favor, selecione o horário."); }

                // Salva no Estado
                pedido.cliente = { nome, telefone: tel, email, data, horario };
                console.log("Sênior Log: Dados salvos:", pedido.cliente);
            }

            // ETAPA 2: Validação de Pagamento
            if (etapaAtual === 2) {
                const metodoReal = window.metodoSelecionado || metodoSelecionado;
                if (!metodoReal) {
                    processandoClique = false; 
                    return alert("⚠️ Por favor, selecione uma forma de pagamento (Pix ou Cartão).");
                }
            }

            // MUDANÇA DE TELA
            if (etapaAtual < etapas.length - 1) {
                const proxima = etapaAtual + 1;
                
                if (proxima === 3) {
                    atualizarResumoFinal();
                    const containerMP = document.getElementById('container-pagamento-mp');
                    if (containerMP) containerMP.style.display = 'block';
                }

                mostrarEtapa(proxima);
                
                // Libera o botão após a animação de transição
                setTimeout(() => { processandoClique = false; }, 800);
            } else {
                processandoClique = false; // Garante liberação se chegar na última etapa
            }
        });
    }

    // --- 4. NAVEGAÇÃO VOLTAR - MANTIDO ---
    btnVoltar?.addEventListener("click", () => {
        if (etapaAtual > 0) mostrarEtapa(etapaAtual - 1);
    });

    // --- 5. FECHAMENTO - MANTIDO ---
    btnFechar?.addEventListener("click", fecharDrawer);
    overlayLocal?.addEventListener("click", fecharDrawer);

    // --- 6. ESCUTA DE E-MAIL (CORRIGIDA) ---
    if (emailInput) {
        emailInput.oninput = (e) => {
            pedido.cliente.email = e.target.value.trim();
        };
    }
}
// --- MODAIS E COOKIES ---
export function inicializarEventosModais() {
    document.getElementById("abrirModal")?.addEventListener("click", (e) => {
        e.preventDefault();
        if(modalTermos) modalTermos.style.display = "block";
    });

    document.querySelector(".fechar")?.addEventListener("click", fecharModalTermos);
    document.getElementById("entendiBtn")?.addEventListener("click", () => {
        fecharModalTermos();
        if(checkTermos) checkTermos.checked = true;
    });

    document.getElementById("fecharModalErro")?.addEventListener("click", fecharErro);
    document.getElementById("entendiErroBtn")?.addEventListener("click", fecharErro);

    window.addEventListener("click", (event) => {
        if (event.target === modalErro) fecharErro();
        if (event.target === modalTermos) fecharModalTermos();
    });
}

export function inicializarCookies() {
    const caixaCookies = document.getElementById('caixa-cookies');
    const btnAceitar = document.getElementById('btn-aceitar-cookies');
    if (!caixaCookies || !btnAceitar) return;
    if (localStorage.getItem('cookies_dayane_aceitos') === 'true') caixaCookies.style.display = 'none';

    btnAceitar.addEventListener('click', () => {
        caixaCookies.style.opacity = '0';
        setTimeout(() => { caixaCookies.style.display = 'none'; }, 500);
        localStorage.setItem('cookies_dayane_aceitos', 'true');
    });
}

// Esta função lê os campos da tela e salva no objeto global
export function salvarDadosTopoNoPedido() {
    // Note que usei os IDs 'topo-nome', etc., que você definiu no forEach
    pedido.nomeTopo = document.getElementById('topo-nome')?.value || "";
    pedido.idadeTopo = document.getElementById('topo-idade')?.value || "";
    pedido.obsTopo = document.getElementById('topo-obs')?.value || "";
}

export function inicializarEventosInputTopo() {
    ['topo-nome', 'topo-idade', 'topo-obs'].forEach(id => {
        const elemento = document.getElementById(id);
        if (elemento) {
            elemento.addEventListener('input', () => {
                salvarDadosTopoNoPedido(); // Primeiro salva o dado
                atualizarDadosCarrinho();  // Depois atualiza a sacola/resumo
            });
        }
    });
}

// --- REMOÇÃO DE ITENS COM RESET VISUAL ---
// Não esqueça de importar a nova função no topo do arquivo events.js:
// import { resetarBotoesVisualmente, atualizarDadosCarrinho } from './ui-updates.js';

export function inicializarEventosRemocaoCarrinho() {
    const drawerCarrinho = document.getElementById("drawerCarrinho");
    if (!drawerCarrinho) return;

        drawerCarrinho.addEventListener("click", function(event) {
        const btnExcluir = event.target.closest('.lixeira');
        if (!btnExcluir) return;

        const tipo = btnExcluir.getAttribute('data-item');

        if (tipo === 'bolo') {
            pedido.pesoKg = 0; // Zera o peso para o valor total ser 0
            pedido.massa = null;
            pedido.recheios = [];
            pedido.complemento = null;
            pedido.modelo = null;
        } else if (tipo === 'topo') {
            pedido.topo = false;
            pedido.nomeTopo = "";
        } else if (tipo === 'embalagem') {
            pedido.embalagem = false;
        }

        // AQUI ESTÁ O SEGREDO:
        resetarBotoesVisualmente(tipo); // Tira as cores da página
        
        if (typeof atualizarTudo === 'function') {
            atualizarTudo(); // Recalcula e zera o valor na tela
        }
        atualizarDadosCarrinho(); // Atualiza a lista do carrinho
    });
}    
// 2. Adicione esta nova função no final do arquivo events.js
// No final do arquivo events.js, substitua a função inicializarEventosSetas por esta:
export function inicializarEventosSetas() {
    const btnAnt = document.querySelector('.seta-anterior');
    const btnProx = document.querySelector('.seta-proximo');

    // Usando o nome correto da função que está no seu ui-updates.js
    if (btnAnt) btnAnt.addEventListener('click', () => scrollCarousel(-1));
    if (btnProx) btnProx.addEventListener('click', () => scrollCarousel(1));
}

// Função de exclusão:
export function excluirPedidoBolo() {
    // 1. Zera os dados no objeto (Lógica)
    pedido.pesoKg = 0;
    pedido.recheios = [];
    pedido.massa = "";
    
    // 2. Limpa a interface (Visual)
    resetarBotoesVisualmente('bolo');
    limparDescricoesCarrinho();
    
    // 3. Recalcula o valor (Financeiro)
    atualizarTudo();
}

// Adicione este evento no seu código de inicialização
document.getElementById('dataPedido')?.addEventListener('change', configurarHorarios);

function configurarHorarios() {
    const dataInput = document.getElementById('dataPedido');
    const horarioSelect = document.getElementById('horarioPedido');
    const paginaAtual = document.body.getAttribute('data-pagina');

    if (!dataInput.value) return;

    // Calcula a diferença de dias
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const dataEscolhida = new Date(dataInput.value + 'T00:00:00');
    const diferencaDias = Math.ceil((dataEscolhida - hoje) / (1000 * 60 * 60 * 24));

    // Limpa o select
    horarioSelect.innerHTML = '<option value="">Selecione um horário</option>';

    let horarios = [];

    // --- REGRA 1: PERSONALIZADO E DOCES (Mínimo 3 dias) ---
    if (paginaAtual === 'personalizado' || paginaAtual === 'doces') {
        if (diferencaDias < 3) {
            alert("Bolos personalizados e doces exigem no mínimo 3 dias de antecedência.");
            dataInput.value = "";
            return;
        }
        horarios = gerarIntervalos("09:00", "19:00");
    } 
    
    // --- REGRA 2: PEDIDO E BOLO DE CORTE ---
    else if (paginaAtual === 'pedido' || paginaAtual === 'corte') {
        if (diferencaDias < 1) {
            alert("A encomenda deve ser feita com no mínimo 1 dia de antecedência.");
            dataInput.value = "";
            return;
        }

        if (diferencaDias === 1) {
            // De um dia para o outro: 16h às 19h
            horarios = ["16:00 às 17:00", "17:00 às 18:00", "18:00 às 19:00"];
        } else {
            // 2 dias ou mais: 09h às 18:30h
            horarios = gerarIntervalos("09:00", "19:00");
        }
    }

    // Preenche o select com os horários permitidos
    horarios.forEach(h => {
        const opt = document.createElement('option');
        opt.value = h;
        opt.text = h;
        horarioSelect.appendChild(opt);
    });
}

// Função auxiliar para criar horários de 1 em 1 hora
function gerarIntervalos(inicio, fim) {
    const lista = [];
    let hora = parseInt(inicio.split(':')[0]);
    const horaFim = parseInt(fim.split(':')[0]);
    
    for (let i = hora; i < horaFim; i++) {
        let proxima = i + 1;
        lista.push(`${i}h às ${proxima}h`);
    }
    // Adiciona o último intervalo se necessário (ex: até 18:30)
    lista.push(`${horaFim}h às 19:00h`); 
    return lista;
}