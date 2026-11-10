-- Phone forms only returned the caller's own answers. When the form is set to
-- community/link (or admins for admins), include every home's answers.

create or replace function public.list_my_forms()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  actor public.profiles%rowtype;
  home text;
  forms jsonb;
begin
  if auth.uid() is null then
    raise exception 'Sign in first.';
  end if;
  select * into actor from public.profiles where user_id = auth.uid();
  home := null;
  if actor.flat_id is not null then
    select flat_number into home from public.flats where id = actor.flat_id;
  end if;

  select coalesce(jsonb_agg(form_row order by form_row ->> 'title'), '[]'::jsonb)
  into forms
  from (
    select jsonb_build_object(
      'id', enquiry.id,
      'title', enquiry.title,
      'note', coalesce(enquiry.note, ''),
      'closed', enquiry.closed_at is not null,
      'results', enquiry.results_view,
      'homes', case
        when enquiry.results_view in ('community', 'link')
          or (enquiry.results_view = 'admins' and actor.role = 'admin')
        then (
          select count(*)::int
          from public.enquiry_responses response
          where response.enquiry_id = enquiry.id
        )
        when enquiry.results_view = 'own' and response.id is not null then 1
        else null
      end,
      'submitted', response.id is not null,
      'phone', response.phone,
      'fields', coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', field.id,
          'kind', field.kind,
          'label', field.label,
          'required', field.required,
          'choices', coalesce(to_jsonb(field.choices), '[]'::jsonb)
        ) order by field.sort_order, field.id)
        from public.enquiry_fields field
        where field.enquiry_id = enquiry.id
      ), '[]'::jsonb),
      'answers', coalesce((
        select jsonb_agg(jsonb_build_object('fieldId', answer.field_id, 'value', answer.value))
        from public.enquiry_answers answer
        where answer.response_id = response.id
      ), '[]'::jsonb),
      'community', case
        when enquiry.results_view in ('community', 'link')
          or (enquiry.results_view = 'admins' and actor.role = 'admin')
        then coalesce((
          select jsonb_agg(jsonb_build_object(
            'responseId', item.id,
            'flatNumber', item.flat_number,
            'name', coalesce(item.name, ''),
            'phone', coalesce(item.phone, ''),
            'updatedAt', item.updated_at,
            'values', coalesce((
              select jsonb_object_agg(answer.field_id::text, answer.value)
              from public.enquiry_answers answer
              where answer.response_id = item.id
            ), '{}'::jsonb)
          ) order by item.flat_number)
          from public.enquiry_responses item
          where item.enquiry_id = enquiry.id
        ), '[]'::jsonb)
        when enquiry.results_view = 'own' and response.id is not null then
          jsonb_build_array(jsonb_build_object(
            'responseId', response.id,
            'flatNumber', response.flat_number,
            'name', coalesce(response.name, ''),
            'phone', coalesce(response.phone, ''),
            'updatedAt', response.updated_at,
            'values', coalesce((
              select jsonb_object_agg(answer.field_id::text, answer.value)
              from public.enquiry_answers answer
              where answer.response_id = response.id
            ), '{}'::jsonb)
          ))
        else '[]'::jsonb
      end
    ) as form_row
    from public.enquiries enquiry
    left join public.enquiry_responses response
      on response.enquiry_id = enquiry.id
     and response.flat_number = home
    where public.phone_access('forms') <> 'none'
      and (enquiry.visibility = 'public' or public.phone_access('forms') <> 'none')
  ) listed;

  return jsonb_build_object(
    'access', public.phone_access('forms'),
    'flat', home,
    'forms', forms
  );
end;
$$;

revoke all on function public.list_my_forms() from public, anon;
grant execute on function public.list_my_forms() to authenticated;
