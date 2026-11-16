create table if not exists components (
    id uuid primary key default gen_random_uuid(),
    name text not null unique,
    description text not null,
    category text not null,
    base_path text not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

insert into components (name, description, category, base_path)
values
    (
        'fullmakt',
        'Administrasjon Fullmakt',
        'administrasjon',
        '/administrasjon/fullmakt'
    ),
    (
        'personal',
        'Administrasjon Personal',
        'administrasjon',
        '/administrasjon/personal'
    ),
    (
        'elev',
        'Utdanning Elev',
        'utdanning',
        '/utdanning/elev'
    ),
    (
        'faktura',
        'Økonomi Faktura',
        'okonomi',
        '/okonomi/faktura'
    )
on conflict (name) do nothing;
