ALTER TABLE uzytkownicy
  ADD COLUMN reset_kod_hash VARCHAR(255) NULL AFTER aktywny,
  ADD COLUMN reset_kod_wygasa DATETIME NULL AFTER reset_kod_hash;
