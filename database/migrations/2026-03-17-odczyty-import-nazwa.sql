ALTER TABLE odczyty_licznikow
ADD COLUMN IF NOT EXISTS import_nazwa VARCHAR(220) NULL AFTER rok;

CREATE INDEX idx_odczyty_import_nazwa ON odczyty_licznikow(import_nazwa);
