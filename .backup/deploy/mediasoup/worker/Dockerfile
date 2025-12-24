FROM node:20-bullseye
WORKDIR /usr/src/mediasoup-worker
# For production builds you may need additional native build dependencies
# (libc6-dev, build-essential, python3, etc.). Keep this image minimal here.
COPY package.json package-lock.json ./
RUN npm ci --only=production
COPY . .
CMD ["node", "dist/worker.js"]
