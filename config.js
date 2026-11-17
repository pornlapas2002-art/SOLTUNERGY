/* Настройки приёма заявок.
   Пока submitUrl пустой, сайт работает в демо-режиме: заявка никуда не уходит,
   номер генерируется в браузере. Как заполнить — см. soltunergy-backend/README.md.

   anonKey — это публичный ключ "anon public" из Supabase (Project Settings → API).
   Его можно хранить на сайте. НИКОГДА не вставляйте сюда service_role ключ. */
window.SOL_CONFIG = {
  submitUrl: '',   // https://<ваш-проект>.supabase.co/functions/v1/submit-lead
  anonKey: ''      // eyJhbGciOi...
};
