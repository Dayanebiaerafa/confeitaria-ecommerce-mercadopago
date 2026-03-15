
export function gerarMensagemWhatsCompleta(pedido) {
    // 1. BLINDAGEM DE DADOS (Se p.pagamento não existir, usamos um objeto vazio {})
    const p = pedido;
    const c = p.cliente || {};
    const pag = p.pagamento || { valorPago: 0 }; // Evita o erro de 'undefined'
    const temBolo = p.massa && p.massa !== "Não informada" && p.pesoKg > 0;
    // 2. CÁLCULO SEGURO
    const valorTotal = p.valorTotal || p.subtotal || 0;
    const valorPago = pag.valorPago || 0;
    const restante = valorTotal - valorPago;

    // 3. MONTAGEM DA MENSAGEM
    let msg = `Olá, Dayane! 😊 
    Gostaria de confirmar meu pedido: *Pagamento Confirmado!*\n\n`;
    
    msg += `👤 *CLIENTE:* ${c.nome || 'Não informado'}\n`;
    msg += `📞 *WHATSAPP:* ${c.telefone || 'Não informado'}\n\n`;
    
    if (temBolo) {
        msg += `🎂 *DETALHES DO BOLO:*\n`;
        msg += `• Modelo/Tema: ${p.modelo || 'Padrão da página'}\n`;
        msg += `• Formato: ${p.formato || 'Não informado'}\n`;
        msg += `• Peso: ${p.pesoKg || 0}kg (${p.preferenciaPeso || 'Pode variar'})\n`;
        msg += `• Massa: ${p.massa || 'Não informada'}\n`;
        msg += `• Recheios: ${(p.recheios || []).join(' e ') || 'Tradicional'}\n`;
        msg += `• Complemento: ${p.complemento || 'Nenhum'}\n\n`;
    }

    if (p.doces && p.doces.length > 0) {
        msg += `🍬 *DOCES:* ${p.doces.map(d => (d.quantidade || 0) + 'x ' + (d.nome || 'Doce')).join(', ')}\n`;
        msg += `🎨 *COR FORMINHAS:* ${p.corForminhas || 'Padrão'}\n\n`;
    }

    if (p.topo) {
        msg += `🚩 *TOPO PERSONALIZADO:*\n`;
        msg += `• Nome: ${p.nomeTopo || ''} | Idade: ${p.idadeTopo || ''}\n`;
        msg += `• Obs Topo: ${p.obsTopo || 'Nenhuma'}\n\n`;
    }

    msg += `📅 *ENTREGA/RETIRADA:* ${c.data || ''} às ${c.horario || ''}\n`;
    msg += `📍 *TIPO:* ${c.entrega || 'Retirada'}\n`;
    msg += `💬 *OBS GERAL:* ${p.observacao || 'Nenhuma'}\n\n`;

    msg += `💰 *FINANCEIRO:*\n`;
    msg += `• Valor Total: R$ ${valorTotal.toFixed(2)}\n`;
    msg += `• Sinal Pago: R$ ${valorPago.toFixed(2)}\n`;
    msg += `• *RESTANTE NA RETIRADA: R$ ${restante.toFixed(2)}*\n\n`;
    
    msg += `*Pedido confirmado e enviado para produção!* 💗`;

    return encodeURIComponent(msg);
}


// whatsapp.js

export function abrirWhatsApp(telefone, mensagem) {
  const numero = telefone.replace(/\D/g, '');
  // REMOVIDO: const texto = encodeURIComponent(mensagem); 
  // Sênior: A mensagem já vem codificada de 'gerarMensagemWhatsCompleta'
  const url = `https://wa.me/55${numero}?text=${mensagem}`;

  window.open(url, '_blank');
}

