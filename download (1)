const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');
const { arJobs, somJobs, bestJobs, settings, db } = require('../db/database');
const { requireAuth } = require('../middleware/auth');

const FORTNOX_BASE = 'https://api.fortnox.se/3';

// ── Hjälpfunktion: anropa Fortnox API ────────────────────────────────────────
async function fortnoxGet(endpoint) {
  const accessToken = process.env.FORTNOX_ACCESS_TOKEN;
  const clientSecret = process.env.FORTNOX_CLIENT_SECRET;

  if (!accessToken || !clientSecret) {
    throw new Error('Fortnox API-nycklar saknas. Lägg till dem i miljövariablerna.');
  }

  const response = await fetch(`${FORTNOX_BASE}${endpoint}`, {
    headers: {
      'Access-Token': accessToken,
      'Client-Secret': clientSecret,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Fortnox svarade ${response.status}: ${text}`);
  }

  return response.json();
}

// ── Hämta nya ordrar och skapa arbetsorder etc. ───────────────────────────────
async function syncFromFortnox() {
  const lastSync = settings.get('fortnox_last_sync') || '2020-01-01';
  console.log(`[Fortnox] Synkar från ${lastSync}...`);

  let ordersFound = 0;

  try {
    // Hämta ordrar från Fortnox
    const data = await fortnoxGet(`/orders?filter=active&lastmodified=${lastSync}`);
    const orders = data.Orders?.Order || [];

    for (const order of orders) {
      const fortnoxId = String(order.DocumentNumber);

      // Kolla om ordern redan finns
      const existingAr = db.prepare(
        'SELECT id FROM ar_jobs WHERE fortnox_order_id = ?'
      ).get(fortnoxId);

      if (!existingAr) {
        // Hämta detaljerad orderinfo
        const detail = await fortnoxGet(`/orders/${fortnoxId}`);
        const o = detail.Order;

        const kund = o.CustomerName || '';
        const projekt = o.YourOrderNumber || o.DocumentNumber || '';
        const datum = o.DeliveryDate || o.OrderDate || '';
        const saljare = o.YourReference || '';

        // Bygg materiallista från orderrader
        const material = (o.OrderRows || []).map(row => ({
          artikel: row.ArticleNumber || '',
          antal: String(row.OrderedQuantity || ''),
          enhet: row.Unit || 'st',
          leverantor: ''
        }));

        // Skapa Arbetsorder
        arJobs.create({
          kund,
          projekt,
          datum,
          saljare,
          material,
          status: 'ny',
          fortnox_order_id: fortnoxId,
          beskrivning: `Automatiskt skapad från Fortnox order ${fortnoxId}`
        }, 'fortnox-sync');

        // Skapa Sömnadsorder
        somJobs.create({
          kund,
          projekt,
          saljare,
          leveransdatum: datum,
          status: 'ny',
          fortnox_order_id: fortnoxId,
          beskrivning: `Automatiskt skapad från Fortnox order ${fortnoxId}`
        }, 'fortnox-sync');

        // Skapa Beställning om det finns artiklar
        if (material.length > 0) {
          bestJobs.create({
            kund,
            projekt,
            referens: saljare,
            levdatum: datum,
            status: 'oppen',
            artiklar: material,
            fortnox_order_id: fortnoxId,
            anteckningar: `Automatiskt skapad från Fortnox order ${fortnoxId}`
          }, 'fortnox-sync');
        }

        ordersFound++;
        console.log(`[Fortnox] Skapade ordrar för Fortnox ${fortnoxId} – ${kund}`);
      }
    }

    // Spara synktidpunkt
    settings.set('fortnox_last_sync', new Date().toISOString().split('T')[0]);
    db.prepare(
      'INSERT INTO fortnox_sync (orders_found, status) VALUES (?, ?)'
    ).run(ordersFound, 'ok');

    return { success: true, ordersFound };

  } catch (err) {
    console.error('[Fortnox] Synkfel:', err.message);
    db.prepare(
      'INSERT INTO fortnox_sync (orders_found, status) VALUES (?, ?)'
    ).run(0, `error: ${err.message}`);
    throw err;
  }
}

// ── Route: manuell synkstart ──────────────────────────────────────────────────
router.post('/sync', requireAuth, async (req, res) => {
  try {
    const result = await syncFromFortnox();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Route: synkstatus ─────────────────────────────────────────────────────────
router.get('/status', requireAuth, (req, res) => {
  const lastSync = settings.get('fortnox_last_sync') || 'Aldrig';
  const lastRun = db.prepare(
    'SELECT * FROM fortnox_sync ORDER BY id DESC LIMIT 1'
  ).get();
  const configured = !!(process.env.FORTNOX_ACCESS_TOKEN && process.env.FORTNOX_CLIENT_SECRET);
  res.json({ lastSync, lastRun, configured });
});

module.exports = { router, syncFromFortnox };
