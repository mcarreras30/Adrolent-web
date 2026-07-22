-- Correr una sola vez en el SQL Editor de Supabase.
-- Permite que usuarios autenticados (los que loguean en /admin) puedan subir,
-- reemplazar y borrar archivos en el bucket "productos-fotos".
-- La lectura pública del bucket ya está dada porque el bucket es público
-- (no hace falta política de SELECT para eso).

create policy "authenticated_upload_productos_fotos"
on storage.objects for insert
to authenticated
with check (bucket_id = 'productos-fotos');

create policy "authenticated_update_productos_fotos"
on storage.objects for update
to authenticated
using (bucket_id = 'productos-fotos')
with check (bucket_id = 'productos-fotos');

create policy "authenticated_delete_productos_fotos"
on storage.objects for delete
to authenticated
using (bucket_id = 'productos-fotos');
