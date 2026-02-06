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

## 📦 Installation & Setup

### 1. Förberedelser
Se till att du har [Docker Desktop](https://www.docker.com/products/docker-desktop/) installerat.

### 2. Klona repot
```bash
git clone [https://github.com/dittanvandarnamn/personal-budget-tracker.git](https://github.com/dittanvandarnamn/personal-budget-tracker.git)
cd personal-budget-tracker