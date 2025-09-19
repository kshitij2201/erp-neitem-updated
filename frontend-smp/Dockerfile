FROM node:lts-alpine as build
WORKDIR /app

COPY package*.json ./
RUN npm install --legacy-peer-deps
COPY . .
RUN npm run build   # Vite generates /dist folder

FROM nginx:stable-alpine
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 5174
CMD ["nginx", "-g", "daemon off;"]
