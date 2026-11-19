# RDT — версия для GitHub Pages

Отдельная копия сайта на Astro, Preact и Tailwind. Содержит все исходники,
используемые изображения, шрифты, модели и JSON с данными. История и настройки
Git исходного репозитория сюда не переносились.

## Создание нового репозитория и первый push

1. Создай на нужном аккаунте GitHub пустой репозиторий без README и .gitignore.
2. В терминале выполни команды ниже. Замени `OWNER/REPOSITORY` адресом нового
   репозитория. Имя новой папки `ForGitHub` может отличаться от имени репозитория.

```bash
cd "/Users/iceone/RDT Official Site/Code/ForGitHub"
git init -b develop
git add .
git commit -m "Initial GitHub Pages version"
git remote add origin https://github.com/OWNER/REPOSITORY.git
git push -u origin develop
```

3. В новом репозитории открой **Settings → Pages → Build and deployment**
   и выбери **Source: GitHub Actions**.
4. Открой вкладку **Actions → Deploy to GitHub Pages**. Если первый запуск
   произошёл до включения Pages, нажми **Re-run all jobs**. Адрес опубликованного
   сайта появится в выполненном workflow и в Settings → Pages.

Workflow запускается при push в `develop`, `master` или `main`.
Публикуется состояние ветки, в которую сделан push. Для ручного запуска также
доступен `workflow_dispatch`, когда workflow есть в ветке по умолчанию.

## Адрес сайта

Workflow получает домен и базовый путь из настроек GitHub Pages автоматически.
Вписывать имя аккаунта или репозитория в исходники не требуется.

Поддерживаются:

- проектный адрес `https://OWNER.github.io/REPOSITORY/`;
- адрес аккаунта `https://OWNER.github.io/` для репозитория `OWNER.github.io`;
- собственный домен, настроенный в Settings → Pages.

Внутренние ссылки, языки RU/EN, меню, логотипы, JSON тарифов и карты используют
`import.meta.env.BASE_URL`. Импортируемые ассеты и worker MapLibre обрабатывает
Astro/Vite. Страница ошибки находится в `dist/404.html`, как требуется Pages.
Кнопки, ведущие на русскую страницу 404, используют адрес `404.html`.

## Локальный запуск

Нужен Node.js **22.23.4 или новее**. Workflow использует последнюю версию Node 22.

```bash
npm ci
npm run astro -- dev --background
```

Управление сервером:

```bash
npm run astro -- dev status
npm run astro -- dev logs
npm run astro -- dev stop
```

Сборка и просмотр результата:

```bash
npm run build
npm run preview
```

Обычная локальная сборка работает от `/`. Для проверки адреса с названием
репозитория можно задать те же переменные, которые использует workflow:

```bash
PAGES_SITE_URL=https://example.github.io PAGES_BASE_PATH=/rdt-demo npm run build
PAGES_SITE_URL=https://example.github.io PAGES_BASE_PATH=/rdt-demo npm run preview
```

В этом случае открывай `/rdt-demo/`, а не корень локального сервера.

## Что редактировать

- `src/components` — компоненты сайта, каждый в своей папке.
- `src/assets` — изображения, SVG, шрифты и данные 3D-сцен.
- `public/data/tariffs.json` — тарифы.
- `public/data/map` — геометрия дороги, альтернативный маршрут и тестовые рамки.
- `src/styles/global.css` — общие стили и переменные.
- `docs` — документация по переменным и карте.
- `.github/workflows/deploy.yml` — автоматическая публикация.

`node_modules`, `dist`, `.astro` и локальные `.env` исключены из Git.
GitHub Pages публикует статическую сборку; сервер Node.js на хостинге не нужен.

Официальные инструкции:
[Astro на GitHub Pages](https://docs.astro.build/en/guides/deploy/github/),
[настройка публикации Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).
