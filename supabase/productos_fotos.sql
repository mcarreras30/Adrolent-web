-- Correr una sola vez en el SQL Editor de Supabase.
-- Agrega soporte para varias fotos por producto (antes solo imagen_url).
-- Productos existentes quedan con fotos en NULL a propósito: el admin y el
-- catálogo público hacen fallback a mostrar solo imagen_url en ese caso, no
-- hace falta backfill. imagen_url se sigue sincronizando como la portada
-- (primer elemento de fotos) desde el código del admin — no hay trigger de
-- DB, es lógica de aplicación, igual que el resto de este proyecto.

alter table productos add column fotos text[];
