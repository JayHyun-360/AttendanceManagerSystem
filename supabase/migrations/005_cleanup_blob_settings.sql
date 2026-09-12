update public.system_settings
set settings = jsonb_strip_nulls(
  jsonb_build_object(
    'showFees', settings->'showFees',
    'allowExcuseRequests', settings->'allowExcuseRequests',
    'requirePhotoId', settings->'requirePhotoId',
    'academicYear', settings->'academicYear',
    'semester', settings->'semester',
    'institution', settings->'institution',
    'heroImageUrls', coalesce(
      (
        select jsonb_agg(elem)
        from jsonb_array_elements(coalesce(settings->'heroImageUrls', '[]'::jsonb)) as elem
        where elem::text not like 'blob:%'
      ),
      '[]'::jsonb
    ),
    'carouselSlides', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'imageUrl', case when elem->>'imageUrl' like 'blob:%' then '' else elem->>'imageUrl' end,
            'caption', elem->>'caption',
            'date', elem->>'date'
          )
        )
        from jsonb_array_elements(coalesce(settings->'carouselSlides', '[]'::jsonb)) as elem
      ),
      '[]'::jsonb
    )
  )
)
where settings is not null;
