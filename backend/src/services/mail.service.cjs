// mail.service.cjs — envio de e-mails do ITSM
//
// Espelho CommonJS de services/mail.service.js (ESM) usado pelo iisentry.cjs.
// Funções disparam em transições relevantes do chamado. Falhas SMTP são
// logadas e NUNCA quebram a operação principal.

'use strict';

let nodemailer = null;
try { nodemailer = require('nodemailer'); } catch(e) {
  process.stderr.write('Aviso: nodemailer não instalado. E-mails desativados.\n');
}

function transporter() {
  if (!nodemailer || !process.env.SMTP_HOST || !process.env.SMTP_USER) return null;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

function render({ title, greeting, body, footer }) {
  const portalUrl = process.env.FRONTEND_URL || '#';
  return `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
      <div style="background-color:#9b0f14;padding:20px;color:white;text-align:center;"><h2 style="margin:0;">CBMAM ITSM</h2></div>
      <div style="padding:24px;color:#374151;">
        <p>${greeting}</p>
        <h3 style="margin:8px 0 16px;color:#101828;">${title}</h3>
        ${body}
        ${footer || ''}
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
  if (!to) { process.stderr.write(`mail.service: destinatário vazio, subject=${subject}\n`); return; }
  const tx = transporter();
  if (!tx) { process.stderr.write(`mail.service: SMTP não configurado, ignorando envio (${subject})\n`); return; }
  try {
    await tx.sendMail({
      from: `"CBMAM ITSM" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
      to,
      subject,
      html,
    });
  } catch (e) {
    process.stderr.write(`mail.service: erro ao enviar "${subject}" para ${to}: ${e.message}\n`);
  }
}

// ── 1. FECHADO — notificar o solicitante ────────────────────────────────────
async function sendTicketClosedEmail(requesterEmail, requesterName, protocol, subject) {
  const html = render({
    title: `Chamado ${protocol} foi encerrado`,
    greeting: `Olá, <strong>${requesterName || 'militar'}</strong>,`,
    body: `
      <p>Informamos que o seu chamado foi <strong>encerrado</strong> pela equipe BM-6.</p>
      <div style="background-color:#f9fafb;padding:16px;border-radius:8px;margin:20px 0;">
        <p style="margin:0;color:#667085;font-size:13px;">Assunto:</p>
        <p style="margin:5px 0 0 0;font-weight:bold;">${subject}</p>
      </div>
      <p>Se o problema persistir, abra um novo chamado pelo portal.</p>`,
  });
  await send(requesterEmail, `Chamado Encerrado: ${protocol}`, html);
}

// ── 2. STATUS ALTERADO — outras transições além de FECHADO ──────────────────
async function sendTicketStatusChangedEmail(requesterEmail, requesterName, protocol, subject, oldStatus, newStatus) {
  const labels = {
    ABERTO: 'Aberto',
    EM_ATENDIMENTO: 'Em atendimento',
    AGUARDANDO_USUARIO: 'Aguardando sua resposta',
    RESOLVIDO: 'Resolvido',
    FECHADO: 'Encerrado',
    CANCELADO: 'Cancelado',
  };
  const html = render({
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
      ${newStatus === 'AGUARDANDO_USUARIO' ? '<p><strong>Atenção:</strong> precisamos de uma resposta sua para prosseguir. Acesse o portal e verifique o chamado.</p>' : ''}`,
  });
  await send(requesterEmail, `Chamado ${protocol}: ${labels[newStatus] || newStatus}`, html);
}

// ── 3. ATRIBUIÇÃO — analista recebe aviso ──────────────────────────────────
async function sendTicketAssignedEmail(analystEmail, analystName, protocol, subject, requesterName) {
  const html = render({
    title: `Novo chamado atribuído a você (${protocol})`,
    greeting: `Olá, <strong>${analystName || 'analista'}</strong>,`,
    body: `
      <p>Você recebeu a atribuição de um chamado.</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;">
        <tr><td style="padding:8px;border:1px solid #e5e7eb;background:#f9fafb;"><strong>Protocolo</strong></td><td style="padding:8px;border:1px solid #e5e7eb;">${protocol}</td></tr>
        <tr><td style="padding:8px;border:1px solid #e5e7eb;background:#f9fafb;"><strong>Assunto</strong></td><td style="padding:8px;border:1px solid #e5e7eb;">${subject}</td></tr>
        <tr><td style="padding:8px;border:1px solid #e5e7eb;background:#f9fafb;"><strong>Solicitante</strong></td><td style="padding:8px;border:1px solid #e5e7eb;">${requesterName || '—'}</td></tr>
      </table>
      <p>Acesse o portal para iniciar o atendimento.</p>`,
  });
  await send(analystEmail, `Chamado atribuído: ${protocol}`, html);
}

// ── 4. NOVO CHAMADO NA FILA — todos os analistas ativos ────────────────────
async function sendNewTicketToQueueEmail(analystEmail, analystName, protocol, subject, requesterName) {
  const html = render({
    title: `Novo chamado na fila (${protocol})`,
    greeting: `Olá, <strong>${analystName || 'analista'}</strong>,`,
    body: `
      <p>Um novo chamado entrou na fila BM-6.</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;">
        <tr><td style="padding:8px;border:1px solid #e5e7eb;background:#f9fafb;"><strong>Protocolo</strong></td><td style="padding:8px;border:1px solid #e5e7eb;">${protocol}</td></tr>
        <tr><td style="padding:8px;border:1px solid #e5e7eb;background:#f9fafb;"><strong>Assunto</strong></td><td style="padding:8px;border:1px solid #e5e7eb;">${subject}</td></tr>
        <tr><td style="padding:8px;border:1px solid #e5e7eb;background:#f9fafb;"><strong>Solicitante</strong></td><td style="padding:8px;border:1px solid #e5e7eb;">${requesterName || '—'}</td></tr>
      </table>`,
  });
  await send(analystEmail, `Novo chamado na fila: ${protocol}`, html);
}

// ── 5. COMENTÁRIO PÚBLICO — avisa a contraparte ─────────────────────────────
async function sendNewCommentEmail(to, fromName, protocol, subject, body) {
  const html = render({
    title: `Novo comentário no chamado ${protocol}`,
    greeting: `Olá,`,
    body: `
      <p><strong>${fromName || 'Alguém'}</strong> registrou um comentário no chamado.</p>
      <div style="background-color:#f9fafb;padding:16px;border-radius:8px;margin:16px 0;border-left:4px solid #9b0f14;">
        <p style="margin:0;color:#374151;white-space:pre-wrap;">${body.replace(/</g,'&lt;')}</p>
      </div>
      <table style="width:100%;border-collapse:collapse;">
        <tr><td style="padding:8px;border:1px solid #e5e7eb;background:#f9fafb;"><strong>Protocolo</strong></td><td style="padding:8px;border:1px solid #e5e7eb;">${protocol}</td></tr>
        <tr><td style="padding:8px;border:1px solid #e5e7eb;background:#f9fafb;"><strong>Assunto</strong></td><td style="padding:8px;border:1px solid #e5e7eb;">${subject}</td></tr>
      </table>`,
  });
  await send(to, `Comentário em ${protocol} — ${subject || ''}`.slice(0, 250), html);
}

// ── 6. CHAT — mensagem no chat ─────────────────────────────────────────────
async function sendNewChatMessageEmail(to, fromName, protocol, message) {
  const html = render({
    title: `Nova mensagem no chat do chamado ${protocol}`,
    greeting: `Olá,`,
    body: `
      <p><strong>${fromName || 'Alguém'}</strong> enviou uma mensagem no chat do chamado.</p>
      <div style="background-color:#f9fafb;padding:16px;border-radius:8px;margin:16px 0;border-left:4px solid #9b0f14;">
        <p style="margin:0;color:#374151;white-space:pre-wrap;">${message.replace(/</g,'&lt;')}</p>
      </div>`,
  });
  await send(to, `Nova mensagem no chat: ${protocol}`, html);
}

module.exports = {
  sendTicketClosedEmail,
  sendTicketStatusChangedEmail,
  sendTicketAssignedEmail,
  sendNewTicketToQueueEmail,
  sendNewCommentEmail,
  sendNewChatMessageEmail,
};
