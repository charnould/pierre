import { Database } from "bun:sqlite";
import { openai } from "@ai-sdk/openai";
import { embed } from "ai";
import * as sqliteVec from "sqlite-vec";

// MacOS *might* have to do this, as the builtin SQLite library on MacOS doesn't allow extensions
Database.setCustomSQLite("/opt/homebrew/opt/sqlite/lib/libsqlite3.dylib"); // when coding on Mac OS X
const db = new Database("./utils/knowledge/datastore.sqlite");
sqliteVec.load(db);

console.log("👉 Start building Knowledge database (est. duration: 10 min)");

const { sqlite_version, vec_version } = db
  .prepare("select sqlite_version() as sqlite_version, vec_version() as vec_version;")
  .get();
console.log(`  sqlite_version=${sqlite_version}, vec_version=${vec_version}`);

db.exec("CREATE VIRTUAL TABLE vectors USING vec0(vector float[3072])");
const query = db.query("SELECT rowid, * FROM chunks").all();

for await (const q of query) {
  const { embedding: vector } = await embed({
    model: openai.embedding("text-embedding-3-large"),
    value: q.chunk,
  });

  db.prepare("INSERT INTO vectors(rowid, vector) VALUES (?, vec_f32(?))").run(q.rowid, new Float32Array(vector));
}

console.log("👉 Knowledge database built");
console.log("   You can safely close your shell");
