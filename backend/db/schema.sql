CREATE TABLE IF NOT EXISTS reps (
  id        INTEGER PRIMARY KEY,
  name      TEXT NOT NULL,
  territory TEXT,
  district  TEXT
);

CREATE TABLE IF NOT EXISTS outlets (
  id                   INTEGER PRIMARY KEY,
  name                 TEXT NOT NULL,
  type                 TEXT,
  owner_name           TEXT,
  district             TEXT,
  lat                  REAL,
  lng                  REAL,
  last_visit_date      TEXT,
  stock_days_remaining INTEGER,
  has_pest_alert       INTEGER DEFAULT 0,
  sales_spike          INTEGER DEFAULT 0,
  crop_stage           TEXT
);

CREATE TABLE IF NOT EXISTS visit_logs (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  outlet_id      INTEGER,
  rep_id         TEXT,
  retailer_id    TEXT,
  retailer_name  TEXT,
  date           TEXT,
  visit_type     TEXT,
  product_discussed TEXT,
  outcome        TEXT,
  notes          TEXT,
  synced         INTEGER DEFAULT 0,
  outcome_score  INTEGER DEFAULT 0,
  order_value    INTEGER DEFAULT 0,
  rejection_reason TEXT,
  submitted_at   TEXT
);

CREATE TABLE IF NOT EXISTS learning_metrics (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  outlet_id       INTEGER,
  conversion_rate REAL DEFAULT 0.0,
  acceptance_rate REAL DEFAULT 0.0,
  last_updated    TEXT
);

CREATE TABLE IF NOT EXISTS alerts (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  outlet_id  INTEGER,
  type       TEXT,
  message    TEXT,
  severity   TEXT,
  outlet_name TEXT,
  created_at TEXT,
  timestamp  TEXT,
  dismissed  INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS nba_cache (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  outlet_id INTEGER,
  date      TEXT,
  product   TEXT,
  pitch     TEXT,
  tip       TEXT,
  promotion TEXT,
  why       TEXT
);

CREATE TABLE IF NOT EXISTS weekly_stats (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  week_label       TEXT,
  visits           INTEGER,
  accepted         INTEGER,
  acceptance_rate  REAL
);

CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT,
  name          TEXT NOT NULL,
  rep_id        TEXT NOT NULL,
  google_id     TEXT,
  role          TEXT DEFAULT 'rep',
  state         TEXT,
  district      TEXT,
  territory_id  TEXT,
  manager_id    INTEGER,
  created_at    TEXT DEFAULT (datetime('now'))
);


CREATE TABLE IF NOT EXISTS retailers (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  retailer_id   TEXT UNIQUE NOT NULL,
  retailer_name TEXT NOT NULL,
  territory_id  TEXT,
  manager_id    INTEGER,
  tehsil        TEXT,
  state         TEXT,
  district      TEXT,
  contact_name  TEXT,
  phone         TEXT,
  is_active     INTEGER DEFAULT 1,
  created_at    TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS nba_responses (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  retailer_id TEXT NOT NULL,
  date        TEXT NOT NULL,
  response_json TEXT NOT NULL,
  created_at  TEXT DEFAULT (datetime('now')),
  UNIQUE(retailer_id, date)
);
