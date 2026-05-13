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
  rep_id         INTEGER,
  date           TEXT,
  outcome        TEXT,
  notes          TEXT,
  synced         INTEGER DEFAULT 0,
  outcome_score  INTEGER DEFAULT 0,
  order_value    INTEGER DEFAULT 0,
  rejection_reason TEXT
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
  created_at TEXT,
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
