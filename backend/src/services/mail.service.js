import nodemailer from "nodemailer";

/**
 * Espelho ESM de services/mail.service.cjs. Mantido em paridade com o .cjs.
 * O arquivo de produção é mail.service.cjs (usado pelo iisentry.cjs).
 * Este aqui atende o entry point de dev (server.js) que importa rotas ESM.
 */

let transporter;
function getTransporter() {
  if (!transporter && process.env.SMTP_HOST && process.env.SMTP_USER) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: process.env.SMTP_SECURE === "true",
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  }
  return transporter;
}

function render({ title, greeting, body }) {
  const portalUrl = process.env.FRONTEND_URL || "#";
  return `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
      <div style="background-color:#9b0f14;padding:20px;color:white;text-align:center;"><h2 style="margin:0;">CBMAM ITSM</h2></div>
      <div style="padding:24px;color:#374151;">
        <p>${greeting}</p>
        <h3 style="margin:8px 0 16px;color:#101828;">${title}</h3>
        ${body}
        <p style="margin-top:24px;">Você pode visualizar os detalhes acessando o portal do ITSM.</p>
        <div style="text-align:center;margin-top:30px;">
          <a href="${portalUrl}" style="background-color:#9b0f14;color:white;padding:12px 24px;text-decoration:none;border-radius:8px;font-weight:bold;">Acessar Portal</a>
        </div>
      </div>
      <div style="background-color:#f3f4f6;padding:12px;text-align:center;font-size:12px;color:#6b7280;">
        Este é um e-mail automático, por favor não responda.
      </div>
    </div>`;
}

async function send(to, subject, html) {
  if (!to) { console.warn(`mail.service: destinatário vazio, subject=${subject}`); return; }
  const tx = getTransporter();
  if (!tx) { console.warn(`mail.service: SMTP não configurado, ignorando (${subject})`); return; }
  try {
    await tx.sendMail({
      from: `"CBMAM ITSM" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
      to,
      subject,
      html,
    });
  } catch (e) {
    console.error(`mail.service: erro ao enviar "${subject}" para ${to}:`, e.message);
  }
}

export async function sendTicketClosedEmail(requesterEmail, requesterName, protocol, subject) {
  await send(requesterEmail, `Chamado Encerrado: ${protocol}`, render({
    title: `Chamado ${protocol} foi encerrado`,
    greeting: `Olá, <strong>${requesterName || 'militar'}</strong>,`,
    body: `
      <p>Informamos que o seu chamado foi <strong>encerrado</strong> pela equipe BM-6.</p>
      <div style="background-color:#f9fafb;padding:16px;border-radius:8px;margin:20px 0;">
        <p style="margin:0;color:#667085;font-size:13px;">Assunto:</p>
        <p style="margin:5px 0 0 0;font-weight:bold;">${subject}</p>
      </div>`,
  }));
}

export async function sendTicketStatusChangedEmail(requesterEmail, requesterName, protocol, subject, oldStatus, newStatus) {
  const labels = {
    ABERTO: 'Aberto',
    EM_ATENDIMENTO: 'Em atendimento',
    AGUARDANDO_USUARIO: 'Aguardando sua resposta',
    RESOLVIDO: 'Resolvido',
    FECHADO: 'Encerrado',
    CANCELADO: 'Cancelado',
  };
  await send(requesterEmail, `Chamado ${protocol}: ${labels[newStatus] || newStatus}`, render({
    title: `Chamado ${protocol}: status atualizado`,
    greeting: `Olá, <strong>${requesterName || 'militar'}</strong>,`,
    body: `
      <p>Seu chamado teve o status alterado pela equipe BM-6.</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;">
        <tr><td style="padding:8px;border:1px solid #e5e7eb;background:#f9fafb;"><strong>Protocolo</strong></td><td style="padding:8px;border:1px solid #e5e7eb;">${protocol}</td></tr>
        <tr><td style="padding:8px;border:1px solid #e5e7eb;background:#f9fafb;"><strong>Assunto</strong></td><td style="padding:8px;border:1px solid #e5e7eb;">${subject}</td></tr>
        <tr><td style="padding:8px;border:1px solid #e5e7eb;background:#f9fafb;"><strong>De</strong></td><td style="padding:8px;border:1px solid #e5e7eb;">${labels[oldStatus] || oldStatus}</td></tr>
        <tr><td style="padding:8px;border:1px solid #e5e7eb;background:#f9fafb;"><strong>Para</strong></td><td style="padding:8px;border:1px solid #e5e7eb;"><strong>${labels[newStatus] || newStatus}</strong></td></tr>
      </table>
      ${newStatus === 'AGUARDANDO_USUARIO' ? '<p><strong>Atenção:</strong> precisamos de uma resposta sua para prosseguir.</p>' : ''}`,
  }));
}

export async function sendTicketAssignedEmail(analystEmail, analystName, protocol, subject, requesterName) {
  await send(analystEmail, `Chamado atribuído: ${protocol}`, render({
    title: `Novo chamado atribuído a você (${protocol})`,
    greeting: `Olá, <strong>${analystName || 'analista'}</strong>,`,
    body: `
      <p>Você recebeu a atribuição de um chamado.</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;">
        <tr><td style="padding:8px;border:1px solid #e5e7eb;background:#f9fafb;"><strong>Protocolo</strong></td><td style="padding:8px;border:1px solid #e5e7eb;">${protocol}</td></tr>
        <tr><td style="padding:8px;border:1px solid #e5e7eb;background:#f9fafb;"><strong>Assunto</strong></td><td style="padding:8px;border:1px solid #e5e7eb;">${subject}</td></tr>
        <tr><td style="padding:8px;border:1px solid #e5e7eb;background:#f9fafb;"><strong>Solicitante</strong></td><td style="padding:8px;border:1px solid #e5e7eb;">${requesterName || '—'}</td></tr>
      </table>`,
  }));
}

export async function sendNewTicketToQueueEmail(analystEmail, analystName, protocol, subject, requesterName) {
  await send(analystEmail, `Novo chamado na fila: ${protocol}`, render({
    title: `Novo chamado na fila (${protocol})`,
    greeting: `Olá, <strong>${analystName || 'analista'}</strong>,`,
    body: `
      <p>Um novo chamado entrou na fila BM-6.</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;">
        <tr><td style="padding:8px;border:1px solid #e5e7eb;background:#f9fafb;"><strong>Protocolo</strong></td><td style="padding:8px;border:1px solid #e5e7eb;">${protocol}</td></tr>
        <tr><td style="padding:8px;border:1px solid #e5e7eb;background:#f9fafb;"><strong>Assunto</strong></td><td style="padding:8px;border:1px solid #e5e7eb;">${subject}</td></tr>
        <tr><td style="padding:8px;border:1px solid #e5e7eb;background:#f9fafb;"><strong>Solicitante</strong></td><td style="padding:8px;border:1px solid #e5e7eb;">${requesterName || '—'}</td></tr>
      </table>`,
  }));
}

export async function sendNewCommentEmail(to, fromName, protocol, subject, body) {
  await send(to, `Comentário em ${protocol} — ${subject || ''}`.slice(0, 250), render({
    title: `Novo comentário no chamado ${protocol}`,
    greeting: 'Olá,',
    body: `
      <p><strong>${fromName || 'Alguém'}</strong> registrou um comentário.</p>
      <div style="background-color:#f9fafb;padding:16px;border-radius:8px;margin:16px 0;border-left:4px solid #9b0f14;">
        <p style="margin:0;color:#374151;white-space:pre-wrap;">${body.replace(/</g,'&lt;')}</p>
      </div>`,
  }));
}

export async function sendNewChatMessageEmail(to, fromName, protocol, message) {
  await send(to, `Nova mensagem no chat: ${protocol}`, render({
    title: `Nova mensagem no chat do chamado ${protocol}`,
    greeting: 'Olá,',
    body: `
      <p><strong>${fromName || 'Alguém'}</strong> enviou uma mensagem no chat.</p>
      <div style="background-color:#f9fafb;padding:16px;border-radius:8px;margin:16px 0;border-left:4px solid #9b0f14;">
        <p style="margin:0;color:#374151;white-space:pre-wrap;">${message.replace(/</g,'&lt;')}</p>
      </div>`,
  }));
}
