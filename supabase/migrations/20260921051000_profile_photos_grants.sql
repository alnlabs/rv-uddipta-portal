-- Ensure authenticated users can evaluate photo storage policies.

grant execute on function public.storage_flat_id_from_path(text) to authenticated;
grant execute on function public.can_manage_flat_photos(bigint) to authenticated;
