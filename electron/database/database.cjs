const { app } = require("electron");
const Database = require("better-sqlite3");
const path = require("path");

const dbPath = path.join(
  app.getPath("userData"),
  "database.db"
);

const db = new Database(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS historico_envios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sessao_numero TEXT,
    lista_id TEXT NOT NULL,
    numero TEXT NOT NULL,
    status TEXT NOT NULL,
    data_hora DATETIME DEFAULT CURRENT_TIMESTAMP,
    mensagem TEXT,
    erro TEXT
  );
`);

const colunas = db
  .prepare(`PRAGMA table_info(historico_envios)`)
  .all();

const existeSessaoNumero = colunas.some(
  (coluna) => coluna.name === "sessao_numero"
);

if (!existeSessaoNumero) {
  db.exec(`
    ALTER TABLE historico_envios
    ADD COLUMN sessao_numero TEXT
  `);
}

module.exports = db;