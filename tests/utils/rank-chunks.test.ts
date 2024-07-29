import { expect, test } from "bun:test";
import { rank_chunks } from "../../utils/rank-chunks";

const input = [
  [
    { chunk: "aa", id: "a", score: 3.5 },
    { chunk: "bb", id: "b", score: 4.9 },
    { chunk: "cc", id: "c", score: -13 },
    { chunk: "dd", id: "d", score: 789 },
  ],
  [
    { chunk: "aa", id: "a", score: 127 },
    { chunk: "ee", id: "e", score: 456 },
  ],
];

const output: string[] = ["dd", "ee", "aa", "bb", "cc"];

test("Rerank", () => expect(rank_chunks(input)).toEqual(output));
