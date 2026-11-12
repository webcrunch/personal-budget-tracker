# 💰 Smart Personal Budget Tracker

## Beskrivning
En modern webbapplikation för att hantera personliga utgifter med kraftfull AI-integration. Applikationen hjälper användare att få kontroll över sin ekonomi genom automatiserad kategorisering och tydlig visualisering.

## 🚀 Funktioner
* **Hantering av utgifter:** Lägg till, redigera och ta bort transaktioner med beskrivning och belopp.
* **Smart Kategorisering:** Lokalt körd AI (Ollama/Mistral) för att automatiskt föreslå kategorier baserat på transaktionstext.
* **Full Containerisering:** Hela stacken (Frontend, Backend, DB, AI) körs i Docker för enkel setup och deployment.
* **Budgetöversikt:** Se hur mycket du spenderar per kategori i realtid.
* **Admin-verktyg:** Inbyggd pgAdmin för enkel databashantering i utvecklingsmiljön.

## 🛠 Tekniker
* **Frontend:** [React](https://react.dev/) (Vite, TypeScript)
* **Backend:** [.NET 9](https://dotnet.microsoft.com/) (Web API, Entity Framework Core)
* **Databas:** [PostgreSQL](https://www.postgresql.org/)
* **AI Engine:** [Ollama](https://ollama.com/) (Kör Mistral-modellen lokalt)
* **Containerisering:** [Docker & Docker Compose](https://www.docker.com/)
* **Deployment:** Ubuntu VPS med GitHub Actions (CI/CD)

## 🔐 Inloggning
Alla `/api`-anrop kräver inloggning med samma magiska länk via Telegram som admin på jarllindquist.com:

1. Frontend ber n8n (`request-magic-link`, med `app: "budget"`) skicka en länk till Telegram och väntar (`check-login-status`) tills den är godkänd. Meddelandet säger att det gäller Budget, och n8n skickar högst en länk per minut.
2. Sessionen skickas som `X-Admin-Session` med varje anrop.
3. Backend (`SessionAuthMiddleware`) frågar n8n-webhooken `session-check` om sessionen är giltig för `budget`, och sparar svaret en minut. En session från ett annat system, till exempel cv-admin, gäller inte här. Går n8n inte att nå nekas anropet. `/health` är öppen.

Webhookarna ligger i det gemensamma inloggningsflödet i n8n. Adressen kan ändras med `SESSION_CHECK_URL` och systemnamnet med `SESSION_APP`. Lokalt kan kontrollen stängas av med `DISABLE_AUTH=true`, men bara i Development.

## 📦 Installation & Setup

### 1. Förberedelser
Se till att du har [Docker Desktop](https://www.docker.com/products/docker-desktop/) installerat.

### 2. Klona repot
```bash
git clone https://github.com/webcrunch/personal-budget-tracker.git
cd personal-budget-tracker
```

### 3. Lösenord i `.env`
Inga lösenord finns i koden. Kopiera `.env.example` till `.env` och fyll i `POSTGRES_PASSWORD` (och samma lösenord i `CONNECTION_STRING`). Compose startar inte utan dem. Vill du slippa inloggningen lokalt, avkommentera `DISABLE_AUTH=true` (gäller bara i Development).

### 4. Starta
```bash
docker network create ai-bridge   # en gång; nätverket mot Ollama
docker compose up -d --build
```
Frontend: http://localhost:3002, API: http://localhost:8080. Portarna är bundna till `127.0.0.1`, så de syns bara på din egen dator.

pgAdmin finns bara lokalt, i `docker-compose.dev.yml` (sätt `PGADMIN_PASSWORD` i `.env`):
```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d
```
Sedan http://localhost:5050.

## 🛡️ Säkerhet i drift
- Alla `/api`-anrop kräver inloggning (se ovan).
- Frontendens nginx skickar en Content-Security-Policy: bara egna skript, och anrop bara till API:t och n8n-webhookarna för inloggningen. Det skyddar sessionen i localStorage mot injicerade skript.
- Databasen, API:t och frontend publicerar inga portar utåt, eftersom de är bundna till `127.0.0.1`. Docker-portar går annars förbi ufw. Trafiken utifrån går via Traefik.
- API-containern kör som en vanlig användare, inte som root.
- Lösenorden kommer från Vault (`kv/budget-tracker`), som deployen skriver till `.env` på servern.
- Pull requests byggs och kontrolleras i CI, och bara main deployas.