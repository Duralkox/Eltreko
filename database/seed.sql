INSERT IGNORE INTO uzytkownicy(email, haslo_hash, imie_nazwisko, rola)
VALUES
  ('dominik@eltreko.pl', '$2a$10$0l41GvvlIWnbO1vsDsdqTuNQqqHrUslINj7pr2EgRO5lw73RA9OPy', 'Dominik Administrator', 'Administrator'),
  ('serwis@eltreko.pl', '$2a$10$h03DuSoAHC09e2ZcgcOB6.oEHY/Jmu/2Yqtb2/ygvY/RL5n9Lu35W', 'Michał Serwis', 'Technik');

INSERT IGNORE INTO klienci(nazwa, adres, telefon, email, notatki)
VALUES
  ('Zakład Produkcyjny Alfa', 'ul. Przemysłowa 12, 43-300 Bielsko-Biała', '+48 500 111 222', 'biuro@alfa.pl', 'Priorytet serwisowy A'),
  ('Magazyny Beta', 'ul. Kolejowa 5, 30-001 Kraków', '+48 600 222 333', 'kontakt@beta.pl', 'Dostęp po zgłoszeniu na ochronie');

INSERT IGNORE INTO protokoly(
  numer_protokolu, data, klient, adres, telefon, opis_pracy, usterki, technik_id, podpis_technika, podpis_klienta
)
SELECT
  'ELT/2026/0001',
  CURDATE(),
  'Zakład Produkcyjny Alfa',
  'ul. Przemysłowa 12, 43-300 Bielsko-Biała',
  '+48 500 111 222',
  'Wymiana modułu sterowania oraz test końcowy.',
  'Uszkodzony przekaźnik na płycie głównej.',
  u.id,
  'data:image/png;base64,PRZYKLADOWY_PODPIS_TECHNIKA',
  'data:image/png;base64,PRZYKLADOWY_PODPIS_KLIENTA'
FROM uzytkownicy u
WHERE u.email = 'serwis@eltreko.pl';

INSERT IGNORE INTO kategorie_usterek(nazwa, opis) VALUES
  ('Elektryczna', 'Usterki i awarie elektryczne'),
  ('Hydrauliczna', 'Usterki hydrauliczne i instalacyjne'),
  ('Mechaniczna', 'Usterki mechaniczne');

INSERT IGNORE INTO czynnosci_serwisowe(nazwa, opis) VALUES
  ('Kontrola wizualna', 'Sprawdzenie stanu urządzenia i instalacji'),
  ('Czyszczenie', 'Czyszczenie elementów roboczych'),
  ('Test działania', 'Weryfikacja poprawności pracy po serwisie');
