# Soltunergy: приём заявок (Supabase + Telegram)

Как это работает:

1. Клиент отправляет форму контактов или опрос Find Your Perfect Solar.
2. Сайт передаёт заявку и файлы в функцию `submit-lead` на Supabase.
3. Функция проверяет данные и сохраняет заявку в таблицу `leads`. Файлы (счета, фото крыши) она кладёт в закрытое хранилище `lead-files`.
4. Команда получает сообщение в Telegram, вложения приходят туда же.
5. Клиент видит номер заявки `SOL-YYMMDD-XXXX`. Номер выдаёт сервер, и показывается он только после успешного сохранения.

Пока ключи не вставлены в `soltunergy-site/config.js` (шаг 5), сайт работает в демо-режиме: заявки никуда не уходят.

Файлы:
- `schema.sql` — таблица `leads` и закрытое хранилище `lead-files`.
- `submit-lead/index.ts` — код функции.
- `../soltunergy-site/config.js` — адрес функции и публичный ключ для сайта.

---

## 1. Проект Supabase
1. На **supabase.com** нажмите **New project**. Name: `soltunergy`, Region: **Southeast Asia (Singapore)** — ближе всего к Таиланду.
2. Откройте **SQL Editor** → **New query**, вставьте весь `schema.sql` и нажмите **Run**. Должно появиться «Success».

## 2. Бот Telegram
1. В Telegram откройте **@BotFather** и отправьте команду `/newbot`. Придумайте имя и сохраните **токен**: строка вида `123456:ABC...`.
2. Создайте группу для заявок и добавьте в неё бота.
3. Напишите в группе любое сообщение. Затем откройте в браузере `https://api.telegram.org/bot<ТОКЕН>/getUpdates` и найдите `"chat":{"id":-100...}`. Это **chat_id** (у групп он отрицательный).

## 3. Функция submit-lead
1. В Supabase откройте **Edge Functions** → **Deploy a new function** → **Via Editor**.
2. Назовите функцию ровно `submit-lead`, вставьте весь `submit-lead/index.ts` и нажмите **Deploy**.
3. Откройте **Edge Functions** → **Secrets** и добавьте секреты:

| Имя | Значение |
|---|---|
| `TELEGRAM_BOT_TOKEN` | токен из шага 2 |
| `TELEGRAM_CHAT_ID` | chat_id из шага 2 |
| `ALLOWED_ORIGINS` | адреса сайта через запятую, например `https://soltunergy.co.th,https://www.soltunergy.co.th`. Пока сайт не опубликован, можно оставить пустым: тогда разрешены все адреса |
| `IP_SALT` | любая длинная случайная строка |

`SUPABASE_URL` и `SUPABASE_SERVICE_ROLE_KEY` добавлять не нужно: Supabase подставляет их сам.

## 4. Проверка
Откройте **Project Settings** → **API** и скопируйте **Project URL** и ключ **anon public**. Затем в терминале выполните:

```bash
curl -X POST "https://<проект>.supabase.co/functions/v1/submit-lead" -H "Authorization: Bearer <anon-ключ>" -F source=contact -F name=Тест -F contact=+66812345678 -F consent=true
```

Ответ должен быть `{"ok":true,"ref":"SOL-..."}`. Сообщение придёт в Telegram, строка появится в **Table Editor** → `leads`.

## 5. Подключить сайт
Заполните `soltunergy-site/config.js`:

```js
window.SOL_CONFIG = {
  submitUrl: 'https://<проект>.supabase.co/functions/v1/submit-lead',
  anonKey: 'eyJhbGciOi...'   // anon public, НЕ service_role
};
```

---

## Работа с заявками
- **Где смотреть.** Заявки лежат в **Table Editor** → `leads`, новые сверху.
- **Статусы.** Меняйте поле `status` по ходу работы: `new` → `reviewing` → `survey` → `quoted` → `closed`. Поле `updated_at` обновляется само. Комментарии инженера пишите в `engineer_notes`.
- **Файлы.** Они в **Storage** → `lead-files` → папка с номером заявки. Хранилище закрытое: файлы видят только сотрудники, вошедшие в панель Supabase.
- **Ответы опроса.** Хранятся в поле `answers`:
  - `answers.profile` — текст на русском, его удобно читать;
  - `answers.answers` — номера выбранных вариантов, их удобно обрабатывать программно.
- **Версия правил.** Поле `rules_version` сейчас равно `none`: правила подбора инженер ещё не утвердил, поэтому каждая заявка идёт на ручную оценку.

## Что проверяется на сервере
- **Обязательные поля.** Нужны имя, корректный телефон или email и согласие PDPA.
- **Файлы.** Не больше 5 штук, только JPG, PNG или PDF, каждый до 10 МБ.
- **Антиспам.** Скрытое поле-ловушка для ботов и не больше 5 заявок за 30 минут с одного IP. Сам IP не хранится, в базу пишется только его хеш с солью.
- **Доступ к данным.** Для таблицы и хранилища включён RLS, публичного доступа нет. Сайт пишет только через функцию.
- **Telegram.** Если Telegram недоступен, заявка всё равно сохраняется, а ошибка видна в **Edge Functions** → `submit-lead` → **Logs**.
