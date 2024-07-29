import { Database } from "bun:sqlite";
import * as sqlite_vss from "sqlite-vss";
Database.setCustomSQLite("/opt/homebrew/opt/sqlite/lib/libsqlite3.dylib");

export const db = (db_name: string) => {
  // biome-ignore lint: reason
  let db;

  if (db_name === "knowledge") {
    db = new Database("./utils/knowledge/datastore.sqlite");
    sqlite_vss.load(db);
  }

  if (db_name === "telemetry") {
    db = new Database("./telemetry/datastore.sqlite");
  }

  return db;
};
