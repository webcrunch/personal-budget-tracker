# Smart Personal Budget / Utgiftshanterare

## Beskrivning

En webbapplikation för att hantera personliga utgifter. Användare kan lägga till, kategorisera och se en översikt över sina utgifter.

## Funktioner

* Lägg till utgifter med beskrivning och belopp.
* Kategorisera utgifter.
* Se en lista över alla utgifter.
* Filtrera utgifter efter kategori.
* [Framtida] Användarautentisering.
* [Framtida] Visuell representation av utgifter (diagram).
* [Framtida] AI-driven kategorisering av utgifter.

## Tekniker

* Frontend: [React](https://react.dev/)
* Backend: [.NET Core](https://dotnet.microsoft.com/)
* Databas: [PostgreSQL](https://www.postgresql.org/)
* Versionshantering: [Git](https://git-scm.com/)
* CI/CD: [GitHub Actions](https://github.com/features/actions)
* Containerisering: [Docker](https://www.docker.com/)
* Deployment: Egen Server (Ubuntu)

## Installation

1.  Klona repot: `git clone https://github.com/dittanvandarnamn/personal-budget-tracker.git`
2.  Gå till projektmappen: `cd personal-budget-tracker`
3.  Kör Docker Compose: `docker-compose up -d`
4.  Öppna appen i din webbläsare på `http://din-servers-ip:3000`

## CI/CD

Projektet har en automatiserad CI/CD-pipeline via GitHub Actions. Varje push till `main`-grenen triggar en bygg- och testprocess för både frontend och backend, samt bygger och pushar Docker-images.  Pipelinen konfigureras även för att automatiskt deploya till en egen server vid godkänd build.

## Framtida förbättringar

* Implementera användarautentisering.
* Skapa en visuell representation av utgifter (diagram).
* Integrera en AI-modell för automatisk kategorisering av utgifter.

## Författare

[Jarl Lindquist](https://github.com/webcrunch)
