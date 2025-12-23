FROM node:20-bullseye
WORKDIR /usr/src/mediasoup-signal
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY . .
CMD ["node", "dist/index.js"]
