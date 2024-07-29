import type { Context } from "hono";
import { score_conversation } from "../utils/handle-conversation";

export const controller = async (c: Context) => {
  const body = await c.req.parseBody();
  const id = c.req.query("id") as string;

  score_conversation(
    {
      id: id,
      scorer: body.scorer,
      score: body.score,
      comment: body.comment,
    },
    true,
  );

  return c.redirect("/admin/chats");
};
