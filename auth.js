const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'ribe-workflow.db');
const db = new Database(DB_PATH);

// Aktivera WAL för bättre prestanda med flera användare
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ── Skapa tabeller ────────────────────────────────────────────────────────────

db.exec(`
  CREATE TABLE IF NOT EXISTS ar_jobs (
    id          TEXT PRIMARY KEY,
    ordernr     TEXT NOT NULL,
    status      TEXT NOT NULL DEFAULT 'utkast',
    kund        TEXT,
    saljare     TEXT,
    projekt     TEXT,
    plats       TEXT,
    montor      TEXT,
    datum       TEXT,
    tid         TEXT,
    beskrivning TEXT,
    kontaktperson TEXT,
    kontakttelefon TEXT,
    avvikelser  TEXT,
    material    TEXT DEFAULT '[]',
    lankad_somnadsorder TEXT DEFAULT '',
    fortnox_order_id TEXT,
    created_at  TEXT DEFAULT (datetime('now')),
    updated_at  TEXT DEFAULT (datetime('now')),
    created_by  TEXT
  );

  CREATE TABLE IF NOT EXISTS som_jobs (
    id          TEXT PRIMARY KEY,
    ordernr     TEXT NOT NULL,
    status      TEXT NOT NULL DEFAULT 'utkast',
    kund        TEXT,
    saljare     TEXT,
    projekt     TEXT,
    leveransdatum TEXT,
    sommerskor  TEXT,
    tyg         TEXT,
    matt        TEXT,
    beskrivning TEXT,
    lankad_arbetsorder TEXT DEFAULT '',
    fortnox_order_id TEXT,
    created_at  TEXT DEFAULT (datetime('now')),
    updated_at  TEXT DEFAULT (datetime('now')),
    created_by  TEXT
  );

  CREATE TABLE IF NOT EXISTS best_jobs (
    id          TEXT PRIMARY KEY,
    ordernr     TEXT NOT NULL,
    status      TEXT NOT NULL DEFAULT 'oppen',
    datum       TEXT,
    levdatum    TEXT,
    leverantor  TEXT,
    referens    TEXT,
    projekt     TEXT,
    betalning   TEXT DEFAULT '30 dagar netto',
    levadress   TEXT DEFAULT 'Ribe Gardin AB, Mediavägen 11, 135 48 Tyresö',
    anteckningar TEXT,
    mottagen    INTEGER DEFAULT 0,
    artiklar    TEXT DEFAULT '[]',
    fortnox_order_id TEXT,
    created_at  TEXT DEFAULT (datetime('now')),
    updated_at  TEXT DEFAULT (datetime('now')),
    created_by  TEXT
  );

  CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT
  );

  CREATE TABLE IF NOT EXISTS fortnox_sync (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    synced_at   TEXT DEFAULT (datetime('now')),
    orders_found INTEGER DEFAULT 0,
    status      TEXT
  );
`);

// ── Hjälpfunktioner ───────────────────────────────────────────────────────────

function generateId(prefix) {
  return prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function generateOrderNr(type, existingCount) {
  const year = new Date().getFullYear();
  const prefix = { ar: 'AO', som: 'SO', best: 'BO' }[type] || 'XX';
  return `${prefix}-${year}-${String(existingCount + 1).padStart(3, '0')}`;
}

// ── AR Jobs ───────────────────────────────────────────────────────────────────

const arJobs = {
  getAll: () => {
    const rows = db.prepare('SELECT * FROM ar_jobs ORDER BY created_at DESC').all();
    return rows.map(r => ({ ...r, material: JSON.parse(r.material || '[]') }));
  },
  getById: (id) => {
    const r = db.prepare('SELECT * FROM ar_jobs WHERE id = ?').get(id);
    return r ? { ...r, material: JSON.parse(r.material || '[]') } : null;
  },
  create: (data, userId) => {
    const count = db.prepare('SELECT COUNT(*) as c FROM ar_jobs').get().c;
    const job = {
      id: generateId('ar'),
      ordernr: data.ordernr || generateOrderNr('ar', count),
      status: data.status || 'utkast',
      kund: data.kund || '',
      saljare: data.saljare || '',
      projekt: data.projekt || '',
      plats: data.plats || '',
      montor: data.montor || '',
      datum: data.datum || '',
      tid: data.tid || '09:00',
      beskrivning: data.beskrivning || '',
      kontaktperson: data.kontaktperson || '',
      kontakttelefon: data.kontakttelefon || '',
      avvikelser: data.avvikelser || '',
      material: JSON.stringify(data.material || []),
      lankad_somnadsorder: data.lankad_somnadsorder || '',
      fortnox_order_id: data.fortnox_order_id || null,
      created_by: userId || null
    };
    db.prepare(`INSERT INTO ar_jobs
      (id,ordernr,status,kund,saljare,projekt,plats,montor,datum,tid,
       beskrivning,kontaktperson,kontakttelefon,avvikelser,material,
       lankad_somnadsorder,fortnox_order_id,created_by)
      VALUES
      (@id,@ordernr,@status,@kund,@saljare,@projekt,@plats,@montor,@datum,@tid,
       @beskrivning,@kontaktperson,@kontakttelefon,@avvikelser,@material,
       @lankad_somnadsorder,@fortnox_order_id,@created_by)`).run(job);
    return arJobs.getById(job.id);
  },
  update: (id, data) => {
    db.prepare(`UPDATE ar_jobs SET
      status=@status, kund=@kund, saljare=@saljare, projekt=@projekt,
      plats=@plats, montor=@montor, datum=@datum, tid=@tid,
      beskrivning=@beskrivning, kontaktperson=@kontaktperson,
      kontakttelefon=@kontakttelefon, avvikelser=@avvikelser,
      material=@material, lankad_somnadsorder=@lankad_somnadsorder,
      updated_at=datetime('now')
      WHERE id=@id`).run({
        ...data,
        material: JSON.stringify(data.material || []),
        id
      });
    return arJobs.getById(id);
  },
  delete: (id) => db.prepare('DELETE FROM ar_jobs WHERE id = ?').run(id)
};

// ── SOM Jobs ──────────────────────────────────────────────────────────────────

const somJobs = {
  getAll: () => db.prepare('SELECT * FROM som_jobs ORDER BY created_at DESC').all(),
  getById: (id) => db.prepare('SELECT * FROM som_jobs WHERE id = ?').get(id),
  create: (data, userId) => {
    const count = db.prepare('SELECT COUNT(*) as c FROM som_jobs').get().c;
    const job = {
      id: generateId('som'),
      ordernr: data.ordernr || generateOrderNr('som', count),
      status: data.status || 'utkast',
      kund: data.kund || '',
      saljare: data.saljare || '',
      projekt: data.projekt || '',
      leveransdatum: data.leveransdatum || '',
      sommerskor: data.sommerskor || '',
      tyg: data.tyg || '',
      matt: data.matt || '',
      beskrivning: data.beskrivning || '',
      lankad_arbetsorder: data.lankad_arbetsorder || '',
      fortnox_order_id: data.fortnox_order_id || null,
      created_by: userId || null
    };
    db.prepare(`INSERT INTO som_jobs
      (id,ordernr,status,kund,saljare,projekt,leveransdatum,sommerskor,
       tyg,matt,beskrivning,lankad_arbetsorder,fortnox_order_id,created_by)
      VALUES
      (@id,@ordernr,@status,@kund,@saljare,@projekt,@leveransdatum,@sommerskor,
       @tyg,@matt,@beskrivning,@lankad_arbetsorder,@fortnox_order_id,@created_by)`).run(job);
    return somJobs.getById(job.id);
  },
  update: (id, data) => {
    db.prepare(`UPDATE som_jobs SET
      status=@status, kund=@kund, saljare=@saljare, projekt=@projekt,
      leveransdatum=@leveransdatum, sommerskor=@sommerskor, tyg=@tyg,
      matt=@matt, beskrivning=@beskrivning,
      lankad_arbetsorder=@lankad_arbetsorder, updated_at=datetime('now')
      WHERE id=@id`).run({ ...data, id });
    return somJobs.getById(id);
  },
  delete: (id) => db.prepare('DELETE FROM som_jobs WHERE id = ?').run(id)
};

// ── BEST Jobs ─────────────────────────────────────────────────────────────────

const bestJobs = {
  getAll: () => {
    const rows = db.prepare('SELECT * FROM best_jobs ORDER BY created_at DESC').all();
    return rows.map(r => ({ ...r, artiklar: JSON.parse(r.artiklar || '[]') }));
  },
  getById: (id) => {
    const r = db.prepare('SELECT * FROM best_jobs WHERE id = ?').get(id);
    return r ? { ...r, artiklar: JSON.parse(r.artiklar || '[]') } : null;
  },
  create: (data, userId) => {
    const count = db.prepare('SELECT COUNT(*) as c FROM best_jobs').get().c;
    const job = {
      id: generateId('best'),
      ordernr: data.ordernr || generateOrderNr('best', count),
      status: data.status || 'oppen',
      datum: data.datum || new Date().toISOString().split('T')[0],
      levdatum: data.levdatum || '',
      leverantor: data.leverantor || '',
      referens: data.referens || '',
      projekt: data.projekt || '',
      betalning: data.betalning || '30 dagar netto',
      levadress: data.levadress || 'Ribe Gardin AB, Mediavägen 11, 135 48 Tyresö',
      anteckningar: data.anteckningar || '',
      mottagen: data.mottagen ? 1 : 0,
      artiklar: JSON.stringify(data.artiklar || []),
      fortnox_order_id: data.fortnox_order_id || null,
      created_by: userId || null
    };
    db.prepare(`INSERT INTO best_jobs
      (id,ordernr,status,datum,levdatum,leverantor,referens,projekt,
       betalning,levadress,anteckningar,mottagen,artiklar,fortnox_order_id,created_by)
      VALUES
      (@id,@ordernr,@status,@datum,@levdatum,@leverantor,@referens,@projekt,
       @betalning,@levadress,@anteckningar,@mottagen,@artiklar,@fortnox_order_id,@created_by)`).run(job);
    return bestJobs.getById(job.id);
  },
  update: (id, data) => {
    db.prepare(`UPDATE best_jobs SET
      status=@status, datum=@datum, levdatum=@levdatum, leverantor=@leverantor,
      referens=@referens, projekt=@projekt, betalning=@betalning,
      levadress=@levadress, anteckningar=@anteckningar,
      mottagen=@mottagen, artiklar=@artiklar, updated_at=datetime('now')
      WHERE id=@id`).run({
        ...data,
        mottagen: data.mottagen ? 1 : 0,
        artiklar: JSON.stringify(data.artiklar || []),
        id
      });
    return bestJobs.getById(id);
  },
  delete: (id) => db.prepare('DELETE FROM best_jobs WHERE id = ?').run(id)
};

// ── Settings ──────────────────────────────────────────────────────────────────

const settings = {
  get: (key) => {
    const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
    return row ? row.value : null;
  },
  set: (key, value) => {
    db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, String(value));
  },
  getAll: () => {
    const rows = db.prepare('SELECT key, value FROM settings').all();
    return Object.fromEntries(rows.map(r => [r.key, r.value]));
  }
};

module.exports = { db, arJobs, somJobs, bestJobs, settings };
