import { Database } from "bun:sqlite";
import { readdir } from "node:fs/promises";
import * as prettier from "prettier";

// Create database
Database.setCustomSQLite("/opt/homebrew/opt/sqlite/lib/libsqlite3.dylib"); // when coding on Mac OS X
const db = new Database("./utils/knowledge/datastore.sqlite");

// const version = db.prepare('select vss_version()').get()
// console.log(version)

db.exec("CREATE VIRTUAL TABLE chunks USING FTS5(chunk);");

const files = await readdir("knowledge", { recursive: true });

let chunks_report = `| chunkpath/index | length | status |
                     |------------|--------|--------|`;

for await (const file of files) {
  if (file.endsWith(".md") && !file.endsWith("TABLE_OF_CONTENTS.md") && !file.endsWith("CHUNKS_REPORT.md")) {
    const content = Bun.file(`knowledge/${file}`);
    const data = await content.text();
    const splitted_data = data.split(/[^#]##\s/);

    for (let index = 1; index < splitted_data.length; index++) {
      const chunk = `${splitted_data[0]}\n## ${splitted_data[index].trim()}`;
      const filepath = `${file.split(".")[0]}/${index}`.split("/").join(" / ");

      chunks_report += `\n| ${filepath} | ${chunk.length} | ${chunk.length >= 7800 ? "🟢" : "🔴"} |`;
      db.prepare("INSERT INTO chunks(chunk) VALUES(?);").run(chunk);
    }
  }
}

const pretty = await prettier.format(chunks_report, { parser: "markdown" });
await Bun.write("knowledge/CHUNKS_REPORT.md", pretty);
console.log("👉 New CHUNKS_REPORT.md generated");
console.log("👉 New chunks saved into knowledge.sqlite");
