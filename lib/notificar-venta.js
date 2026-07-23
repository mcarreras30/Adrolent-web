const NOTIFICACION_EMAIL_TO = 'mcarreras@udesa.edu.ar';

const METODO_PAGO_LABEL = {
  efectivo: 'Efectivo',
  transferencia: 'Transferencia bancaria',
  mercadopago: 'Mercado Pago',
  debito: 'Débito',
  credito: 'Crédito',
};

// Notifica al dueño del negocio por email (Resend) que hay una venta nueva.
// pendienteCobro=true es para pedidos en efectivo que todavía no se cobraron
// (deja un aviso destacado en el email en vez de tratarlo como venta ya acreditada).
async function enviarEmailVenta({
  productos,
  total,
  cliente_nombre,
  cliente_telefono,
  metodo_pago,
  pendienteCobro,
  referenciaLabel,
  referenciaValor,
}) {
  const totalFmt = Number(total).toLocaleString('es-AR');
  const itemsHtml = (productos || [])
    .map(p => `<li>${p.nombre} x${p.cantidad} — $${Number(p.precio * p.cantidad).toLocaleString('es-AR')}</li>`)
    .join('');

  const subject = pendienteCobro
    ? `Nuevo pedido en efectivo — $${totalFmt} (a cobrar)`
    : `Nueva venta en Adrolent — $${totalFmt}`;

  const avisoCobro = pendienteCobro
    ? `<p style="background:#fef3c7;color:#92400e;padding:10px 14px;border-radius:8px"><strong>⚠️ Pago pendiente:</strong> cobrar en efectivo al entregar.</p>`
    : '';

  const referenciaHtml = referenciaLabel && referenciaValor
    ? `<p><strong>${referenciaLabel}:</strong> ${referenciaValor}</p>`
    : '';

  const html = `
    <div style="font-family:sans-serif;color:#1a2d4f">
      <h2 style="color:#1a6ab5">${pendienteCobro ? 'Nuevo pedido en efectivo' : 'Nueva venta confirmada'}</h2>
      ${avisoCobro}
      <ul>${itemsHtml}</ul>
      <p><strong>Total:</strong> $${totalFmt}</p>
      <p><strong>Cliente:</strong> ${cliente_nombre || '—'}</p>
      <p><strong>Teléfono:</strong> ${cliente_telefono || '—'}</p>
      <p><strong>Método de pago:</strong> ${METODO_PAGO_LABEL[metodo_pago] || metodo_pago || '—'}</p>
      ${referenciaHtml}
    </div>`;

  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Adrolent Óptica <onboarding@resend.dev>',
      to: NOTIFICACION_EMAIL_TO,
      subject,
      html,
    }),
  });

  if (!r.ok) {
    const detail = await r.text().catch(() => '');
    throw new Error(`Resend respondió ${r.status}: ${detail}`);
  }
}

module.exports = { enviarEmailVenta };
