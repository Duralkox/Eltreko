create extension if not exists pgcrypto;

create or replace function ustaw_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create table if not exists uzytkownicy (
  id integer generated always as identity primary key,
  email varchar(180) unique not null,
  haslo_hash varchar(255) not null,
  imie_nazwisko varchar(180) not null,
  rola text not null default 'Technik' check (rola in ('Administrator', 'Technik', 'Kierownik')),
  aktywny smallint not null default 1,
  reset_kod_hash varchar(255),
  reset_kod_wygasa timestamp,
  created_at timestamp not null default now(),
  updated_at timestamp not null default now()
);

create table if not exists klienci (
  id integer generated always as identity primary key,
  nazwa varchar(220) not null,
  adres text not null,
  telefon varchar(60),
  email varchar(180),
  notatki text,
  created_at timestamp not null default now(),
  updated_at timestamp not null default now()
);

create table if not exists protokoly (
  id integer generated always as identity primary key,
  numer_protokolu varchar(220) not null,
  data date not null,
  klient varchar(220) not null,
  adres text not null,
  telefon varchar(60),
  opis_pracy text,
  usterki text,
  zlecajacy varchar(220),
  przyjmujacy_zlecenie varchar(220),
  obiekt varchar(220),
  adres_obiektu text,
  lokalizacja_usterki text,
  opis_usterki text,
  planowana_data_naprawy date,
  uwagi_do_uslugi text,
  kategoria_usterki_nazwa varchar(220),
  czynnosci_serwisowe_json text,
  uzyte_czesci_json text,
  technik_id integer references uzytkownicy(id) on delete set null,
  podpis_technika text,
  podpis_klienta text,
  created_at timestamp not null default now(),
  updated_at timestamp not null default now()
);

create table if not exists protokol_zdjecia (
  id integer generated always as identity primary key,
  protokol_id integer not null references protokoly(id) on delete cascade,
  nazwa_pliku varchar(255) not null,
  sciezka_pliku text not null,
  created_at timestamp not null default now()
);

create table if not exists szablony (
  id integer generated always as identity primary key,
  nazwa varchar(255) not null,
  sciezka_pliku text not null,
  uploaded_by integer references uzytkownicy(id) on delete set null,
  created_at timestamp not null default now()
);

create table if not exists kategorie_usterek (
  id integer generated always as identity primary key,
  nazwa varchar(160) not null unique,
  opis text,
  created_at timestamp not null default now(),
  updated_at timestamp not null default now()
);

create table if not exists czynnosci_serwisowe (
  id integer generated always as identity primary key,
  nazwa varchar(180) not null unique,
  opis text,
  created_at timestamp not null default now(),
  updated_at timestamp not null default now()
);

create table if not exists szablony_przegladow (
  id integer generated always as identity primary key,
  nazwa varchar(180) not null,
  opis text,
  zawartosc text,
  nazwa_pliku varchar(255),
  sciezka_pliku text,
  mime_type varchar(180),
  uploaded_by integer references uzytkownicy(id) on delete set null,
  created_at timestamp not null default now(),
  updated_at timestamp not null default now()
);

create table if not exists definicje_czesci (
  id integer generated always as identity primary key,
  nazwa varchar(180) not null,
  jednostka varchar(30) not null default 'szt',
  kod varchar(80),
  opis text,
  created_at timestamp not null default now(),
  updated_at timestamp not null default now()
);

create table if not exists zgloszenia (
  id integer generated always as identity primary key,
  tytul varchar(220) not null,
  opis text,
  kontrahent_id integer references klienci(id) on delete set null,
  kategoria_usterki_id integer references kategorie_usterek(id) on delete set null,
  status text not null default 'Nowe' check (status in ('Nowe', 'W toku', 'Zamkniete')),
  priorytet text not null default 'Normalny' check (priorytet in ('Niski', 'Normalny', 'Wysoki')),
  created_at timestamp not null default now(),
  updated_at timestamp not null default now()
);

create table if not exists odczyty_licznikow (
  id integer generated always as identity primary key,
  lp integer not null,
  typ_licznika varchar(220) not null,
  rodzaj_licznika varchar(140),
  numer_licznika varchar(120) not null,
  kontrahent_id integer references klienci(id) on delete set null,
  rok integer not null,
  import_nazwa varchar(220),
  budynek_nazwa varchar(220),
  m01 varchar(40),
  m02 varchar(40),
  m03 varchar(40),
  m04 varchar(40),
  m05 varchar(40),
  m06 varchar(40),
  m07 varchar(40),
  m08 varchar(40),
  m09 varchar(40),
  m10 varchar(40),
  m11 varchar(40),
  m12 varchar(40),
  created_at timestamp not null default now(),
  updated_at timestamp not null default now()
);

create table if not exists ppoz_przeglady (
  id integer generated always as identity primary key,
  nazwa varchar(220) not null,
  data_przegladu date,
  kontrahent_id integer references klienci(id) on delete set null,
  kontrahent_nazwa varchar(220),
  budynek_nazwa varchar(220),
  opis text,
  status text not null default 'Planowany' check (status in ('Planowany', 'W realizacji', 'Zakończony')),
  created_at timestamp not null default now(),
  updated_at timestamp not null default now()
);

create table if not exists panel_notatki (
  id integer generated always as identity primary key,
  tytul varchar(220) not null,
  tresc text,
  termin_at timestamp,
  created_by integer references uzytkownicy(id) on delete set null,
  created_at timestamp not null default now(),
  updated_at timestamp not null default now()
);

create table if not exists odczyty_pliki_storage (
  kontrahent_nazwa varchar(220) primary key,
  bucket_name varchar(120) not null default 'eltreko-files',
  storage_path varchar(400) not null,
  file_name varchar(255) not null,
  updated_by_email varchar(220),
  created_at timestamp not null default now(),
  updated_at timestamp not null default now()
);

create table if not exists kontrahenci_meta (
  kontrahent_nazwa varchar(220) primary key,
  zlecajacy varchar(220),
  adres_protokolu text,
  updated_by_email varchar(220),
  created_at timestamp not null default now(),
  updated_at timestamp not null default now()
);

create index if not exists idx_protokoly_data on protokoly(data);
create index if not exists idx_protokoly_technik on protokoly(technik_id);
create index if not exists idx_klienci_nazwa on klienci(nazwa);
create index if not exists idx_zgloszenia_status on zgloszenia(status);
create index if not exists idx_odczyty_rok on odczyty_licznikow(rok);
create index if not exists idx_ppoz_data on ppoz_przeglady(data_przegladu);
create index if not exists idx_panel_notatki_termin on panel_notatki(termin_at);

drop trigger if exists trg_odczyty_pliki_storage_updated_at on odczyty_pliki_storage;
create trigger trg_odczyty_pliki_storage_updated_at before update on odczyty_pliki_storage for each row execute function ustaw_updated_at();

drop trigger if exists trg_kontrahenci_meta_updated_at on kontrahenci_meta;
create trigger trg_kontrahenci_meta_updated_at before update on kontrahenci_meta for each row execute function ustaw_updated_at();

drop trigger if exists trg_uzytkownicy_updated_at on uzytkownicy;
create trigger trg_uzytkownicy_updated_at before update on uzytkownicy for each row execute function ustaw_updated_at();

drop trigger if exists trg_klienci_updated_at on klienci;
create trigger trg_klienci_updated_at before update on klienci for each row execute function ustaw_updated_at();

drop trigger if exists trg_protokoly_updated_at on protokoly;
create trigger trg_protokoly_updated_at before update on protokoly for each row execute function ustaw_updated_at();

drop trigger if exists trg_kategorie_usterek_updated_at on kategorie_usterek;
create trigger trg_kategorie_usterek_updated_at before update on kategorie_usterek for each row execute function ustaw_updated_at();

drop trigger if exists trg_czynnosci_serwisowe_updated_at on czynnosci_serwisowe;
create trigger trg_czynnosci_serwisowe_updated_at before update on czynnosci_serwisowe for each row execute function ustaw_updated_at();

drop trigger if exists trg_szablony_przegladow_updated_at on szablony_przegladow;
create trigger trg_szablony_przegladow_updated_at before update on szablony_przegladow for each row execute function ustaw_updated_at();

drop trigger if exists trg_definicje_czesci_updated_at on definicje_czesci;
create trigger trg_definicje_czesci_updated_at before update on definicje_czesci for each row execute function ustaw_updated_at();

drop trigger if exists trg_zgloszenia_updated_at on zgloszenia;
create trigger trg_zgloszenia_updated_at before update on zgloszenia for each row execute function ustaw_updated_at();

drop trigger if exists trg_odczyty_licznikow_updated_at on odczyty_licznikow;
create trigger trg_odczyty_licznikow_updated_at before update on odczyty_licznikow for each row execute function ustaw_updated_at();

drop trigger if exists trg_ppoz_przeglady_updated_at on ppoz_przeglady;
create trigger trg_ppoz_przeglady_updated_at before update on ppoz_przeglady for each row execute function ustaw_updated_at();

drop trigger if exists trg_panel_notatki_updated_at on panel_notatki;
create trigger trg_panel_notatki_updated_at before update on panel_notatki for each row execute function ustaw_updated_at();
