const express = require('express');
const router = express.Router();
const { arJobs, somJobs, bestJobs } = require('../db/database');
const { requireAuth } = require('../middleware/auth');

// Välj rätt datamodell baserat på typ
function getModel(type) {
  return { ar: arJobs, som: somJobs, best: bestJobs }[type];
}

// ── GET alla ordrar av en typ ─────────────────────────────────────────────────
router.get('/:type', requireAuth, (req, res) => {
  const model = getModel(req.params.type);
  if (!model) return res.status(400).json({ error: 'Okänd ordertyp' });
  res.json(model.getAll());
});

// ── GET en specifik order ─────────────────────────────────────────────────────
router.get('/:type/:id', requireAuth, (req, res) => {
  const model = getModel(req.params.type);
  if (!model) return res.status(400).json({ error: 'Okänd ordertyp' });
  const job = model.getById(req.params.id);
  if (!job) return res.status(404).json({ error: 'Order hittades inte' });
  res.json(job);
});

// ── POST skapa ny order ───────────────────────────────────────────────────────
router.post('/:type', requireAuth, (req, res) => {
  const model = getModel(req.params.type);
  if (!model) return res.status(400).json({ error: 'Okänd ordertyp' });
  try {
    const job = model.create(req.body, req.user.email);
    res.status(201).json(job);
  } catch (err) {
    console.error('Fel vid skapande:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── PUT uppdatera order ───────────────────────────────────────────────────────
router.put('/:type/:id', requireAuth, (req, res) => {
  const model = getModel(req.params.type);
  if (!model) return res.status(400).json({ error: 'Okänd ordertyp' });
  const existing = model.getById(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Order hittades inte' });
  try {
    const updated = model.update(req.params.id, req.body);
    res.json(updated);
  } catch (err) {
    console.error('Fel vid uppdatering:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE ta bort order ──────────────────────────────────────────────────────
router.delete('/:type/:id', requireAuth, (req, res) => {
  const model = getModel(req.params.type);
  if (!model) return res.status(400).json({ error: 'Okänd ordertyp' });
  model.delete(req.params.id);
  res.json({ success: true });
});

module.exports = router;
