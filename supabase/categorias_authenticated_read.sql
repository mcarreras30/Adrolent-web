-- Correr una sola vez en el SQL Editor de Supabase.
-- Fix: la política "public_read_categorias" (supabase/categorias.sql) quedó
-- creada "to anon", que solo cubre pedidos sin sesión. El panel de admin,
-- una vez logueado, consulta la tabla como rol "authenticated" -- un rol
-- distinto en Postgres/RLS -- así que esa consulta no matcheaba ninguna
-- política y devolvía [] en vez de las 5 categorías.
-- Esta política agrega el mismo permiso de lectura para "authenticated".

create policy "authenticated_read_categorias"
on categorias for select
to authenticated
using (true);
