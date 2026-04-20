
import { CONFIG } from '/static/js/config.js';

window.perguntarIA = perguntarIA;
window.responder = responder;
window.abrirWhatsAssistente = abrirWhatsAssistente;
window.verCardapio = verCardapio;
window.baixarRegras = baixarRegras;

document.addEventListener("DOMContentLoaded", function() {
    const btn = document.getElementById("assistant-button");
    const box = document.getElementById("assistant-box");
    const closeBtn = document.getElementById("close-assistant");

    
    if (btn && box) {
        btn.onclick = () => {
            box.classList.toggle("hidden");
        };
    }

    if (closeBtn && box) {
        closeBtn.onclick = () => {
            box.classList.add("hidden");
        };
    }
}); 



export function responder(tipo) {
    const responseDiv = document.getElementById("assistant-response");
    let resposta = "";

    switch (tipo) {
        case "prazo":
            resposta = " Conferir disponibilidade pelo whatsapp e valor conforme sua localização. ";
            break;
        case "pagamento":
            resposta = "Para confirmar o pedido é necessário o pagamento mínimo de 50% via PIX ou Cartão. O restante pode ser pago na retirada.";
            break;
        case "sabores":
            resposta = "Você pode escolher 1 massa, 2 recheios e até 2 complementos. Alguns sabores possuem acréscimo.";
            break;
        case "cancelamento":
            resposta = "Pedidos são feitos sob encomenda. Não realizamos cancelamento ou reembolso após a confirmação.";
            break;
    }

    if (responseDiv) {
        responseDiv.innerHTML = `<p style="padding:10px; background:#f9f9f9; border-radius:5px; margin-top:10px;">${resposta}</p>`;
    }
}

export function abrirWhatsAssistente() {
    const numero = "5534996360443";
    const texto = encodeURIComponent("Olá! Estou no site com uma dúvida sobre os bolos 🍰");
    window.open(`https://wa.me/${numero}?text=${texto}`, "_blank");
}

export function perguntarIA() {
    const perguntaInput = document.getElementById("perguntaIA");
    const responseDiv = document.getElementById("assistant-response");
    
    if (!perguntaInput.value) return;

    responseDiv.innerHTML = "<p style='color: #783606;'> ✨ Dayane IA está pensando...</p>";

   
    fetch(CONFIG.URL_PLANILHA, {
        method: "POST",
        mode: "cors", 
        headers: {
            "Content-Type": "text/plain;charset=utf-8", 
        },
        body: JSON.stringify({
            tipo: "ia",
            pergunta: perguntaInput.value
        })
    })
    .then(res => {
        if (!res.ok) throw new Error("Erro na resposta do servidor");
        return res.json();
    })
    .then(data => {
        if (data.resposta) {
            responseDiv.innerHTML = `
                <div style="background: #fff5f7; padding: 12px; border-radius: 8px; border: 1px solid #fad5dc; margin-top: 10px;">
                    <strong style="color: #783606;">🍰 Assistente Dayane:</strong>
                    <p style="margin-top: 5px; color: #333;">${data.resposta}</p>
                </div>`;
            perguntaInput.value = ""; 
            document.getElementById("perguntaIA").value = "";document.getElementById("perguntaIA").value = "";
        }
    })
    .catch(err => {
        console.error("Erro detalhado:", err);
        responseDiv.innerHTML = "<p>Dúvida enviada! Se preferir, chame no WhatsApp acima. 😊</p>";
    });
}


export function verCardapio() {
    window.open('/static/assets/assistente/cardapio-sugestoes.jpeg', '_blank');
    
    const responseDiv = document.getElementById("assistant-response");
    responseDiv.innerHTML = `<p style="padding:10px; background:#fff5f7; border-radius:5px; margin-top:10px;">Aqui estão nossas sugestões deliciosas! 🍰</p>`;
}

export function baixarRegras() {
    const link = document.createElement('a');
    link.href = '/static/assets/assistente/regras-confeitaria.pdf';
    link.target = '_blank';
    link.download = 'Regras_Dayane_Teodoro_Confeitaria.pdf'; 
    link.click();
}


document.addEventListener("DOMContentLoaded", function() {
    const inputIA = document.getElementById("perguntaIA");

    if (inputIA) {
        inputIA.addEventListener("keyup", function(event) {
            if (event.key === "Enter") {
                event.preventDefault(); 
                perguntarIA(); 
            }
        });
    }
});