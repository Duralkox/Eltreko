CREATE TABLE IF NOT EXISTS uzytkownicy (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(180) UNIQUE NOT NULL,
  haslo_hash VARCHAR(255) NOT NULL,
  imie_nazwisko VARCHAR(180) NOT NULL,
  rola ENUM('Administrator', 'Technik', 'Kierownik') NOT NULL DEFAULT 'Technik',
  aktywny TINYINT(1) NOT NULL DEFAULT 1,
  reset_kod_hash VARCHAR(255) NULL,
  reset_kod_wygasa DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_polish_ci;

CREATE TABLE IF NOT EXISTS klienci (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nazwa VARCHAR(220) NOT NULL,
  adres TEXT NOT NULL,
  telefon VARCHAR(60),
  email VARCHAR(180),
  notatki TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_polish_ci;

CREATE TABLE IF NOT EXISTS protokoly (
  id INT AUTO_INCREMENT PRIMARY KEY,
  numer_protokolu VARCHAR(220) NOT NULL,
  data DATE NOT NULL,
  klient VARCHAR(220) NOT NULL,
  adres TEXT NOT NULL,
  telefon VARCHAR(60),
  opis_pracy TEXT,
  usterki TEXT,
  zlecajacy VARCHAR(220),
  przyjmujacy_zlecenie VARCHAR(220),
  obiekt VARCHAR(220),
  adres_obiektu TEXT,
  lokalizacja_usterki TEXT,
  opis_usterki TEXT,
  planowana_data_naprawy DATE,
  uwagi_do_uslugi TEXT,
  kategoria_usterki_nazwa VARCHAR(220),
  czynnosci_serwisowe_json LONGTEXT,
  uzyte_czesci_json LONGTEXT,
  technik_id INT NULL,
  podpis_technika LONGTEXT,
  podpis_klienta LONGTEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_protokoly_technik FOREIGN KEY (technik_id) REFERENCES uzytkownicy(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_polish_ci;

CREATE TABLE IF NOT EXISTS protokol_zdjecia (
  id INT AUTO_INCREMENT PRIMARY KEY,
  protokol_id INT NOT NULL,
  nazwa_pliku VARCHAR(255) NOT NULL,
  sciezka_pliku TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_protokol_zdjecia_protokol FOREIGN KEY (protokol_id) REFERENCES protokoly(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_polish_ci;

CREATE TABLE IF NOT EXISTS szablony (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nazwa VARCHAR(255) NOT NULL,
  sciezka_pliku TEXT NOT NULL,
  uploaded_by INT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_szablony_uzytkownik FOREIGN KEY (uploaded_by) REFERENCES uzytkownicy(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_polish_ci;

CREATE TABLE IF NOT EXISTS kategorie_usterek (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nazwa VARCHAR(160) NOT NULL,
  opis TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_kategorie_usterek_nazwa (nazwa)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_polish_ci;

CREATE TABLE IF NOT EXISTS czynnosci_serwisowe (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nazwa VARCHAR(180) NOT NULL,
  opis TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_czynnosci_serwisowe_nazwa (nazwa)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_polish_ci;

CREATE TABLE IF NOT EXISTS szablony_przegladow (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nazwa VARCHAR(180) NOT NULL,
  opis TEXT,
  zawartosc LONGTEXT,
  nazwa_pliku VARCHAR(255),
  sciezka_pliku TEXT,
  mime_type VARCHAR(180),
  uploaded_by INT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_szablony_przegladow_uzytkownik FOREIGN KEY (uploaded_by) REFERENCES uzytkownicy(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_polish_ci;

CREATE TABLE IF NOT EXISTS definicje_czesci (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nazwa VARCHAR(180) NOT NULL,
  jednostka VARCHAR(30) NOT NULL DEFAULT 'szt',
  kod VARCHAR(80),
  opis TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_polish_ci;

CREATE TABLE IF NOT EXISTS zgloszenia (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tytul VARCHAR(220) NOT NULL,
  opis TEXT,
  kontrahent_id INT NULL,
  kategoria_usterki_id INT NULL,
  status ENUM('Nowe', 'W toku', 'Zamkniete') NOT NULL DEFAULT 'Nowe',
  priorytet ENUM('Niski', 'Normalny', 'Wysoki') NOT NULL DEFAULT 'Normalny',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_zgloszenia_kontrahent FOREIGN KEY (kontrahent_id) REFERENCES klienci(id) ON DELETE SET NULL,
  CONSTRAINT fk_zgloszenia_kategoria FOREIGN KEY (kategoria_usterki_id) REFERENCES kategorie_usterek(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_polish_ci;

CREATE TABLE IF NOT EXISTS odczyty_licznikow (
  id INT AUTO_INCREMENT PRIMARY KEY,
  lp INT NOT NULL,
  typ_licznika VARCHAR(220) NOT NULL,
  rodzaj_licznika VARCHAR(140),
  numer_licznika VARCHAR(120) NOT NULL,
  kontrahent_id INT NULL,
  rok INT NOT NULL,
  import_nazwa VARCHAR(220),
  m01 VARCHAR(40),
  m02 VARCHAR(40),
  m03 VARCHAR(40),
  m04 VARCHAR(40),
  m05 VARCHAR(40),
  m06 VARCHAR(40),
  m07 VARCHAR(40),
  m08 VARCHAR(40),
  m09 VARCHAR(40),
  m10 VARCHAR(40),
  m11 VARCHAR(40),
  m12 VARCHAR(40),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_odczyty_kontrahent FOREIGN KEY (kontrahent_id) REFERENCES klienci(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_polish_ci;

CREATE TABLE IF NOT EXISTS ppoz_przeglady (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nazwa VARCHAR(220) NOT NULL,
  data_przegladu DATE,
  kontrahent_id INT NULL,
  kontrahent_nazwa VARCHAR(220) NULL,
  budynek_nazwa VARCHAR(220) NULL,
  opis TEXT,
  status ENUM('Planowany', 'W realizacji', 'Zakończony') NOT NULL DEFAULT 'Planowany',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_ppoz_kontrahent FOREIGN KEY (kontrahent_id) REFERENCES klienci(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_polish_ci;

CREATE TABLE IF NOT EXISTS panel_notatki (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tytul VARCHAR(220) NOT NULL,
  tresc TEXT,
  termin_at DATETIME NULL,
  created_by INT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_panel_notatki_uzytkownik FOREIGN KEY (created_by) REFERENCES uzytkownicy(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_polish_ci;

CREATE TABLE IF NOT EXISTS odczyty_pliki_storage (
  kontrahent_nazwa VARCHAR(220) PRIMARY KEY,
  bucket_name VARCHAR(120) NOT NULL DEFAULT 'eltreko-files',
  storage_path VARCHAR(400) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  updated_by_email VARCHAR(220),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_polish_ci;

CREATE TABLE IF NOT EXISTS kontrahenci_meta (
  kontrahent_nazwa VARCHAR(220) PRIMARY KEY,
  zlecajacy VARCHAR(220),
  adres_protokolu TEXT,
  updated_by_email VARCHAR(220),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_polish_ci;

CREATE INDEX idx_protokoly_data ON protokoly(data);
CREATE INDEX idx_protokoly_technik ON protokoly(technik_id);
CREATE INDEX idx_klienci_nazwa ON klienci(nazwa);
CREATE INDEX idx_zgloszenia_status ON zgloszenia(status);
CREATE INDEX idx_odczyty_rok ON odczyty_licznikow(rok);
CREATE INDEX idx_ppoz_data ON ppoz_przeglady(data_przegladu);
CREATE INDEX idx_panel_notatki_termin ON panel_notatki(termin_at);

