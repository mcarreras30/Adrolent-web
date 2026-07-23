const { createClient } = require('@supabase/supabase-js');
const { enviarEmailVenta } = require('../lib/notificar-venta');

const SUPABASE_URL = 'https://qrcrjxfucxoydzcthobd.supabase.co';

module.exports = async (req, res) => {
  try {
    const body = req.body || {};
    const query = req.query || {};

    // Soporta tanto el formato nuevo de webhooks (body: {type, data:{id}})
    // como el IPN viejo (query string: ?topic=payment&id=... o ?type=payment&data.id=...)
    const topic = body.type || query.type || query.topic;
    const paymentId = (body.data && body.data.id) || query['data.id'] || query.id;

    if (topic !== 'payment' || !paymentId) {
      res.status(200).json({ received: true });
      return;
    }

    // Nunca confiar en el body de la notificación: se vuelve a pedir el pago
    // directamente a la API de Mercado Pago con nuestro access token.
    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}` },
    });

    if (!mpRes.ok) {
      console.error('No se pudo consultar el pago', paymentId, mpRes.status);
      res.status(200).json({ received: true });
      return;
    }

    const payment = await mpRes.json();

    if (payment.status !== 'approved') {
      res.status(200).json({ received: true });
      return;
    }

    const sb = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    const paymentIdStr = String(payment.id);

    const { data: existing, error: selError } = await sb
      .from('pedidos')
      .select('id')
      .eq('mp_payment_id', paymentIdStr)
      .maybeSingle();

    if (selError) {
      console.error('Error chequeando duplicados:', selError);
      res.status(500).json({ error: 'No se pudo verificar el pedido' });
      return;
    }

    if (existing) {
      // Ya procesamos este pago antes (notificación repetida de Mercado Pago).
      res.status(200).json({ received: true });
      return;
    }

    const meta = payment.metadata || {};
    const envio = meta.envio || {};
    const { error: insError } = await sb.from('pedidos').insert({
      productos: meta.productos || [],
      total: payment.transaction_amount,
      estado: 'pagado',
      metodo_pago: meta.metodo_pago || payment.payment_type_id || 'mercadopago',
      cliente_nombre: meta.cliente_nombre || '',
      cliente_telefono: meta.cliente_telefono || '',
      mp_payment_id: paymentIdStr,
      calle: envio.calle || null,
      numero: envio.numero || null,
      piso: envio.piso || null,
      ciudad: envio.ciudad || null,
      provincia: envio.provincia || null,
      cp: envio.cp || null,
      dni: envio.dni || null,
    });

    if (insError) {
      console.error('Error insertando pedido:', insError);
      res.status(500).json({ error: 'No se pudo registrar el pedido' });
      return;
    }

    try {
      await enviarEmailVenta({
        productos: meta.productos,
        total: payment.transaction_amount,
        cliente_nombre: meta.cliente_nombre,
        cliente_telefono: meta.cliente_telefono,
        metodo_pago: meta.metodo_pago,
        referenciaLabel: 'N° de operación (Mercado Pago)',
        referenciaValor: paymentIdStr,
      });
    } catch (emailErr) {
      // El pedido ya quedó registrado; un email que falla no debe hacer
      // que Mercado Pago reintente ni afectar la respuesta del webhook.
      console.error('Error enviando email de notificación de venta:', emailErr);
    }

    res.status(200).json({ received: true });
  } catch (err) {
    console.error('Error inesperado en webhook-pago:', err);
    res.status(500).json({ error: 'Error interno' });
  }
};
