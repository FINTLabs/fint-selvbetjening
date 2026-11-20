begin;

alter table organisation_users
    add column is_admin boolean not null default false;

update organisation_users membership
set is_admin = true
from users u
where u.id = membership.user_id and u.is_admin;

commit;
