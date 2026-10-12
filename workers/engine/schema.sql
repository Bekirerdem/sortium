CREATE TABLE IF NOT EXISTS markets (
  draft_key TEXT PRIMARY KEY,
  market_id INTEGER UNIQUE,
  template_key TEXT NOT NULL,
  entity TEXT NOT NULL,
  question TEXT NOT NULL,
  outcomes TEXT NOT NULL,
  lock_time INTEGER NOT NULL,
  resolve_time INTEGER NOT NULL,
  meta TEXT NOT NULL,
  demo INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'reserved',
  assertion_id TEXT,
  proposed_at INTEGER,
  tx_hash TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_markets_status ON markets(status, resolve_time);
CREATE TABLE IF NOT EXISTS snapshots (market_id INTEGER PRIMARY KEY, fetched_at INTEGER NOT NULL, sha256 TEXT NOT NULL, body TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS faucet (address TEXT PRIMARY KEY, ip TEXT NOT NULL, last INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS idx_faucet_ip ON faucet(ip, last);
