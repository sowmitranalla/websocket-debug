FROM keymetrics/pm2:latest-alpine


COPY index.js .
COPY package.json .
# COPY pm2.json .

ENV NODE_ENV "production"

# RUN npm install pm2 -g
RUN npm install

CMD ["npm", "start"]

EXPOSE 3000