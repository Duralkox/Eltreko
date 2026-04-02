# Backend EltrekoAPP

Backend działa na MySQL/MariaDB (np. XAMPP).

## Uruchomienie

```bash
npm install
npm run dev
```

## Silnik bazy

Backend obsługuje teraz dwa tryby:

- `DB_CLIENT=mysql` - obecny lokalny MySQL/MariaDB
- `DB_CLIENT=postgres` - Supabase Postgres przez `DATABASE_URL`

Przy Postgres/Supabase:

- ustaw `DB_CLIENT=postgres`
- ustaw `DATABASE_URL` z Supabase
- opcjonalnie zostaw `DB_SSL=true`

Schemat pod Supabase jest w:

- `database/schema.supabase.sql`

Skrypt migracji danych z MySQL do Postgresa jest w:

- `backend/scripts/migrate-mysql-to-postgres.js`

## Główne trasy API

- `GET /api/auth/sesja`
- `GET /api/dashboard`
- `GET|POST|PUT|DELETE /api/protokoly`
- `POST /api/protokoly/:id/zdjecia`
- `GET /api/protokoly/:id/eksport?typ=pdf`
- `GET|POST|PUT|DELETE /api/klienci`
- `GET|POST|DELETE /api/szablony`
- `GET /api/technicy`
- `GET|POST|PUT|DELETE /api/uzytkownicy` (Administrator)

## Auth

- logowanie odbywa się przez `Supabase Auth`
- reset hasła odbywa się przez `Supabase Auth`
- lokalna tabela `uzytkownicy` przechowuje role i dane użytkownika
- lokalne `haslo_hash` są tylko techniczne i nie służą już do logowania
- email użytkownika w Supabase musi zgadzać się z emailem w lokalnej bazie
