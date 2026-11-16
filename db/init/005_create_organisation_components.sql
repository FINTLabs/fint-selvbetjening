create table if not exists organisation_components (
    organisation_id uuid not null references organisations (id) on delete cascade,
    component_id uuid not null references components (id) on delete cascade,
    primary key (organisation_id, component_id)
);
