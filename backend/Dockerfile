FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src
# Kopiera projektfilen först för att dra nytta av Docker-cachen
# Kontexten för bygget är ./backend, så vi kopierar ExpenseApi/ExpenseApi.csproj
COPY ExpenseApi/ExpenseApi.csproj ./ExpenseApi/
RUN dotnet restore ./ExpenseApi/ExpenseApi.csproj

# Kopiera resten av applikationsfilerna till projektkatalogen
COPY ExpenseApi/. ./ExpenseApi/

# Gå till projektkatalogen för att publicera
WORKDIR /src/ExpenseApi
RUN dotnet publish -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:9.0
WORKDIR /app
COPY --from=build /app/publish ./

# Kopiera entrypoint-skriptet och gör det körbart
COPY ExpenseApi/entrypoint.sh .
RUN chmod +x entrypoint.sh

# Använd entrypoint-skriptet för att starta containern
ENTRYPOINT ["./entrypoint.sh"]