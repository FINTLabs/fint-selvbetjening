create table integration_purpose_history (
                                             id bigint generated always as identity primary key,
                                             integration_id uuid not null
                                                 references integrations (id) on delete restrict,
                                             old_purpose text not null,
                                             new_purpose text not null,
                                             changed_at timestamptz not null default clock_timestamp(),
                                             changed_by_user_id uuid not null,
                                             changed_by_name text not null,
                                             constraint integration_purpose_history_actual_change
                                                 check (old_purpose <> new_purpose),
                                             constraint integration_purpose_history_nonempty
                                                 check (length(btrim(new_purpose)) > 0)
);

create index integration_purpose_history_integration_idx
    on integration_purpose_history (integration_id, id desc);