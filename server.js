/* ==========================================================================
   Florence Event Design — icerik yonetim paneli (admin) sunucusu.
   Statik siteyi oldugu gibi sunar (index.html, assets/, vb.) ve /admin
   altinda korumali bir yonetim paneli + API sunar.
   ========================================================================== */
"use strict";

const path = require("path");
const fs = require("fs");
const express = require("express");
const cookieSession = require("cookie-session");
const multer = require("multer");
const bcrypt = require("bcryptjs");
const apn = require("apn");

const ROOT = __dirname;
const CONFIG_PATH = path.join(ROOT, "admin-config.json");
const CONTENT_PATH = path.join(ROOT, "assets", "content.json");
const UPLOAD_DIR = path.join(ROOT, "assets", "img", "uploads");
const DEVICES_PATH = path.join(ROOT, "devices.json");

if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

function loadConfig() {
  return JSON.parse(fs.readFileSync(CONFIG_PATH, "utf-8"));
}

const config = loadConfig();
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: "5mb" }));
/* Oturum verisi (sadece "girdi mi" bilgisi) imzali bir cerezde tutulur —
   sunucu hafizasinda (MemoryStore) TUTULMAZ. Render gibi platformlarda
   sunucu surecinin herhangi bir yeniden baslatmasi (deploy, uyku/uyanma)
   hafizadaki oturumlari sifirlardi; cerez tabanli oturum bu yeniden
   baslatmalara karsi dayanikli, kullanici tekrar giris yapmak zorunda
   kalmiyor. */
app.use(
  cookieSession({
    name: "fed_session",
    secret: config.sessionSecret || "florence-event-fallback-secret-change-me",
    maxAge: 1000 * 60 * 60 * 8 // 8 saat
  })
);

/* ---- Kimlik dogrulama ---- */
function requireAuth(req, res, next) {
  if (req.session && req.session.authenticated) return next();
  res.status(401).json({ ok: false, error: "Oturum acilmamis." });
}

app.post("/api/login", (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ ok: false, error: "Kullanici adi ve sifre gerekli." });
  }
  const cfg = loadConfig();
  const validUser = username === cfg.username;
  const validPass = validUser && bcrypt.compareSync(password, cfg.passwordHash);
  if (!validUser || !validPass) {
    return res.status(401).json({ ok: false, error: "Kullanici adi veya sifre hatali." });
  }
  req.session.authenticated = true;
  req.session.username = username;
  res.json({ ok: true, username });
});

app.post("/api/logout", (req, res) => {
  req.session = null; // cookie-session: oturumu sonlandirmanin yolu bu
  res.json({ ok: true });
});

app.get("/api/session", (req, res) => {
  res.json({
    authenticated: Boolean(req.session && req.session.authenticated),
    username: (req.session && req.session.username) || null
  });
});

/* ---- Sifre degistirme (giris yapmis kullanici kendi sifresini degistirir) ---- */
app.post("/api/change-password", requireAuth, (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  const cfg = loadConfig();
  if (!currentPassword || !bcrypt.compareSync(currentPassword, cfg.passwordHash)) {
    return res.status(401).json({ ok: false, error: "Mevcut sifre hatali." });
  }
  if (!newPassword || newPassword.length < 8) {
    return res.status(400).json({ ok: false, error: "Yeni sifre en az 8 karakter olmali." });
  }
  cfg.passwordHash = bcrypt.hashSync(newPassword, 10);
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2) + "\n");
  res.json({ ok: true });
});

/* ---- Icerik (metinler + gorseller) kaydetme ----
   Okuma icin ayri bir API'ye gerek yok: hem site hem panel dogrudan
   /assets/content.json dosyasini statik olarak okuyor (icinde gizli bilgi yok). */
app.put("/api/content", requireAuth, (req, res) => {
  const body = req.body;
  if (!body || typeof body !== "object" || !body.texts || !body.images) {
    return res.status(400).json({ ok: false, error: "Gecersiz icerik formati." });
  }
  if (!body.texts.tr || !body.texts.en) {
    return res.status(400).json({ ok: false, error: "texts.tr ve texts.en gerekli." });
  }
  try {
    // Yedek al
    if (fs.existsSync(CONTENT_PATH)) {
      fs.copyFileSync(CONTENT_PATH, CONTENT_PATH + ".bak");
    }
    fs.writeFileSync(CONTENT_PATH, JSON.stringify(body, null, 2) + "\n");
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: "Kaydedilemedi: " + err.message });
  }
});

/* ---- Fotograf yukleme ---- */
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"]);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeBase = path
      .basename(file.originalname, ext)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 40) || "gorsel";
    cb(null, `${Date.now()}-${safeBase}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 }, // 8 MB
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_TYPES.has(file.mimetype)) {
      return cb(new Error("Desteklenmeyen dosya turu. Sadece JPG, PNG, WEBP, GIF, SVG."));
    }
    cb(null, true);
  }
});

app.post("/api/upload-image", requireAuth, (req, res) => {
  upload.single("image")(req, res, (err) => {
    if (err) return res.status(400).json({ ok: false, error: err.message });
    if (!req.file) return res.status(400).json({ ok: false, error: "Dosya bulunamadi." });
    const relUrl = `assets/img/uploads/${req.file.filename}`;
    res.json({ ok: true, url: relUrl });
  });
});

/* ---- iOS uygulamasi icin push bildirim altyapisi ----
   Uygulama acilinca APNs'den aldigi cihaz token'ini /api/register-device'a
   gonderir (kimlik dogrulama gerekmez, bu sadece bir push hedefi kaydidir).
   Panelden (admin/uygulama ici panel) /api/send-notification cagrilinca
   kayitli tum cihazlara bildirim gonderilir. APNs anahtari (.p8) henuz
   admin-config.json'da tanimli degilse veya dosya bulunamiyorsa net bir
   hata donuyoruz — sunucunun geri kalani (icerik/fotograf) bundan
   etkilenmeden calismaya devam eder. */
function loadDevices() {
  try {
    return JSON.parse(fs.readFileSync(DEVICES_PATH, "utf-8"));
  } catch (e) {
    return { tokens: [] };
  }
}

function saveDevices(data) {
  fs.writeFileSync(DEVICES_PATH, JSON.stringify(data, null, 2) + "\n");
}

app.post("/api/register-device", (req, res) => {
  const { token } = req.body || {};
  if (!token || typeof token !== "string" || token.length < 10) {
    return res.status(400).json({ ok: false, error: "Gecerli bir cihaz token'i gerekli." });
  }
  const devices = loadDevices();
  if (!devices.tokens.includes(token)) {
    devices.tokens.push(token);
    saveDevices(devices);
  }
  res.json({ ok: true, registered: devices.tokens.length });
});

let apnProvider = null;
function getApnProvider() {
  const cfg = loadConfig();
  const apns = cfg.apns || {};
  if (!apns.keyId || !apns.teamId || !apns.bundleId || !apns.keyPath) {
    throw new Error(
      "APNs henuz yapilandirilmamis — admin-config.json'daki 'apns' alanina keyId, teamId, bundleId ve keyPath doldurun (bkz. PANEL-KULLANIM.md)."
    );
  }
  const keyFullPath = path.isAbsolute(apns.keyPath) ? apns.keyPath : path.join(ROOT, apns.keyPath);
  if (!fs.existsSync(keyFullPath)) {
    throw new Error(`APNs anahtar dosyasi bulunamadi: ${keyFullPath} — .p8 dosyasini bu yola koyun.`);
  }
  if (!apnProvider) {
    apnProvider = new apn.Provider({
      token: { key: keyFullPath, keyId: apns.keyId, teamId: apns.teamId },
      production: apns.production !== false
    });
  }
  return { provider: apnProvider, bundleId: apns.bundleId };
}

app.post("/api/send-notification", requireAuth, async (req, res) => {
  const { title, body } = req.body || {};
  if (!title || !body) {
    return res.status(400).json({ ok: false, error: "Baslik ve mesaj gerekli." });
  }
  const devices = loadDevices();
  if (devices.tokens.length === 0) {
    return res.status(400).json({ ok: false, error: "Kayitli cihaz yok — uygulamayi acmis kimse olmali." });
  }
  let provider, bundleId;
  try {
    ({ provider, bundleId } = getApnProvider());
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
  const note = new apn.Notification();
  note.alert = { title, body };
  note.sound = "default";
  note.topic = bundleId;
  note.payload = { customData: "florence-event-app" };
  try {
    const result = await provider.send(note, devices.tokens);
    const failedTokens = result.failed
      .filter((f) => f.status === "410" || (f.response && f.response.reason === "BadDeviceToken"))
      .map((f) => f.device);
    if (failedTokens.length) {
      devices.tokens = devices.tokens.filter((t) => !failedTokens.includes(t));
      saveDevices(devices);
    }
    res.json({
      ok: true,
      sent: result.sent.length,
      failed: result.failed.length,
      removedInvalidTokens: failedTokens.length
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: "Bildirim gonderilemedi: " + err.message });
  }
});

/* ---- CORS: site Cloudflare Pages'te ayri barinabilir, bu sunucudan sadece
   content.json ve yuklenen gorselleri okuyabilmesi icin GET istekleri her
   kaynaktan (origin) kabul edilir. Burada gizli/kisisel veri sunulmuyor. */
app.use((req, res, next) => {
  if (req.method === "GET" || req.method === "HEAD") {
    res.setHeader("Access-Control-Allow-Origin", "*");
  }
  next();
});

/* ---- Statik site + admin paneli dosyalari ---- */
app.use(express.static(ROOT, { extensions: ["html"] }));

app.listen(PORT, () => {
  console.log(`Florence Event Design sunucusu calisiyor: http://localhost:${PORT}`);
  console.log(`Yonetim paneli: http://localhost:${PORT}/admin/`);
});
