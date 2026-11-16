create table if not exists organisations (
    id uuid primary key default gen_random_uuid(),
    name text not null unique,
    display_name text not null,
    org_number text not null unique,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists organisation_users (
    organisation_id uuid not null references organisations (id) on delete cascade,
    user_id uuid not null references users (id) on delete cascade,
    primary key (organisation_id, user_id)
);

insert into organisations (id, name, display_name, org_number)
values (
    '00000000-0000-0000-0000-000000000010',
    'jennifer_test',
    'Test Organisation 1',
    '123456789'
)
on conflict (name) do nothing;

insert into organisation_users (organisation_id, user_id)
select o.id, u.id
from organisations o
join users u on u.nin in ('123456789', '987654321')
where o.name = 'jennifer_test'
on conflict do nothing;

insert into organisations (id, name, display_name, org_number)
values (
    '00000000-0000-0000-0000-000000000011',
    'test_org_2',
    'Test Organisation 2',
    '555555555'
)
on conflict (name) do nothing;

insert into organisation_users (organisation_id, user_id)
select o.id, u.id
from organisations o
join users u on u.nin = '987654321'
where o.name = 'test_org_2'
on conflict do nothing;
