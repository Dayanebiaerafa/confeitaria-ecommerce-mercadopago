export let processandoClique = false;
export let fluxoJaInicializado = false;
// 1. UNIFICAÇÃO DE IMPORTS (Todos no topo, sem repetições)
import { pedido, etapaAtual, adicionarDoceAoPedido, salvarNoLocalStorage } from './state.js';
import { atualizarTudo } from './calculate.js'
import { validarCarrinhoAntesDeAbrir, configurarCalendario } from './utils.js';
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
    atualizarContadorSacola
} from './ui-updates.js';




// --- EVENTOS DE SELEÇÃO BASE (Peso, Massa, Recheio) ---
export function inicializarEventosBase() {
    const pesoSelect = document.getElementById("pesoSelect");
    pesoSelect?.addEventListener("change", e => {
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

    const inputHora = document.getElementById('horarioPedido');
    if (inputHora) {
        inputHora.addEventListener('change', (e) => {
            if (!pedido.cliente) pedido.cliente = {};
            pedido.cliente.horario = e.target.value;
            
            // Sênior: Salva imediatamente para não perder se der F5
            localStorage.setItem('carrinho_dayane', JSON.stringify(pedido));
            console.log("💾 Horário salvo no Storage:", e.target.value);
        });
    }


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
            atualizarDadosCarrinho();
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
            atualizarDadosCarrinho();
        });
    });

    document.querySelectorAll('input[name="pesoPreferencia"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            pedido.preferenciaPeso = e.target.value;
            salvarNoLocalStorage(); // Garante que salvou a escolha
            
            if (typeof atualizarResumoFinal === "function") {
                atualizarResumoFinal();
            }
        });
    });
}

// --- UNIFICADO: EVENTOS DE BOTÕES "EU QUERO" ---
export function inicializarEventosBotoes() {
    const botoes = document.querySelectorAll(".btn-eu-quero, .btn-opcao");

    botoes.forEach(btn => {
        btn.addEventListener("click", function(e) {
            console.log("Clique detectado em:", e.target); 
            e.stopPropagation();
            const tipo = e.currentTarget.getAttribute('data-tipo');
            const valorPersonalizado = this.innerText.trim().toLowerCase();
            console.log("Tipo clicado:", tipo);
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
            // --- 3. LÓGICA PARA SELECIONAR (Seleção Única para Bolos/Modelos) ---
            if (tipo === "modelo" || tipo === "bolo" || tipo === "topo") {
                // Busca todos os botões do mesmo tipo para resetar
                const seletores = tipo === 'topo' ? '.btn-eu-quero[data-tipo="topo"]' : '.btn-eu-quero[data-tipo="modelo"], .btn-eu-quero[data-tipo="bolo"]';
                
                document.querySelectorAll(seletores).forEach(b => {
                    b.classList.remove("ativo", "selecionado");
                    b.innerText = "Eu quero";
                    b.style.backgroundColor = "";
                    b.style.color = "";
                });

                // Aplica o visual no botão clicado (e.currentTarget garante que pegamos o botão certo)
                const botaoClicado = e.currentTarget;
                botaoClicado.classList.add("ativo", "selecionado");
                botaoClicado.innerText = "✔ Selecionado";
                botaoClicado.style.backgroundColor = "#e91e63"; 
                botaoClicado.style.color = "#fff";
                
                console.log("Visual atualizado: botão ficou rosa e texto mudou.");
            }

            // --- 4. CAPTURA DE DADOS ESPECÍFICOS ---
            if (tipo === "modelo" || tipo === "bolo") {
                // Buscamos a imagem do card onde o botão foi clicado
                const card = this.closest(".bolo-card") || this.closest(".topo-item");
                const img = card?.querySelector("img");
                
                if(img) {
                    pedido.modelo = img.src;        // Mantém sua variável
                    pedido.modeloImagem = img.src;  // ACRÉSCIMO SÊNIOR: Para renderizar na sacola
                }

                const pesoSel = document.getElementById("pesoSelect")?.value;
                if (pesoSel) pedido.pesoKg = parseFloat(pesoSel);

                // Salvar imediatamente para não perder se mudar de página antes de "Avançar"
                salvarNoLocalStorage(); 
                atualizarTudo();
            }
            
            // --- LÓGICA DE DOCES (SOMA EM LOTES DE 25) ---
            else if (tipo === 'doce') {
                e.stopImmediatePropagation();
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
            salvarNoLocalStorage();
        });
    });

    // 1. Escuta o campo de peso manual
    const campoPeso = document.getElementById("pesoSelect");
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
    // --- O BOTÃO FINAL (A ÚNICA PORTA DE ENTRADA CENTRALIZADA) ---
    const btnFechar = document.getElementById('btnConfirmarPedido'); 

    if (btnFechar) {
        const novoBotao = btnFechar.cloneNode(true);
        btnFechar.parentNode.replaceChild(novoBotao, btnFechar);

        novoBotao.addEventListener('click', (event) => {
            const check = document.getElementById('checkTermos');
            const pesoSelect = document.getElementById('pesoSelect');
            const pesoValor = pesoSelect ? parseFloat(pesoSelect.value) : 0;

            // 1. VALIDAÇÃO DE PESO
            if (pesoValor <= 0) {
                alert("⚠️ Por favor, selecione o peso do bolo antes de adicionar.");
                pesoSelect?.focus();
                pesoSelect?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                return;
            }

            // 2. VALIDAÇÃO DE TERMOS (Apenas se o checkbox existir na página)
            if (check && !check.checked) {
                const seta = document.getElementById('setaVermelha');
                if (seta) seta.style.display = 'inline-block';
                
                const container = document.querySelector('.container-aceite');
                if (container) {
                    container.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    
                }
                
                alert("⚠️ Você precisa aceitar os termos de variação de peso para este bolo.");
                return; 
            }

            // 3. SUCESSO: Adiciona ao carrinho e ABRE a sacola
            console.log("✅ Termos aceitos e peso ok. Adicionando...");
            
            // Limpa avisos visuais
            const seta = document.getElementById('setaVermelha');
            if (seta) seta.style.display = 'none';
            
            adicionarBoloAoCarrinho(); // Esta função joga o bolo no array itens
            abrirDrawer(); // Abre para o cliente ver que o bolo entrou
            mostrarNotificacao("Bolo adicionado com sucesso! 🎂");
        });
    }

    // 3. EVENTO EXTRA: Esconde a seta assim que o cliente clicar no checkbox
    const check = document.getElementById('checkTermos');
    const btnConfirmar = document.getElementById('btnConfirmarPedido'); // O botão já clonado

    if (check && btnConfirmar) {
        // 1. Estado inicial
        btnConfirmar.style.opacity = check.checked ? "1" : "0.5";

        check.addEventListener('change', () => {
            // 2. Ajusta opacidade
            btnConfirmar.style.opacity = check.checked ? "1" : "0.5";
            
            // 3. Limpa alertas visuais se marcar como "Aceito"
            if (check.checked) {
                const seta = document.getElementById('setaVermelha');
                const aviso = document.getElementById('avisoBloqueio');
                const container = document.querySelector('.container-aceite');
                
                if (seta) seta.style.display = 'none';
                if (aviso) aviso.style.display = 'none';
                if (container) container.style.border = "none";
            }
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

    // --- ACRÉSCIMO SÊNIOR: Escuta em tempo real dos campos de texto do topo ---
    const camposTextoTopo = ['topo-nome', 'topo-idade', 'topo-obs'];
    camposTextoTopo.forEach(id => {
        const elemento = document.getElementById(id);
        if (elemento) {
            elemento.addEventListener('input', () => {
                // Enquanto o usuário digita, já vamos salvando no rascunho
                salvarDadosTopoNoPedido(); 
                
                // Se existir o campo de resumo na página de personalização, atualiza o texto lá
                const resumo = document.getElementById('detalhes-topo-personalizado');
                if (resumo) {
                   resumo.innerHTML = `
                        <strong>Topo para:</strong> ${pedido.nomeTopo || '...'} (${pedido.idadeTopo || '0'} anos)<br>
                        ${pedido.obsTopo ? `<small><strong>Obs:</strong> ${pedido.obsTopo}</small>` : ''}
                    `;
                    resumo.style.display = (pedido.nomeTopo || pedido.idadeTopo || pedido.obsTopo) ? 'block' : 'none';
                }
            });
        }
    });

    // Localize o botão de produtos pelo ID ou pela classe
    const botoesDropdown = document.querySelectorAll('.dropbtn');

    botoesDropdown.forEach(btn => {
        btn.onclick = function(e) {
            if (window.innerWidth <= 768) {
                e.preventDefault();
                e.stopPropagation(); // Impede o fechamento imediato pelo clique na window

                const pai = this.closest('.dropdown');
                const menu = pai.querySelector('.dropdown-content');

                if (menu) {
                    // Fecha outros menus abertos antes de abrir este
                    document.querySelectorAll('.dropdown-content').forEach(m => {
                        if (m !== menu) m.classList.remove('show');
                    });

                    menu.classList.toggle('show');
                    console.log("Menu alternado com sucesso!");
                }
            }
        };
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
   

    // 2. Ícone da Sacola - MANTIDO
    
    if (btnCarrinhoIcone) {
        btnCarrinhoIcone.onclick = function(e) {
            e.preventDefault();
            console.log("Ícone da sacola clicado");
            abrirDrawer(); // Chama a função que agora é "livre"
        };
    }


    const btnPix = document.getElementById("btnMetodoPix");
    const btnCartao = document.getElementById("btnMetodoCartao");
    const btnPagar50 = document.getElementById("btnPagar50");
    const btnPagar100 = document.getElementById("btnPagar100");

    // --- 1. Listeners de Porcentagem ---
    if (btnPagar50) {
        btnPagar50.addEventListener("click", () => selecionarPorcentagem(0.5));
    }
    if (btnPagar100) {
        btnPagar100.addEventListener("click", () => selecionarPorcentagem(1.0));
    }

    // --- 2. Listeners de Métodos (AGORA VAI FUNCIONAR) ---
    if (btnPix) {
        btnPix.addEventListener("click", () => escolherMetodo('pix'));
    }
    if (btnCartao) {
        btnCartao.addEventListener("click", () => escolherMetodo('credit_card'));
    }

    // --- 3. NAVEGAÇÃO AVANÇAR (VERSÃO AJUSTADA PARA NÃO DUPLICAR) ---
    if (btnAvancar) {
        const novoBtnAvancar = btnAvancar.cloneNode(true);
        btnAvancar.parentNode.replaceChild(novoBtnAvancar, btnAvancar);

        novoBtnAvancar.addEventListener("click", (e) => {
            // --- MANTER REGRA EXISTENTE: Proteção de Clique ---
            if (processandoClique) return; 
            processandoClique = true;
            novoBtnAvancar.style.pointerEvents = 'none'; 

            console.log("DEBUG: Clique ÚNICO real. Etapa:", etapaAtual);

            // --- ACRÉSCIMO SÊNIOR: Automação da Etapa 0 (Carrinho) ---
            // Se o usuário está na tela inicial e existe um bolo configurado mas não adicionado
            if (etapaAtual === 0 && pedido.pesoKg > 0) {
                console.log("Sênior Log: Rascunho detectado. Salvando automaticamente...");
                adicionarBoloAoCarrinho(); // Esta função deve limpar o rascunho e dar push no itens
            }

            // --- MANTER REGRA EXISTENTE: ETAPA 1 (Identificação) ---
            if (etapaAtual === 1) {
                const nome = document.getElementById("nomeCliente")?.value.trim();
                const tel = document.getElementById("telefoneCliente")?.value.trim();
                const email = document.getElementById("emailCliente")?.value.trim();
                const data = document.getElementById("dataPedido")?.value;
                const horario = document.getElementById("horarioPedido")?.value;
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

                if (!nome || nome.length < 3) { processandoClique = false; novoBtnAvancar.style.pointerEvents = 'auto'; return alert("⚠️ Digite seu nome."); }
                if (!tel || tel.length < 10) { processandoClique = false; novoBtnAvancar.style.pointerEvents = 'auto'; return alert("⚠️ Por favor, digite um telefone válido."); }
                if (!email || !emailRegex.test(email)) { processandoClique = false; novoBtnAvancar.style.pointerEvents = 'auto'; return alert("⚠️ Por favor, digite um e-mail válido."); }
                if (!data) { processandoClique = false; novoBtnAvancar.style.pointerEvents = 'auto'; return alert("⚠️ Por favor, selecione a data."); }
                if (!horario) { processandoClique = false; novoBtnAvancar.style.pointerEvents = 'auto'; return alert("⚠️ Por favor, selecione o horário."); }

                pedido.cliente = { nome, telefone: tel, email, data, horario };
                localStorage.setItem('carrinho_dayane', JSON.stringify(pedido)); // <--- ADICIONE ISSO
                console.log("Sênior Log: Dados salvos e persistidos.");
            }
            // --- MANTER REGRA EXISTENTE: ETAPA 2 (Pagamento) ---
            if (etapaAtual === 2) {
                const metodoReal = window.metodoSelecionado || metodoSelecionado;
                if (!metodoReal) {
                    processandoClique = false; 
                    novoBtnAvancar.style.pointerEvents = 'auto';
                    return alert("⚠️ Por favor, selecione uma forma de pagamento.");
                }

                // SÊNIOR: Captura a porcentagem da global ANTES de salvar o objeto final
                const porcFinal = window.porcentagemPagamento || 1;

                pedido.pagamento = {
                    metodo: metodoReal,
                    pixPendente: (metodoReal === 'pix'),
                    porcentagem: porcFinal // AGORA O VALOR VAI PARA O STORAGE CORRETAMENTE
                };
                
                // Sincroniza o valor pago no objeto para o resumo ler certo
                pedido.valorPago = (pedido.valorTotal || 0) * porcFinal;

                localStorage.setItem('carrinho_dayane', JSON.stringify(pedido));
            }

            // --- MANTER REGRA EXISTENTE: MUDANÇA DE TELA ---
            if (etapaAtual < etapas.length - 1) {
                const proxima = etapaAtual + 1;
                
                if (proxima === 3) {
                    atualizarResumoFinal();
                    const containerMP = document.getElementById('container-pagamento-mp');
                    if (containerMP) containerMP.style.display = 'block';
                }

                mostrarEtapa(proxima);
                
                setTimeout(() => {
                    processandoClique = false; // IMPORTANTE: Resetar a flag para o próximo clique
                    novoBtnAvancar.style.pointerEvents = 'auto'; 
                }, 500);
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
            if (!pedido.cliente) pedido.cliente = {}; // Cria se não existir
            pedido.cliente.email = e.target.value.trim();
        };
    }
}

export function configurarDropdown(botaoId, menuId) {
   const btnProdutos = document.querySelector('.dropbtn');

if (btnProdutos) {
    // Removemos qualquer ouvinte antigo para evitar duplicados
    btnProdutos.replaceWith(btnProdutos.cloneNode(true));
        const novoBtn = document.querySelector('.dropbtn');

        novoBtn.addEventListener('click', function(e) {
            if (window.innerWidth <= 768) {
                e.preventDefault();
                e.stopPropagation();

                // Sênior: Buscamos o menu que está DENTRO do mesmo pai do botão clicado
                const menuApropriado = this.parentElement.querySelector('.dropdown-content');
                
                if (menuApropriado) {
                    menuApropriado.classList.toggle('show');
                    console.log("Classe 'show' aplicada ao menu:", menuApropriado);
                    console.log("Total de menus abertos:", document.querySelectorAll('.dropdown-content.show').length);
                } else {
                    console.error("ERRO: O botão foi clicado, mas não encontrei o .dropdown-content ao lado dele!");
                }
            }
        });
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

// ui-updates.js

// Função para exibir o aviso de cookies ao entrar
export function inicializarCookies() {
    const caixa = document.getElementById('caixa-cookies');
    const btnAceitar = document.getElementById('btn-aceitar-cookies');
    const btnFechar = document.getElementById('fechar-cookies');

    // Verifica se o usuário já aceitou antes (para não incomodar sempre)
    if (!localStorage.getItem('cookies_aceitos')) {
        if (caixa) caixa.style.display = 'block';
    }

    if (btnAceitar) {
        btnAceitar.onclick = () => {
            localStorage.setItem('cookies_aceitos', 'true');
            if (caixa) caixa.style.display = 'none';
        };
    }

    if (btnFechar) {
        btnFechar.onclick = () => {
            if (caixa) caixa.style.display = 'none';
        };
    }
}
// Esta função lê os campos da tela e salva no objeto global
export function salvarDadosTopoNoPedido() {
    pedido.nomeTopo = document.getElementById('topo-nome')?.value || "";
    pedido.idadeTopo = document.getElementById('topo-idade')?.value || "";
    pedido.obsTopo = document.getElementById('topo-obs')?.value || "";
}


// Acrescente este bloco no final do seu events.js
export function inicializarEventosInputTopo() {
    const campos = ['nomeTopo', 'idadeTopo', 'obsTopo'];
    
    campos.forEach(id => {
        const elemento = document.getElementById(id);
        if (elemento) {
            elemento.addEventListener('input', (e) => {
                pedido[id] = e.target.value; // Salva direto no objeto pedido
                salvarNoLocalStorage(); // Garante que não suma ao mudar de página
                atualizarDadosCarrinho(); // Atualiza a descrição no carrinho em tempo real
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


// Expomos para o HTML (caso seu botão use onclick="clicarBotaoAdicionarDoce(...)")
window.clicarBotaoAdicionarDoce = function(nome, quantidade, precoUnitario) {
    const qtd = parseInt(quantidade);
    
    // Validação de segurança: Doces geralmente têm mínimo de 25
    if (isNaN(qtd) || qtd < 25) {
        alert("A quantidade mínima é de 25 unidades por sabor.");
        return;
    }

    const novoDoce = {
        nome: nome,
        quantidade: qtd,
        valor: parseFloat(qtd * precoUnitario)
    };
    
    adicionarDoceAoPedido(novoDoce);
    
    // Opcional: Feedback visual de que foi adicionado
    console.log(`Sucesso: ${qtd}x ${nome} adicionados ao pedido.`);
};