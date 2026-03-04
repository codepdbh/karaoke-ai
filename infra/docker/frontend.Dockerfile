FROM node:20-alpine

WORKDIR /app/frontend

COPY frontend/package.json /app/frontend/package.json
RUN npm install

COPY frontend /app/frontend

CMD ["npm", "run", "dev", "--", "--hostname", "0.0.0.0"]
