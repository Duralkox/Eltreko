# EltrekoAPP

Nowoczesna aplikacja wewnętrzna do protokołów i dokumentów technicznych.

## Stos technologiczny
- Frontend: Next.js + React + TailwindCSS
- Backend: Node.js + Express
- Baza danych: MySQL/MariaDB (XAMPP)
- Uwierzytelnianie: Supabase Auth + role w lokalnej bazie
- Tryb aplikacyjny: PWA

## Struktura
- `frontend` - aplikacja Next.js
- `backend` - API Express
- `database` - schemat i dane startowe MySQL
- `przyklady` - przykładowe dane i szablony

## Konfiguracja

Utwórz `backend/.env`:

```env
PORT=5000
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=eltrekoapp
JWT_SECRET=zmien_to_na_silny_sekret
UPLOAD_DIR=uploads
SMTP_HOST=smtp.twojadomena.pl
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=powiadomienia@twojadomena.pl
SMTP_PASS=twoje_haslo_smtp
MAIL_FROM=EltrekoAPP <powiadomienia@twojadomena.pl>
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key
```

Utwórz `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## XAMPP i baza
1. Uruchom `Apache` i `MySQL` w XAMPP.
2. Otwórz `http://localhost/phpmyadmin`.
3. Utwórz bazę `eltrekoapp` (utf8mb4_polish_ci).
4. Importuj `database/schema.sql`.
5. Importuj `database/seed.sql`.

## Start aplikacji

Backend:

```bash
cd backend
npm install
npm run dev
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

## Logowanie testowe
- Użytkownicy logują się przez konta utworzone w `Supabase Auth`
- Email użytkownika w Supabase musi zgadzać się z emailem w lokalnej tabeli `uzytkownicy`
