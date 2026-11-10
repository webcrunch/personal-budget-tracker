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

1. Frontend ber n8n (`request-magic-link`) skicka en länk till Telegram och väntar (`check-login-status`) tills den är godkänd.
2. Sessionen skickas som `X-Admin-Session` med varje anrop.
3. Backend (`SessionAuthMiddleware`) frågar n8n-webhooken `session-check` om sessionen är giltig, och sparar svaret en minut. Går n8n inte att nå nekas anropet. `/health` är öppen.

Webhooken finns i `n8n/session-check-workflow.json` och importeras i n8n. Adressen kan ändras med `SESSION_CHECK_URL`. Lokalt kan kontrollen stängas av med `DISABLE_AUTH=true`, men bara i Development.

## 📦 Installation & Setup

### 1. Förberedelser
Se till att du har [Docker Desktop](https://www.docker.com/products/docker-desktop/) installerat.

### 2. Klona repot
```bash
git clone [https://github.com/dittanvandarnamn/personal-budget-tracker.git](https://github.com/dittanvandarnamn/personal-budget-tracker.git)
cd personal-budget-tracker