function gerarMensagemWhatsCompleta(cliente, pedido, total, sinal) {
  return `
Olá, Dayane! 😊

Gostaria de confirmar meu pedido:

👤 Cliente:
Nome: ${cliente.nome}
WhatsApp: ${cliente.whatsapp}

🎂 Pedido:
Tamanho: ${pedido.tamanho}
Massa: ${pedido.massa}
Recheios: ${pedido.recheios.join(', ')}
Complementos: ${pedido.complementos.join(', ') || 'Nenhum'}
Escrita no topo: ${pedido.escritaTopo ? 'Sim' : 'Não'}
Retirada: ${document.getElementById("dataEntrega").value} após 17h

💰 Valores:
Valor total: R$ ${total}
Sinal (50%): R$ ${sinal}

Forma de pagamento:
PIX (50% obrigatório para confirmar o pedido)

Estou ciente de que:
✔️ Pedido é feito sob encomenda
✔️ Não há cancelamento ou reembolso

Aguardo confirmação. Obrigada! 💕
`;
}


function abrirWhatsApp(telefone, mensagem) {
  const numero = telefone.replace(/\D/g, '');
  const texto = encodeURIComponent(mensagem);
  const url = `https://wa.me/55${numero}?text=${texto}`;

  window.open(url, '_blank');
}

