export function gerarMensagemWhatsCompleta(pedido) {
  // 1. BLINDAGEM DE DADOS (Se p.pagamento não existir, usamos um objeto vazio {})
  const p = pedido;
  const c = p.cliente || {};
  const pag = p.pagamento || { valorPago: 0 }; // Evita o erro de 'undefined'
  const temBolo = p.massa && p.massa !== "Não informada" && p.pesoKg > 0;
  // 2. CÁLCULO SEGURO
  const valorTotal = p.valorTotal || 0;
  const porc = p.pagamento?.porcentagem || 1.0;
  const valorPago = valorTotal * porc;
  const restante = valorTotal - valorPago;

  // 3. MONTAGEM DA MENSAGEM
  let msg = `🌟 *PEDIDO CONFIRMADO* 🌟\n`;
  msg += `Olá, Dayane! O pagamento foi processado.\n\n`;

  msg += ` 👤 *DADOS DO CLIENTE*\n`;
  msg += `• CLIENTE: ${c.nome || "Não informado"}\n`;
  msg += `• WHATSAPP: ${c.telefone || "Não informado"}\n\n`;

  if (p.itens && p.itens.length > 0) {
        msg += `🎂 *DETALHES DOS BOLOS*\n`;
        p.itens.forEach((item, index) => {
            msg += `*Bolo ${index + 1}: ${item.titulo}*\n`;
            msg += `• Modelo: ${item.modelo || "Padrão"}\n`;
            msg += `• Formato: ${item.formato || "Não informado"}\n`;
            msg += `• Peso: ${item.pesoKg || 0}kg\n`;
            msg += `• Massa: ${item.massa || "Não informada"}\n`;
            msg += `• Recheios: ${(item.recheios || []).join(" e ")}\n`;
            msg += `• Complemento: ${item.complemento || "Nenhum"}\n\n`;
        
            if (item.modeloImagem) {
                msg += `• Link da Foto: ${item.modeloImagem}\n`;
            }
            msg += `\n`;
        });
  }

  if (p.doces && p.doces.length > 0) {
    msg += `🍬 *DETALHES DO DOCE*\n`;
    const textoDoces = p.doces.length > 0 
        ? p.doces.map(d => `${d.qtd}x ${d.nome}`).join(", ") 
        : "Nenhum doce selecionado";
    msg += `• DOCES: ${p.doces.map(d => (d.qtd || d.quantidade || 0) + 'x ' + (d.nome || 'Doce')).join(', ')}\n`;
    msg += `• COR FORMINHAS: ${p.corForminhas || "Padrão"}\n\n`;
  }

  if (p.topo) {
    msg += `🚩 *TOPO PERSONALIZADO:*\n`;
    msg += `• Nome: ${p.nomeTopo || ""} | Idade: ${p.idadeTopo || ""}\n`;
    msg += `• Obs Topo: ${p.obsTopo || "Nenhuma"}\n\n`;
  }

  msg += `📅 *RETIRADA:*\n`;
  msg += `• DATA: ${p.cliente.data}\n`;
  msg += `• HORÁRIO: ${p.cliente.horario}\n`;
  msg += `• TIPO: ${c.entrega || "Retirada"}\n`;
  msg += `• OBS GERAL: ${p.observacao || "Nenhuma"}\n\n`;

  msg += `💰 *RESUMO FINANCEIRO:*\n`;
  msg += `• Valor Total: R$ ${valorTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}\n`;
  msg += `• Sinal Pago: R$ ${valorPago.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}\n`;

  if (restante > 0) {
    msg += `• *FALTA PAGAR NA ENTREGA: R$ ${restante.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}*\n`;
  } else {
    msg += `• *STATUS: PEDIDO 100% PAGO* ✅\n\n`;
  }

  msg += `*Pedido confirmado e enviado para produção!* 💗`;

  return encodeURIComponent(msg);
}

window.gerarMensagemWhatsCompleta = gerarMensagemWhatsCompleta;
// whatsapp.js

export function abrirWhatsApp(telefone, mensagem) {
  // Remove tudo que não for número
  let numeroLimpo = telefone.replace(/\D/g, "");

  // Se o número não começar com 55 e tiver 10 ou 11 dígitos (DDD + Número)
  // nós adicionamos o 55 do Brasil automaticamente
  if (numeroLimpo.length <= 11 && !numeroLimpo.startsWith("55")) {
    numeroLimpo = "55" + numeroLimpo;
  }

  const url = `https://wa.me/${numeroLimpo}?text=${mensagem}`;
  window.open(url, "_blank");
}
