PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;

-- ── Users ─────────────────────────────────────────────────────────────────────
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
  manager_id    INTEGER REFERENCES users(id) ON DELETE SET NULL,
  phone         TEXT,
  created_at    TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_users_rep_id   ON users(rep_id);
CREATE INDEX IF NOT EXISTS idx_users_role     ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_district ON users(district);
CREATE INDEX IF NOT EXISTS idx_users_manager  ON users(manager_id);

-- ── Reps territory mapping ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reps_territory (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  rep_id         TEXT UNIQUE NOT NULL,
  territory_id   TEXT,
  territory_name TEXT,
  state          TEXT,
  district       TEXT,
  tehsil_list    TEXT
);
CREATE INDEX IF NOT EXISTS idx_rt_district ON reps_territory(district);

-- ── Retailers (canonical) ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS retailers (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  retailer_id   TEXT UNIQUE NOT NULL,
  retailer_name TEXT NOT NULL,
  territory_id  TEXT,
  manager_id    INTEGER REFERENCES users(id) ON DELETE SET NULL,
  tehsil        TEXT,
  state         TEXT,
  district      TEXT,
  contact_name  TEXT,
  phone         TEXT,
  is_active     INTEGER DEFAULT 1,
  lat           REAL,
  lng           REAL,
  geocoded_at   TEXT,
  created_at    TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_ret_district     ON retailers(district);
CREATE INDEX IF NOT EXISTS idx_ret_territory    ON retailers(territory_id);
CREATE INDEX IF NOT EXISTS idx_ret_manager      ON retailers(manager_id);

-- ── Outlets (legacy — used by ML scoring and route optimization) ───────────────
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
CREATE INDEX IF NOT EXISTS idx_outlets_district ON outlets(district);

-- ── Visit logs ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS visit_logs (
  id                    INTEGER PRIMARY KEY AUTOINCREMENT,
  outlet_id             INTEGER REFERENCES outlets(id) ON DELETE SET NULL,
  rep_id                TEXT NOT NULL,
  retailer_id           TEXT,
  retailer_name         TEXT,
  date                  TEXT,
  visit_type            TEXT,
  product_discussed     TEXT,
  outcome               TEXT,
  notes                 TEXT,
  synced                INTEGER DEFAULT 0,
  outcome_score         INTEGER DEFAULT 0,
  order_value           INTEGER DEFAULT 0,
  rejection_reason      TEXT,
  competitor_observation TEXT,
  submitted_at          TEXT
);
CREATE INDEX IF NOT EXISTS idx_vl_rep_id    ON visit_logs(rep_id);
CREATE INDEX IF NOT EXISTS idx_vl_date      ON visit_logs(date);
CREATE INDEX IF NOT EXISTS idx_vl_outlet    ON visit_logs(outlet_id);
CREATE INDEX IF NOT EXISTS idx_vl_retailer  ON visit_logs(retailer_id);
CREATE INDEX IF NOT EXISTS idx_vl_outcome   ON visit_logs(outcome);

-- ── Learning metrics ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS learning_metrics (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  outlet_id       INTEGER REFERENCES outlets(id) ON DELETE CASCADE,
  conversion_rate REAL DEFAULT 0.0,
  acceptance_rate REAL DEFAULT 0.0,
  last_updated    TEXT
);

-- ── Alerts ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS alerts (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  outlet_id   INTEGER REFERENCES outlets(id) ON DELETE CASCADE,
  type        TEXT,
  message     TEXT,
  severity    TEXT,
  outlet_name TEXT,
  district    TEXT,
  created_at  TEXT,
  timestamp   TEXT,
  dismissed   INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_alerts_district  ON alerts(district);
CREATE INDEX IF NOT EXISTS idx_alerts_dismissed ON alerts(dismissed);

-- ── NBA cache (responses) ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS nba_responses (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  retailer_id   TEXT NOT NULL,
  date          TEXT NOT NULL,
  response_json TEXT NOT NULL,
  created_at    TEXT DEFAULT (datetime('now')),
  UNIQUE(retailer_id, date)
);

-- ── Weekly stats ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS weekly_stats (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  week_label       TEXT,
  visits           INTEGER,
  accepted         INTEGER,
  acceptance_rate  REAL
);

-- ── Weekly plans ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS weekly_plans (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  rep_id            TEXT NOT NULL REFERENCES users(rep_id) ON DELETE CASCADE,
  week_label        TEXT NOT NULL,
  week_start_date   TEXT NOT NULL,
  week_end_date     TEXT NOT NULL,
  assigned_outlets  TEXT NOT NULL DEFAULT '[]',
  daily_split       TEXT NOT NULL DEFAULT '{}',
  status            TEXT NOT NULL DEFAULT 'pending',
  created_by        TEXT,
  created_at        TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_wp_rep_week ON weekly_plans(rep_id, week_start_date);

-- ── Weather cache ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS weather_cache (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  district     TEXT NOT NULL,
  date         TEXT NOT NULL,
  rainfall_mm  REAL DEFAULT 0,
  temp_c       REAL DEFAULT 32,
  humidity_pct REAL DEFAULT 60,
  weather_risk TEXT DEFAULT 'normal',
  ndvi_value   REAL DEFAULT 0.41,
  ndvi_label   TEXT DEFAULT 'moderate crop stress',
  source       TEXT DEFAULT 'open-meteo-live',
  created_at   TEXT DEFAULT (datetime('now')),
  UNIQUE(district, date)
);

-- ── Competitive intelligence ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS competitor_intel (
  id                        INTEGER PRIMARY KEY AUTOINCREMENT,
  retailer_id               TEXT NOT NULL,
  rep_id                    TEXT,
  date                      TEXT NOT NULL,
  threat_type               TEXT,
  threat_level              TEXT,
  competitor_name           TEXT,
  at_risk_products          TEXT DEFAULT '[]',
  defensive_talking_point   TEXT,
  immediate_action          TEXT,
  escalate_to_manager       INTEGER DEFAULT 0,
  opportunity_flag          INTEGER DEFAULT 0,
  rep_raw_observation       TEXT,
  nearby_stores_detected    TEXT,
  source                    TEXT DEFAULT 'llm',
  created_at                TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_ci_retailer ON competitor_intel(retailer_id, date);

-- ── Dataset tables (read-only, seeded from CSVs) ─────────────────────────────
CREATE TABLE IF NOT EXISTS retailer_pos (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  retailer_id     TEXT NOT NULL,
  transaction_id  TEXT,
  sku_id          TEXT,
  sku_name        TEXT,
  sku_qty         INTEGER DEFAULT 0,
  sku_price       REAL DEFAULT 0,
  transaction_date TEXT
);
CREATE INDEX IF NOT EXISTS idx_pos_retailer ON retailer_pos(retailer_id);
CREATE INDEX IF NOT EXISTS idx_pos_date     ON retailer_pos(transaction_date);

CREATE TABLE IF NOT EXISTS retailer_inventory (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  retailer_id     TEXT NOT NULL,
  sku_id          TEXT,
  sku_name        TEXT,
  sku_qty         INTEGER DEFAULT 0,
  week_end_date   TEXT
);
CREATE INDEX IF NOT EXISTS idx_inv_retailer ON retailer_inventory(retailer_id);
CREATE INDEX IF NOT EXISTS idx_inv_date     ON retailer_inventory(week_end_date);

CREATE TABLE IF NOT EXISTS historical_visit_log (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  rep_id              TEXT,
  visit_date          TEXT,
  territory_id        TEXT,
  visit_tehsil        TEXT,
  visit_type          TEXT,
  product_recommended TEXT
);
CREATE INDEX IF NOT EXISTS idx_hvlog_rep  ON historical_visit_log(rep_id);
CREATE INDEX IF NOT EXISTS idx_hvlog_date ON historical_visit_log(visit_date);

CREATE TABLE IF NOT EXISTS growers (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  grower_id           TEXT UNIQUE NOT NULL,
  farmer_name         TEXT NOT NULL,
  village             TEXT NOT NULL,
  tehsil              TEXT,
  district            TEXT NOT NULL,
  state               TEXT DEFAULT 'Maharashtra',
  farm_acres          REAL DEFAULT 2.0,
  crop_type           TEXT DEFAULT 'cotton',
  growth_stage        TEXT DEFAULT 'vegetative',
  last_product        TEXT,
  last_purchase_date  TEXT,
  nearest_retailer_id TEXT,
  distance_km         REAL,
  lat                 REAL,
  lng                 REAL,
  geocoded_at         TEXT,
  created_at          TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_growers_district ON growers(district);
CREATE INDEX IF NOT EXISTS idx_growers_tehsil   ON growers(tehsil);

CREATE TABLE IF NOT EXISTS whatsapp_campaigns (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  grower_id       TEXT NOT NULL,
  campaign_name   TEXT,
  message_status  TEXT DEFAULT 'sent',
  sent_at         TEXT,
  opened_at       TEXT,
  clicked_at      TEXT,
  created_at      TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_wa_grower ON whatsapp_campaigns(grower_id);
