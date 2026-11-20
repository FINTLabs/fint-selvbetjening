ALTER TABLE integrations
    ADD COLUMN IF NOT EXISTS description text NOT NULL DEFAULT '';

ALTER TABLE integrations
    ALTER COLUMN description DROP DEFAULT;

ALTER TABLE integrations
    ADD CONSTRAINT integrations_required_details
        CHECK (
            length(btrim(name)) > 0
                AND length(btrim(description)) > 0
            ) NOT VALID;