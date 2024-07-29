import { Hono } from "hono";
import { serveStatic } from "hono/bun";
import { secureHeaders } from "hono/secure-headers";

import { controller as get_ai } from "./controllers/GET.ai";
import { controller as get_chats } from "./controllers/GET.chats";
import { controller as get_index } from "./controllers/GET.index";
import { controller as post_login } from "./controllers/POST.login";
import { controller as post_review } from "./controllers/POST.review";
import { controller as post_telemetry } from "./controllers/POST.telemetry";
import { authenticate } from "./utils/authenticate-reviewer";

const app = new Hono();

// To allow other websites to iframe Pierre
// Must be modified to allow only a few domains
app.use(
  secureHeaders({
    contentSecurityPolicy: { frameAncestors: ["*"] },
    crossOriginResourcePolicy: false,
  }),
);

app.use("/assets/*", serveStatic({ root: "./" }));

app.get("/ai/:id", get_ai);
app.get("/c/:id", get_index);

app.post("/telemetry", post_telemetry);

app.get("/admin", (c) => c.redirect("/admin/chats"));
app.get("/admin/chats", authenticate, get_chats);
app.post("/admin/chats", authenticate, post_review);
app.post("/admin/login", post_login);

app.notFound(async (c) => {
  const baseurl = `/c/${crypto.randomUUID()}?config=`;
  try {
    await import(`./assets/${c.req.query("config")}/config`);
    return c.redirect(baseurl + c.req.query("config"));
  } catch {
    return c.redirect(`${baseurl}_default`);
  }
});

app.onError((_err, c) => c.notFound());

export default app;
