FROM node:22.23.3-slim
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3333
CMD [\"npm\", \"start\"]