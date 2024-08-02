import { Database } from "bun:sqlite";
import * as sqliteVec from "sqlite-vec";
// MacOS *might* have to do this, as the builtin SQLite library on MacOS doesn't allow extensions
Database.setCustomSQLite("/opt/homebrew/opt/sqlite/lib/libsqlite3.dylib");

export const db = (db_name: string) => {
  // biome-ignore lint: reason
  let db;

  if (db_name === "knowledge") {
    db = new Database("./utils/knowledge/datastore.sqlite");
    sqliteVec.load(db);
  }

  if (db_name === "telemetry") {
    db = new Database("./telemetry/datastore.sqlite");
  }

  return db;
};
