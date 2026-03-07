FROM node:20-alpine

WORKDIR /app
ARG LEGACY_BACKEND_URL=http://backend:4000
ENV LEGACY_BACKEND_URL=$LEGACY_BACKEND_URL

COPY package.json ./
RUN npm install

COPY . .

RUN rm -rf .next && npm run build

EXPOSE 3000

CMD ["npm", "run", "start"]
