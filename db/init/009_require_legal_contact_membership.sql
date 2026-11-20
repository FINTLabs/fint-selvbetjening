begin;

alter table organisations
    add constraint organisations_legal_contact_membership_fk
    foreign key (id, legal_contact_id)
    references organisation_users (organisation_id, user_id)
    not valid;

update organisations o
set legal_contact_id = null, updated_at = now()
where o.legal_contact_id is not null
  and not exists (
      select 1 from organisation_users membership
      where membership.organisation_id = o.id
        and membership.user_id = o.legal_contact_id
  );

alter table organisations
    validate constraint organisations_legal_contact_membership_fk;

commit;
