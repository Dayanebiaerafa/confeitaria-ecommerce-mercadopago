
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
    msg += `• Valor Total: R$ ${valorTotal.toFixed(2).replace('.', ',')}\n`;
    msg += `• Sinal Pago: R$ ${valorPago.toFixed(2).replace('.', ',')}\n`;
    
    if (restante > 0) {
        msg += `• *FALTA PAGAR NA ENTREGA: R$ ${restante.toFixed(2).replace('.', ',')}*\n\n`;
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
  let numeroLimpo = telefone.replace(/\D/g, '');

  // Se o número não começar com 55 e tiver 10 ou 11 dígitos (DDD + Número)
  // nós adicionamos o 55 do Brasil automaticamente
  if (numeroLimpo.length <= 11 && !numeroLimpo.startsWith('55')) {
    numeroLimpo = '55' + numeroLimpo;
  }

  const url = `https://wa.me/${numeroLimpo}?text=${mensagem}`;
  window.open(url, '_blank');
}

