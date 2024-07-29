import { Database } from "bun:sqlite";
import { openai } from "@ai-sdk/openai";
import { embed } from "ai";
import * as sqlite_vss from "sqlite-vss";

Database.setCustomSQLite("/opt/homebrew/opt/sqlite/lib/libsqlite3.dylib"); // when coding on Mac OS X
const db = new Database("./utils/knowledge/datastore.sqlite");
sqlite_vss.load(db);

db.exec("CREATE VIRTUAL TABLE vectors using vss0(vector(3072));");
const query = db.query("SELECT rowid, * FROM chunks").all();

console.log("👉 Start building Knowledge database (est. duration: 10 min)");

for await (const q of query) {
  const { embedding: vector } = await embed({
    model: openai.embedding("text-embedding-3-large"),
    value: q.chunk,
  });

  db.prepare("INSERT INTO vectors(rowid, vector) VALUES (?, ?)").run(q.rowid, JSON.stringify(vector));
}

console.log("👉 Knowledge database built");
console.log("   You can safely close your shell");
