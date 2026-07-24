-- Correr una sola vez en el SQL Editor de Supabase, después de crear el
-- bucket "sitio-assets" como público desde el dashboard (Storage → New
-- bucket → Public bucket).
-- Mismo patrón que supabase/storage_policies.sql (productos-fotos), pero
-- para los assets estáticos de diseño del sitio (logo, fotos del local,
-- foto de la categoría líquidos) en vez de las fotos de productos que el
-- admin sube/reemplaza constantemente. La lectura pública ya la da el
-- bucket público (no hace falta política de SELECT para eso).

create policy "authenticated_upload_sitio_assets"
on storage.objects for insert
to authenticated
with check (bucket_id = 'sitio-assets');

create policy "authenticated_update_sitio_assets"
on storage.objects for update
to authenticated
using (bucket_id = 'sitio-assets')
with check (bucket_id = 'sitio-assets');

create policy "authenticated_delete_sitio_assets"
on storage.objects for delete
to authenticated
using (bucket_id = 'sitio-assets');
