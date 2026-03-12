
export function gerarMensagemWhatsCompleta(pedido) {
    const p = pedido;
    const c = p.cliente;
    const restante = p.valorTotal - p.pagamento.valorPago;

    let msg = `Olá, Dayane! 😊 
    Gostaria de confirmar meu pedido: *Pagamento Confirmado!*\n\n`;
    msg += `👤 *CLIENTE:* ${c.nome}\n`;
    msg += `📞 *WHATSAPP:* ${c.telefone}\n\n`;
    
    msg += `🎂 *DETALHES DO BOLO:*\n`;
    msg += `• Modelo/Tema: ${p.modelo || 'Padrão da página'}\n`; // ADICIONADO
    msg += `• Formato: ${p.formato}\n`;
    msg += `• Peso: ${p.pesoKg}kg (${p.preferenciaPeso || 'Preferência não informada'})\n`; // ADICIONADO
    msg += `• Massa: ${p.massa}\n`;
    msg += `• Recheios: ${p.recheios.join(' e ')}\n`;
    msg += `• Complemento: ${p.complemento || 'Nenhum'}\n\n`;

    if (p.doces.length > 0) {
        msg += `🍬 *DOCES:* ${p.doces.map(d => d.quantidade + 'x ' + d.nome).join(', ')}\n`;
        msg += `🎨 *COR FORMINHAS:* ${p.corForminhas}\n\n`;
    }

    if (p.topo) {
        msg += `🚩 *TOPO PERSONALIZADO:*\n`;
        msg += `• Nome: ${p.nomeTopo} | Idade: ${p.idadeTopo}\n`;
        msg += `• Obs Topo: ${p.obsTopo}\n\n`;
    }

    msg += `📅 *ENTREGA/RETIRADA:* ${c.data} às ${c.horario}\n`;
    msg += `📍 *TIPO:* ${c.entrega}\n`;
    msg += `💬 *OBS GERAL:* ${p.observacao || 'Nenhuma'}\n\n`;

    msg += `💰 *FINANCEIRO:*\n`;
    msg += `• Valor Total: R$ ${p.valorTotal.toFixed(2)}\n`;
    msg += `• Sinal Pago: R$ ${p.pagamento.valorPago.toFixed(2)}\n`;
    msg += `• *RESTANTE NA RETIRADA: R$ ${restante.toFixed(2)}*\n\n`; // DESTAQUE
    
    msg += `*Pedido confirmado e enviado para produção!* 💗`;

    return encodeURIComponent(msg);
}


export function abrirWhatsApp(telefone, mensagem) {
  const numero = telefone.replace(/\D/g, '');
  const texto = encodeURIComponent(mensagem);
  const url = `https://wa.me/55${numero}?text=${texto}`;

  window.open(url, '_blank');
}

