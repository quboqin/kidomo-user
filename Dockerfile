FROM node:20.15.0-alpine
RUN npm install -g npm@10.7.0
RUN mkdir -p /var/www/user
WORKDIR /var/www/user
ADD . /var/www/user
RUN npm install
CMD npm run build && npm run start:prod
