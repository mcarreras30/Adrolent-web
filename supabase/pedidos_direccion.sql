-- Correr una sola vez en el SQL Editor de Supabase.
-- Agrega las columnas de dirección/DNI que el checkout ya pide en el paso
-- "Envío" pero que hasta ahora no se guardaban en ningún lado (ni para
-- pagos de Mercado Pago ni para efectivo). Pedidos anteriores a esta
-- migración van a quedar con estas columnas en NULL.

alter table pedidos
  add column calle text,
  add column numero text,
  add column piso text,
  add column ciudad text,
  add column provincia text,
  add column cp text,
  add column dni text;
