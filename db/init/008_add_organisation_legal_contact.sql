alter table organisations
    add column if not exists legal_contact_id uuid
        references users (id) on delete restrict;
