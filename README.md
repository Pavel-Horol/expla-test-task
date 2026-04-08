# Expla Chat

Бекенд та фронтенд для чату на базі Nx (NestJS + Angular) з WebSocket реальним часом та MongoDB.

**🚀 Швидкий старт (Локально)**

1. Встановити залежності:

```sh
npm install
```

2. Підняти MongoDB (рекомендовано для коректної роботи):

```sh
docker pull mongo:latest
```

```sh
docker run -d --name mongodb \
  -p 27017:27017 \
  -e MONGO_INITDB_ROOT_USERNAME=admin \
  -e MONGO_INITDB_ROOT_PASSWORD=password \
  -v mongo_data:/data/db \
  mongo:latest
```

3. Запустити API та Web:

```sh
npm exec nx serve api
```

```sh
npm exec nx serve web
```

Після запуску:

- API: http://localhost:3000
- Web: http://localhost:4200

**🛠 Рекомендовано**

Для найкращого досвіду використовуйте MongoDB (значення `DB_TYPE=mongo` у `.env`).

**🌍 Деплой (Live)**

Чат задеплоєний тут:

- https://expla-chat-api-1.onrender.com/

Після «сну» бекенду потрібен час на підняття, тому перший запит може бути повільним.

Якщо щось не так — напишіть мені, я перевірю і, за потреби, задеплою вручну.
