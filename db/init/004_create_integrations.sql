-- Public metadata only. Do not store private keys, JWKs, tokens, or secrets.
create table if not exists integrations (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    type text not null check (type in ('klient', 'adapter')),
    client_id text unique,
    organisation_id uuid not null references organisations (id) on delete restrict,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists integration_components (
    integration_id uuid not null references integrations (id) on delete cascade,
    component_id uuid not null references components (id) on delete restrict,
    primary key (integration_id, component_id)
);

insert into integrations (id, name, type, organisation_id)
values
    (
        '00000000-0000-0000-0000-000000000001',
        'Elev til Visma',
        'klient',
        '00000000-0000-0000-0000-000000000010'
    ),
    (
        '00000000-0000-0000-0000-000000000002',
        'Ansatt til SAP',
        'adapter',
        '00000000-0000-0000-0000-000000000010'
    )
on conflict (id) do nothing;

insert into integration_components (integration_id, component_id)
select '00000000-0000-0000-0000-000000000001', id
from components
where name = 'elev'
on conflict do nothing;

insert into integration_components (integration_id, component_id)
select '00000000-0000-0000-0000-000000000002', id
from components
where name = 'personal'
on conflict do nothing;
