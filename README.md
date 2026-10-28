# 💰 Smart Personal Budget Tracker

## Beskrivning
En modern webbapplikation för att hantera personliga utgifter med kraftfull AI-integration. Applikationen hjälper användare att få kontroll över sin ekonomi genom automatiserad kategorisering och tydlig visualisering.

## 🚀 Funktioner
* **Hantering av utgifter:** Lägg till, redigera och ta bort transaktioner med beskrivning och belopp.
* **Smart Kategorisering:** Lokalt körd AI (Ollama: llama3.2 för kategorier, minicpm-v för kvittobilder) för att automatiskt föreslå kategorier baserat på transaktionstext.
* **Full Containerisering:** Hela stacken (Frontend, Backend, DB, AI) körs i Docker för enkel setup och deployment.
* **Budgetöversikt:** Se hur mycket du spenderar per kategori i realtid.
* **Admin-verktyg:** pgAdmin i utvecklingsmiljön (`docker compose --profile dev up`).

## 🛠 Tekniker
* **Frontend:** [React](https://react.dev/) (Vite, TypeScript)
* **Backend:** [.NET 10](https://dotnet.microsoft.com/) (Web API, Entity Framework Core)
* **Databas:** [PostgreSQL](https://www.postgresql.org/)
* **AI Engine:** [Ollama](https://ollama.com/) (llama3.2 och minicpm-v, körs lokalt)
* **Containerisering:** [Docker & Docker Compose](https://www.docker.com/)
* **Deployment:** Ubuntu VPS med GitHub Actions (CI/CD)

## 📦 Installation & Setup

### 1. Förberedelser
Se till att du har [Docker Desktop](https://www.docker.com/products/docker-desktop/) installerat.

### 2. Klona repot
```bash
git clone https://github.com/webcrunch/personal-budget-tracker.git
cd personal-budget-tracker
```

### 3. Miljövariabler
Kopiera exempelfilen och fyll i ett lösenord för databasen (samma i POSTGRES_PASSWORD och CONNECTION_STRING):
```bash
cp .env.example .env
```
Compose stoppar med ett tydligt fel om ett lösenord saknas; det finns inga standardlösenord längre.

### 4. Starta
```bash
docker compose up --build              # API på http://localhost:8080, frontend på http://localhost:3002
docker compose --profile dev up        # samma, plus pgAdmin på http://localhost:5050
```
Portarna är bundna till 127.0.0.1 och nås bara från den egna datorn.

## 🔒 Produktion
* Hela sajten (UI och API) ligger bakom inloggning i Traefik (`basicAuth`). Användare och lösenordshash ligger i Vault på `kv/budget-tracker`, fältet `basic_auth` (skapad med `htpasswd -nbB <user> <lösenord>`).
* Inga portar publiceras mot internet; all trafik går via Traefik.
* Deploy sker vid push till `main` efter att backend och frontend har byggt i CI.
