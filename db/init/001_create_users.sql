create table if not exists users (
    id uuid primary key default gen_random_uuid(),
    nin text not null unique,
    first_name text not null,
    last_name text not null,
    mail text not null unique,
    mobile text,
    is_admin boolean not null default false,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

insert into users (nin, first_name, last_name, mail, mobile, is_admin)
values
    (
        '123456789',
        'Calvin',
        'Ball',
        'calvin.ball@fint.no',
        '+4712345678',
        false
    ),
    (
        '987654321',
        'Jennifer',
        'Maarberg',
        'jennifer.maarberg@fint.no',
        null,
        true
    )
on conflict (nin) do nothing;
