const { randomUUID } = require('crypto');
const { MercadoPagoConfig, Preference } = require('mercadopago');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método no permitido' });
    return;
  }

  const { items, comprador, metodoPago } = req.body || {};

  if (!Array.isArray(items) || items.length === 0) {
    res.status(400).json({ error: 'El carrito está vacío' });
    return;
  }
  if (!comprador || !comprador.nombre || !comprador.telefono) {
    res.status(400).json({ error: 'Faltan datos del comprador' });
    return;
  }

  const productos = items.map(it => ({
    nombre: String(it.nombre || '').slice(0, 256),
    cantidad: Math.max(1, parseInt(it.cantidad, 10) || 1),
    precio: Number(it.precio) || 0,
  }));

  const origin = req.headers.origin || `https://${req.headers.host}`;
  const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });
  const preference = new Preference(client);

  try {
    const result = await preference.create({
      body: {
        items: productos.map(p => ({
          title: p.nombre,
          quantity: p.cantidad,
          unit_price: p.precio,
          currency_id: 'ARS',
        })),
        payer: {
          name: comprador.nombre,
          surname: comprador.apellido || '',
          email: comprador.email || undefined,
          phone: { number: String(comprador.telefono) },
        },
        back_urls: {
          success: `${origin}/gracias.html`,
          failure: `${origin}/gracias.html`,
          pending: `${origin}/gracias.html`,
        },
        auto_return: 'approved',
        notification_url: `${origin}/api/webhook-pago`,
        external_reference: randomUUID(),
        metadata: {
          productos,
          cliente_nombre: `${comprador.nombre} ${comprador.apellido || ''}`.trim(),
          cliente_telefono: String(comprador.telefono),
          metodo_pago: metodoPago || 'mercadopago',
        },
      },
    });

    res.status(200).json({ init_point: result.init_point });
  } catch (err) {
    console.error('Error creando preferencia de Mercado Pago:', err);
    res.status(500).json({ error: 'No se pudo iniciar el pago. Probá de nuevo en unos minutos.' });
  }
};
