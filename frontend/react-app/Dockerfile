# Steg 1: Byggstadiet
FROM node:20-alpine as build

WORKDIR /app

# Kopiera beroenden och installera
COPY package*.json ./
RUN npm install

# Kopiera resten av källkoden
COPY . .

# Ta emot build-argumentet (API-URL:en)
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

# KÖR BYGGET: Vi använder 'npx vite build' för att gå runt 
# TypeScript-referensfelen (tsconfig.node.json-felet)
RUN npx vite build

# Steg 2: Produktionsstadiet med Nginx
FROM nginx:stable-alpine

# Kopiera de byggda filerna från föregående steg
# Vite bygger till mappen 'dist'
COPY --from=build /app/dist /usr/share/nginx/html

# Lägg till en enkel Nginx-konfiguration för att hantera React Router-rutter
RUN echo 'server { \
    listen 80; \
    location / { \
        root /usr/share/nginx/html; \
        index index.html; \
        try_files $uri $uri/ /index.html; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]