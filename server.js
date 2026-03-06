require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const cron = require('node-cron');

const ordersRouter = require('./routes/orders');
const { router: fortnoxRouter, syncFromFortnox } = require('./routes/fortnox');

const app = express();
const PORT = process.env.PORT || 3000;

// ── Säkerhet & middleware ─────────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        "'unsafe-inline'",           // Bootstrap, FullCalendar inline scripts
        "https://cdn.jsdelivr.net",
        "https://cdnjs.cloudflare.com",
        "https://alcdn.msauth.net"    // MSAL
      ],
      styleSrc: [
        "'self'",
        "'unsafe-inline'",
        "https://cdn.jsdelivr.net",
        "https://cdnjs.cloudflare.com"
      ],
      fontSrc: [
        "'self'",
        "https://cdn.jsdelivr.net"
      ],
      connectSrc: [
        "'self'",
        "https://login.microsoftonline.com",
        "https://graph.microsoft.com",
        "https://api.fortnox.se"
      ],
      imgSrc: ["'self'", "data:", "https:"]
    }
  }
}));

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Statiska filer (frontend) ─────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public')));

// ── API-routes ────────────────────────────────────────────────────────────────
app.use('/api/orders', ordersRouter);
app.use('/api/fortnox', fortnoxRouter);

// ── Hälsokontroll ─────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    app: 'Ribe Workflow',
    version: '1.0.0',
    time: new Date().toISOString()
  });
});

// ── API: Appkonfiguration för frontend ────────────────────────────────────────
app.get('/api/config', (req, res) => {
  res.json({
    clientId: process.env.AZURE_CLIENT_ID,
    tenantId: process.env.AZURE_TENANT_ID,
    redirectUri: process.env.APP_URL || `http://localhost:${PORT}`
  });
});

// ── SPA fallback: skicka alltid index.html för okända routes ─────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ── Fortnox auto-synk var 10:e minut (om konfigurerat) ───────────────────────
if (process.env.FORTNOX_ACCESS_TOKEN && process.env.FORTNOX_CLIENT_SECRET) {
  cron.schedule('*/10 * * * *', async () => {
    console.log('[Fortnox] Automatisk synk startar...');
    try {
      const result = await syncFromFortnox();
      if (result.ordersFound > 0) {
        console.log(`[Fortnox] ${result.ordersFound} nya ordrar skapades`);
      }
    } catch (err) {
      console.error('[Fortnox] Auto-synk misslyckades:', err.message);
    }
  });
  console.log('[Fortnox] Auto-synk aktiv (var 10:e minut)');
} else {
  console.log('[Fortnox] Inte konfigurerat – auto-synk inaktiv');
}

// ── Starta servern ────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`
  ╔══════════════════════════════════════╗
  ║   Ribe Workflow – Server startat     ║
  ║   http://localhost:${PORT}               ║
  ╚══════════════════════════════════════╝
  `);
});
