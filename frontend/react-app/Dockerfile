# Steg 1: Byggstadiet
FROM node:24-alpine AS build

WORKDIR /app

# Kopiera beroenden och installera exakt det som står i package-lock.json
COPY package*.json ./
RUN npm ci

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

# Nginx-konfigurationen i repot: React Router-rutter och säkerhetsheaders (CSP med mera)
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]