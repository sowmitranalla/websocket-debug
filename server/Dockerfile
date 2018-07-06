FROM keymetrics/pm2:latest-alpine


COPY index.js .
COPY package.json .

ENV NODE_ENV "production"

RUN npm install

CMD ["npm", "start"]

EXPOSE 3000