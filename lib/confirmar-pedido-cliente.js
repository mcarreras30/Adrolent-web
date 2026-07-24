// Email de confirmación de compra para el cliente (comprador.email), separado
// por completo del email de notificación interna al dueño (lib/notificar-venta.js)
// para que un fallo en uno nunca afecte al otro.
async function enviarEmailConfirmacionCliente({ email, productos, total, pendienteCobro, pedidoId }) {
  if (!email || !String(email).trim()) return; // sin email no hay a quién mandarle nada

  const totalFmt = Number(total).toLocaleString('es-AR');
  const itemsHtml = (productos || [])
    .map(p => `<li>${p.nombre} x${p.cantidad} — $${Number(p.precio * p.cantidad).toLocaleString('es-AR')}</li>`)
    .join('');

  const subject = pendienteCobro
    ? 'Recibimos tu pedido en Adrolent — a abonar al retirar'
    : `Confirmamos tu pedido en Adrolent — $${totalFmt}`;

  const html = pendienteCobro
    ? `
    <div style="font-family:sans-serif;color:#1a2d4f">
      <h2 style="color:#1a6ab5">¡Recibimos tu pedido!</h2>
      <p style="background:#fef3c7;color:#92400e;padding:10px 14px;border-radius:8px"><strong>Pago pendiente:</strong> se abona en efectivo al retirar el pedido en el local.</p>
      <ul>${itemsHtml}</ul>
      <p><strong>Total a abonar:</strong> $${totalFmt}</p>
      <p><strong>N° de pedido:</strong> #${pedidoId}</p>
      <p>Te vamos a escribir por WhatsApp para coordinar la fecha de retiro en el local.</p>
    </div>`
    : `
    <div style="font-family:sans-serif;color:#1a2d4f">
      <h2 style="color:#1a6ab5">¡Gracias por tu compra!</h2>
      <p>Confirmamos que recibimos tu pago correctamente.</p>
      <ul>${itemsHtml}</ul>
      <p><strong>Total:</strong> $${totalFmt}</p>
      <p><strong>N° de pedido:</strong> #${pedidoId}</p>
      <p>Tu pedido va a ser despachado por Andreani a la dirección que nos indicaste. Te va a llegar en 2 a 5 días hábiles.</p>
    </div>`;

  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Adrolent Óptica <onboarding@resend.dev>',
      to: email,
      subject,
      html,
    }),
  });

  if (!r.ok) {
    const detail = await r.text().catch(() => '');
    throw new Error(`Resend respondió ${r.status}: ${detail}`);
  }
}

module.exports = { enviarEmailConfirmacionCliente };
