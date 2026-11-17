// Soltunergy — Edge Function "submit-lead"
// Принимает заявку с сайта (multipart/form-data), проверяет её на сервере,
// сохраняет в таблицу leads, кладёт файлы в закрытый bucket lead-files
// и уведомляет команду в Telegram. Возвращает { ok: true, ref }.
//
// Секреты (Edge Functions → Secrets):
//   TELEGRAM_BOT_TOKEN  — токен бота от @BotFather
//   TELEGRAM_CHAT_ID    — id чата/группы, куда слать заявки
//   ALLOWED_ORIGINS     — адреса сайта через запятую, напр. https://soltunergy.co.th,https://www.soltunergy.co.th
//   IP_SALT             — любая длинная случайная строка (для хеширования IP)
// SUPABASE_URL и SUPABASE_SERVICE_ROLE_KEY Supabase подставляет сам.

import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const MAX_FILES = 5;
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const FILE_TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "application/pdf": "pdf" };
const RATE_LIMIT = 5;               // не больше 5 заявок
const RATE_WINDOW_MIN = 30;         // за 30 минут с одного IP
const STATUS_URL_HINT = "Table Editor → leads";

const env = (k: string) => Deno.env.get(k) ?? "";
const allowed = env("ALLOWED_ORIGINS").split(",").map((s) => s.trim()).filter(Boolean);

function cors(origin: string | null): Record<string, string> {
  // Пустой ALLOWED_ORIGINS = разрешить всем (удобно на этапе настройки, на проде заполните).
  const ok = !allowed.length || (origin && allowed.includes(origin));
  return {
    "Access-Control-Allow-Origin": ok ? (origin ?? "*") : allowed[0],
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
    "Vary": "Origin",
  };
}
const json = (body: unknown, status: number, h: Record<string, string>) =>
  new Response(JSON.stringify(body), { status, headers: { ...h, "Content-Type": "application/json" } });

const str = (v: FormDataEntryValue | null, max: number) =>
  typeof v === "string" ? v.trim().slice(0, max) : "";

function makeRef(): string {
  const d = new Date();
  const ymd = `${String(d.getUTCFullYear()).slice(2)}${String(d.getUTCMonth() + 1).padStart(2, "0")}${String(d.getUTCDate()).padStart(2, "0")}`;
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const rnd = crypto.getRandomValues(new Uint8Array(4));
  return `SOL-${ymd}-${[...rnd].map((b) => alphabet[b % alphabet.length]).join("")}`;
}

async function sha256(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

const esc = (s: string) => s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]!));

async function telegram(method: string, body: FormData | Record<string, unknown>) {
  const token = env("TELEGRAM_BOT_TOKEN");
  if (!token || !env("TELEGRAM_CHAT_ID")) return;
  const init: RequestInit = body instanceof FormData
    ? { method: "POST", body }
    : { method: "POST", body: JSON.stringify(body), headers: { "Content-Type": "application/json" } };
  const r = await fetch(`https://api.telegram.org/bot${token}/${method}`, init);
  if (!r.ok) console.error("telegram", method, r.status, await r.text());
}

Deno.serve(async (req) => {
  const h = cors(req.headers.get("origin"));
  if (req.method === "OPTIONS") return new Response("ok", { headers: h });
  if (req.method !== "POST") return json({ ok: false, error: "method" }, 405, h);

  let form: FormData;
  try { form = await req.formData(); } catch { return json({ ok: false, error: "bad_form" }, 400, h); }

  // --- антиспам: скрытое поле (honeypot) должно быть пустым
  if (str(form.get("website"), 200)) return json({ ok: true, ref: makeRef() }, 200, h);

  // --- проверка полей
  const source = str(form.get("source"), 10);
  const name = str(form.get("name"), 120);
  const contact = str(form.get("contact"), 160);
  const consent = str(form.get("consent"), 5) === "true";
  if (!["contact", "quiz"].includes(source)) return json({ ok: false, error: "source" }, 400, h);
  if (!name || contact.length < 3) return json({ ok: false, error: "required" }, 400, h);
  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact);
  const isPhone = /^[+\d][\d\s()\-]{6,}$/.test(contact);
  if (!isEmail && !isPhone) return json({ ok: false, error: "contact" }, 400, h);
  if (!consent) return json({ ok: false, error: "consent" }, 400, h);

  let answers: unknown = null;
  const rawAnswers = str(form.get("answers"), 8000);
  if (rawAnswers) { try { answers = JSON.parse(rawAnswers); } catch { return json({ ok: false, error: "answers" }, 400, h); } }

  const files = form.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length > MAX_FILES) return json({ ok: false, error: "files_count" }, 400, h);
  for (const f of files) {
    if (!FILE_TYPES[f.type]) return json({ ok: false, error: "file_type" }, 400, h);
    if (f.size > MAX_FILE_BYTES) return json({ ok: false, error: "file_size" }, 400, h);
  }

  const db = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), { auth: { persistSession: false } });

  // --- антиспам: ограничение частоты по хешу IP
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim();
  const ipHash = ip ? await sha256(ip + env("IP_SALT")) : null;
  if (ipHash) {
    const since = new Date(Date.now() - RATE_WINDOW_MIN * 60_000).toISOString();
    const { count } = await db.from("leads").select("id", { count: "exact", head: true })
      .eq("ip_hash", ipHash).gte("created_at", since);
    if ((count ?? 0) >= RATE_LIMIT) return json({ ok: false, error: "rate_limit" }, 429, h);
  }

  // --- файлы в закрытое хранилище
  const ref = makeRef();
  const paths: string[] = [];
  for (const [i, f] of files.entries()) {
    const path = `${ref}/${i + 1}.${FILE_TYPES[f.type]}`;
    const { error } = await db.storage.from("lead-files").upload(path, f, { contentType: f.type });
    if (error) { console.error("upload", error); return json({ ok: false, error: "upload" }, 500, h); }
    paths.push(path);
  }

  // --- запись в базу
  const row = {
    ref, source, name, contact,
    lang: str(form.get("lang"), 40) || null,
    site_lang: str(form.get("site_lang"), 5) || null,
    area: str(form.get("area"), 200) || null,
    message: str(form.get("message"), 3000) || null,
    answers,
    rules_version: str(form.get("rules_version"), 40) || null,
    files: paths,
    consent: true,
    ip_hash: ipHash,
    user_agent: str(req.headers.get("user-agent"), 300) || null,
  };
  const { error: insErr } = await db.from("leads").insert(row);
  if (insErr) { console.error("insert", insErr); return json({ ok: false, error: "db" }, 500, h); }

  // --- уведомление команды (ошибка Telegram не ломает заявку: она уже сохранена)
  try {
    const lines = [
      `<b>Новая заявка ${ref}</b> · ${source === "quiz" ? "опрос Find Your Perfect Solar" : "форма контактов"}`,
      `👤 ${esc(name)}`,
      `📞 ${esc(contact)}`,
      row.lang ? `🗣 ${esc(row.lang)} (сайт: ${row.site_lang ?? "?"})` : "",
      row.area ? `📍 ${esc(row.area)}` : "",
      row.message ? `💬 ${esc(row.message)}` : "",
    ];
    if (answers && typeof answers === "object" && Array.isArray((answers as { profile?: unknown }).profile)) {
      lines.push("", "<b>Energy Profile:</b>");
      for (const p of (answers as { profile: { q: string; a: string }[] }).profile) {
        lines.push(`• ${esc(String(p.q))}: ${esc(String(p.a))}`);
      }
    }
    if (paths.length) lines.push("", `📎 Файлов: ${paths.length} (ниже и в Storage → lead-files/${ref})`);
    lines.push("", `Статус: new · ${STATUS_URL_HINT}`);
    await telegram("sendMessage", {
      chat_id: env("TELEGRAM_CHAT_ID"), parse_mode: "HTML", disable_web_page_preview: true,
      text: lines.filter((l, i, a) => l !== "" || a[i - 1] !== "").join("\n").slice(0, 4000),
    });
    for (const [i, f] of files.entries()) {
      const fd = new FormData();
      fd.append("chat_id", env("TELEGRAM_CHAT_ID"));
      fd.append("caption", `${ref} · файл ${i + 1}`);
      fd.append("document", f, `${ref}-${i + 1}.${FILE_TYPES[f.type]}`);
      await telegram("sendDocument", fd);
    }
  } catch (e) { console.error("notify", e); }

  return json({ ok: true, ref }, 200, h);
});
