const btn = document.getElementById("assistant-button");
const box = document.getElementById("assistant-box");
const closeBtn = document.getElementById("close-assistant");
const responseDiv = document.getElementById("assistant-response");

btn.onclick = () => {
  box.classList.toggle("hidden");
};

closeBtn.onclick = () => {
  box.classList.add("hidden");
};

function responder(tipo) {
  let resposta = "";

  switch (tipo) {
    case "prazo":
      resposta =
        "Os pedidos são feitos sob encomenda. Pedidos feitos hoje são retirados no próximo dia útil após as 16h.";
      break;

    case "pagamento":
      resposta =
        "Para confirmar o pedido é necessário o pagamento mínimo de 50% via PIX ou Cartão. O restante pode ser pago na retirada.";
      break;

    case "sabores":
      resposta =
        "Você pode escolher 1 massa, 2 recheios e até 2 complementos. Alguns sabores possuem acréscimo.";
      break;

    case "cancelamento":
      resposta =
        "Pedidos são feitos sob encomenda. Não realizamos cancelamento ou reembolso após a confirmação.";
      break;
  }

  responseDiv.innerHTML = `<p>${resposta}</p>`;
}

function abrirWhatsAssistente() {
  const numero = "5534996360443"; // ex: 5534999999999
  const texto = encodeURIComponent(
    "Olá! Estou com uma dúvida sobre os bolos 🍰"
  );
  window.open(`https://wa.me/${numero}?text=${texto}`, "_blank");
}

function perguntarIA() {
  const pergunta = document.getElementById("perguntaIA").value;
  if (!pergunta) return;

  responseDiv.innerHTML = "<p>Digitando...</p>";

  fetch("SUA_URL_DO_APPS_SCRIPT_AQUI", {
    method: "POST",
    mode: "no-cors",
    body: JSON.stringify({
      tipo: "ia",
      pergunta: pergunta,
    }),
  }).then(() => {
    responseDiv.innerHTML =
      "<p>Se preferir, clique em <strong>Falar no WhatsApp</strong> 😊</p>";
  });
}
