const { createClient } = require('@supabase/supabase-js');
const { enviarEmailVenta } = require('../lib/notificar-venta');

const SUPABASE_URL = 'https://qrcrjxfucxoydzcthobd.supabase.co';

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método no permitido' });
    return;
  }

  const { items, comprador, envio } = req.body || {};

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
  const total = productos.reduce((s, p) => s + p.precio * p.cantidad, 0);
  const cliente_nombre = `${comprador.nombre} ${comprador.apellido || ''}`.trim();
  const cliente_telefono = String(comprador.telefono);
  const env = envio || {};

  try {
    const sb = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    const { data, error } = await sb
      .from('pedidos')
      .insert({
        productos,
        total,
        estado: 'pendiente',
        metodo_pago: 'efectivo',
        cliente_nombre,
        cliente_telefono,
        calle: env.calle || null,
        numero: env.numero || null,
        piso: env.piso || null,
        ciudad: env.ciudad || null,
        provincia: env.provincia || null,
        cp: env.cp || null,
        dni: env.dni || null,
      })
      .select('id')
      .single();

    if (error) throw error;

    try {
      await enviarEmailVenta({
        productos,
        total,
        cliente_nombre,
        cliente_telefono,
        metodo_pago: 'efectivo',
        pendienteCobro: true,
        referenciaLabel: 'Pedido interno',
        referenciaValor: `#${data.id}`,
      });
    } catch (emailErr) {
      // El pedido ya quedó registrado; un email que falla no debe romper la respuesta.
      console.error('Error enviando email de aviso de pedido en efectivo:', emailErr);
    }

    res.status(200).json({ ok: true, id: data.id });
  } catch (err) {
    console.error('Error registrando pedido en efectivo:', err);
    res.status(500).json({ error: 'No se pudo registrar el pedido' });
  }
};
