-- Correr una sola vez en el SQL Editor de Supabase.
-- Agrega la columna que usa api/webhook-pago.js para no insertar
-- dos veces el mismo pedido si Mercado Pago reenvía la notificación.

alter table pedidos add column mp_payment_id text unique;
