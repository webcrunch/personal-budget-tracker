# Steg 1: Bygg Vite + React-applikationen
FROM node:23-alpine AS build

# Sätt arbetsmappen
WORKDIR /app

# Deklarera VITE_API_URL som ett bygg-argument
ARG VITE_API_URL
# Gör VITE_API_URL tillgänglig som miljövariabel under byggfasen
ENV VITE_API_URL=$VITE_API_URL

# Kopiera package.json och package-lock.json (eller yarn.lock)
COPY package.json ./

# Installera beroenden
RUN npm install

# Kopiera resten av koden
COPY . .

# Bygg React-applikationen för produktion
RUN npm run build

# Steg 2: Servera de statiska filerna med Nginx
FROM nginx:alpine

# Kopiera Nginx-konfigurationsfilen
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Kopiera de byggda filerna från föregående steg till Nginx statiska mapp
COPY --from=build /app/dist /usr/share/nginx/html

# Exponera port 80 (standard HTTP-port)
EXPOSE 80

# Kommando för att starta Nginx
CMD ["nginx", "-g", "daemon off;"]
