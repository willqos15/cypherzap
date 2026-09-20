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
    lista_id TEXT NOT NULL,
    numero TEXT NOT NULL,
    status TEXT NOT NULL,
    data_hora DATETIME DEFAULT CURRENT_TIMESTAMP,
    mensagem TEXT,
    erro TEXT
);
`);

module.exports = db;