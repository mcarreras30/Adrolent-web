-- Correr una sola vez en el SQL Editor de Supabase.
-- Crea la tabla categorias (portada de las 5 categorías del catálogo público)
-- y la siembra con las mismas imágenes que hoy están hardcodeadas en el
-- array CATS de index.html, para que el admin pueda reemplazarlas después
-- sin tocar código.

create table categorias (
  id serial primary key,
  slug text unique not null,
  nombre text not null,
  imagen_url text
);

alter table categorias enable row level security;

-- Lectura pública, igual que productos.
create policy "public_read_categorias"
on categorias for select
to anon
using (true);

-- Solo un admin autenticado puede actualizar la imagen de una categoría
-- existente. No hace falta insert/delete: las 5 filas las crea este mismo
-- script y nunca se agregan ni se borran categorías desde el admin.
create policy "authenticated_update_categorias"
on categorias for update
to authenticated
using (true)
with check (true);

insert into categorias (slug, nombre, imagen_url) values
  ('receta', 'Anteojos de Receta', 'https://images.unsplash.com/photo-1574258495973-f010dfbb5371?w=400&q=75'),
  ('sol', 'Anteojos de Sol', 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=400&q=75'),
  ('contacto', 'Lentes de Contacto', 'https://images.unsplash.com/photo-1585282263861-f55e341878f8?w=400&q=75'),
  ('liquidos', 'Líquidos', null),
  ('accesorios', 'Accesorios', 'https://images.unsplash.com/photo-1508296695146-257a814070b4?w=400&q=75');
