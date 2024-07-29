import { openai } from "@ai-sdk/openai";
import { embed } from "ai";
import { db } from "../utils/database";

export const vector_search = async (data) => {
  const results = [];

  const { embedding } = await embed({
    model: openai.embedding("text-embedding-3-large"),
    value: data,
  });

  const vectors = db("knowledge")
    .prepare(
      `
      select rowid as id, distance as score, 'vectors' as type
      from vectors
      where vss_search(vector, ?)
      order by score
      limit 3;`,
    )
    .all(JSON.stringify(embedding));

  for (const v of vectors) {
    const test = db("knowledge")
      .prepare(
        `
        select * from chunks
        where rowid = ?;`,
      )
      .get(v.id);

    results.push({ ...v, ...test });
  }

  try {
    return results;
  } catch (err) {
    console.error(err);
    return;
  }
};
