import { _ } from "lodash";

export const rank_chunks = (arr) => {
  const flat = _.flattenDeep(arr);
  const grouped = _.groupBy(flat, "rowid");

  const best = [];
  for (const property in grouped) {
    const min = _.minBy(grouped[property], "distance");
    best.push(min);
  }

  const rev = _.sortBy(best, ["distance"]);

  const only_first = _.take(rev, 5);

  const final = [];

  for (const r of only_first) final.push(r.chunk.replace(/\n/g, " ").trim());

  return final;
};
