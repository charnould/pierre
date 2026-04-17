/**
 * GitHub Copilot SDK integration for PIERRE
 *
 * Manages a singleton CopilotClient and per-conversation sessions.
 * The agent works within a specific knowledge directory determined
 * by the SERVICE env var and the config ID from the URL.
 *
 * Example: SERVICE=pierre-production, config=default
 *   → agent works in datastores/pierre-production/knowledge/default/
 *
 * Agent instructions are loaded from the AGENTS.md in that knowledge folder
 * (auto-discovered by the SDK via workingDirectory).
 */

import { resolve, join } from "node:path";
import { existsSync } from "node:fs";
import { readdir } from "node:fs/promises";
import { CopilotClient, approveAll, type CopilotSession, type SessionEvent } from "@github/copilot-sdk";

// Stable project root anchored to this file's location (utils/ → ../)
const PROJECT_ROOT = resolve(import.meta.dir, "..");

// ---------------------------------------------------------------------------
// Singleton CopilotClient
// ---------------------------------------------------------------------------

let clientPromise: Promise<CopilotClient> | null = null;

const getClient = async (): Promise<CopilotClient> => {
  if (!clientPromise) {
    console.log("[COPILOT] Initializing singleton client...");
    clientPromise = (async () => {
      const c = new CopilotClient();
      await c.start();
      console.log("[COPILOT] Client started");
      return c;
    })();
  }

  const client = await clientPromise;

  if (client.getState() !== "connected") {
    console.warn("[COPILOT] Client disconnected — reinitializing");
    clientPromise = null;
    return getClient();
  }

  return client;
};

// ---------------------------------------------------------------------------
// Per-conversation lock (prevents concurrent turns on the same session)
// ---------------------------------------------------------------------------

const locks = new Map<string, Promise<void>>();

// ---------------------------------------------------------------------------
// Knowledge directory helpers
// ---------------------------------------------------------------------------

/**
 * Resolve the absolute path to a config's knowledge folder.
 * Anchored to PROJECT_ROOT so it works regardless of process.cwd().
 */
const knowledgePath = (configId: string): string => {
  const p = join(PROJECT_ROOT, "datastores", Bun.env.SERVICE!, "knowledge", configId);
  if (!existsSync(p)) {
    throw new Error(`[COPILOT] Knowledge directory not found: ${p}`);
  }
  return p;
};

/** Recursively list all files in a directory, returning paths relative to `root`. */
const listFilesRecursive = async (dir: string, root = dir): Promise<string[]> => {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const full = `${dir}/${entry.name}`;
    if (entry.isDirectory()) {
      files.push(...(await listFilesRecursive(full, root)));
    } else if (entry.name !== "AGENTS.md") {
      files.push(full.slice(root.length + 1));
    }
  }
  return files;
};

// ---------------------------------------------------------------------------
// Session management (private)
// ---------------------------------------------------------------------------

const openSession = async (
  client: CopilotClient,
  convId: string,
  configId: string,
  model: string,
): Promise<CopilotSession> => {
  const kPath = knowledgePath(configId);
  console.log(`[COPILOT] Knowledge path: ${kPath}`);

  const config = {
    workingDirectory: kPath,
    onPermissionRequest: approveAll,
    model,
    streaming: true,
    systemMessage: { mode: "replace" as const, content: "" },
    hooks: {
      onSessionStart: async (
        input: { source: string; initialPrompt?: string },
        invocation: { sessionId: string },
      ): Promise<{ additionalContext?: string } | void> => {
        console.log(`[COPILOT] Session ${invocation.sessionId} started (source=${input.source})`);

        if (input.source !== "resume") {
          try {
            const files = await listFilesRecursive(kPath);
            console.log(`[COPILOT] Injected file listing (${files.length} files)`);
            return {
              additionalContext: [
                "## Available knowledge files (relative to working directory)",
                "",
                ...files.map((f) => `- ${f}`),
              ].join("\n"),
            };
          } catch (err) {
            console.warn("[COPILOT] Could not list knowledge folder:", err);
          }
        }
        return {};
      },
    },
  };

  const metadata = await client.getSessionMetadata(convId);
  if (metadata) {
    console.log(`[COPILOT] Resuming session ${convId}`);
    return client.resumeSession(convId, config);
  }

  console.log(`[COPILOT] Creating new session ${convId}`);
  return client.createSession({ ...config, sessionId: convId });
};

// ---------------------------------------------------------------------------
// Streaming API
// ---------------------------------------------------------------------------

export type CopilotChunk =
  | { type: "delta"; content: string }
  | { type: "reset" }
  | { type: "done"; fullContent: string; reasoning?: string; inputTokens?: number; outputTokens?: number };

/**
 * Stream a response from Copilot as incremental chunks.
 *
 * Yields:
 *   - `delta` chunks as the assistant generates text
 *   - `done` with the authoritative full content and metadata
 *
 * The agent works in: datastores/{SERVICE}/knowledge/{configId}
 */
export async function* streamCopilot(
  convId: string,
  configId: string,
  prompt: string,
  model = "claude-sonnet-4",
  signal?: AbortSignal,
): AsyncGenerator<CopilotChunk> {
  const t0 = Date.now();
  console.log(`\n${"=".repeat(60)}`);
  console.log(`[COPILOT] New request`);
  console.log(`[COPILOT]   conv_id  : ${convId}`);
  console.log(`[COPILOT]   config   : ${configId}`);
  console.log(`[COPILOT]   SERVICE  : ${Bun.env.SERVICE}`);
  console.log(`[COPILOT]   model    : ${model}`);
  console.log(`[COPILOT]   prompt   : "${prompt.substring(0, 120)}${prompt.length > 120 ? "..." : ""}"`);
  console.log(`${"=".repeat(60)}`);

  // Bail early if already aborted
  if (signal?.aborted) throw new DOMException("Request aborted", "AbortError");

  // Inline lock — acquired immediately, released in outer finally
  const prev = locks.get(convId) ?? Promise.resolve();
  let releaseLock!: () => void;
  const lockNext = new Promise<void>((r) => {
    releaseLock = r;
  });
  locks.set(convId, lockNext);
  await prev;

  try {
    // Step 1 — Get client
    console.log(`[COPILOT] Step 1/3 — Getting client...`);
    const t1 = Date.now();
    const client = await getClient();
    console.log(`[COPILOT] Step 1/3 — Client ready (${Date.now() - t1}ms)`);

    // Step 2 — Open session
    console.log(`[COPILOT] Step 2/3 — Opening session...`);
    const t2 = Date.now();
    const session = await openSession(client, convId, configId, model);
    console.log(`[COPILOT] Step 2/3 — Session ready (${Date.now() - t2}ms)`);

    // Queue to bridge event callbacks → async generator
    const queue: CopilotChunk[] = [];
    let notifyConsumer: (() => void) | null = null;
    let streamDone = false;
    let streamError: Error | null = null;

    function enqueue(chunk: CopilotChunk) {
      queue.push(chunk);
      notifyConsumer?.();
      notifyConsumer = null;
    }
    function endStream() {
      streamDone = true;
      notifyConsumer?.();
      notifyConsumer = null;
    }
    function failStream(err: Error) {
      streamError = err;
      notifyConsumer?.();
      notifyConsumer = null;
    }

    // Accumulated state
    let finalContent = "";
    let reasoningContent = "";
    let inputTokens: number | undefined;
    let outputTokens: number | undefined;
    let toolCount = 0;
    const toolNames = new Map<string, string>();

    // Subscribe to events for streaming + debug logging
    const unsubscribe = session.on((event: SessionEvent) => {
      switch (event.type) {
        case "assistant.turn_start":
          console.log(`[COPILOT]   ▶ Turn started`);
          break;

        case "assistant.message_delta":
          enqueue({ type: "delta", content: event.data.deltaContent });
          break;

        case "assistant.reasoning_delta":
          reasoningContent += event.data.deltaContent;
          break;

        case "assistant.reasoning":
          reasoningContent = event.data.content;
          console.log(`[COPILOT]   💭 Reasoning (${reasoningContent.length} chars)`);
          break;

        case "assistant.message":
          if (event.data.toolRequests?.length) {
            // Tool turn — tell the frontend to discard accumulated deltas
            // (they were pre-tool reasoning, not the actual answer)
            enqueue({ type: "reset" });
            console.log(
              `[COPILOT]   🔧 Tool requests (reset streamed deltas): ${event.data.toolRequests.map((t: { name: string }) => t.name).join(", ")}`,
            );
          } else {
            finalContent = event.data.content;
            console.log(`[COPILOT]   ✉ Final message (${finalContent.length} chars)`);
          }
          break;

        case "tool.execution_start":
          toolCount++;
          toolNames.set(event.data.toolCallId, event.data.toolName);
          console.log(`[COPILOT]   ↳ Tool #${toolCount} start: ${event.data.toolName}`);
          break;

        case "tool.execution_complete": {
          const name = toolNames.get(event.data.toolCallId) ?? event.data.toolCallId;
          console.log(`[COPILOT]   ↳ Tool done: ${name} (success=${event.data.success})`);
          break;
        }

        case "assistant.usage":
          inputTokens = event.data.inputTokens;
          outputTokens = event.data.outputTokens;
          console.log(
            `[COPILOT]   📊 Tokens — in: ${inputTokens ?? "?"}, out: ${outputTokens ?? "?"}, model: ${event.data.model}`,
          );
          break;

        case "session.error":
          console.error(`[COPILOT]   ❌ Session error: ${event.data.message}`);
          failStream(new Error(event.data.message));
          break;

        case "assistant.turn_end":
          console.log(`[COPILOT]   ■ Turn ended`);
          break;

        case "session.idle":
          console.log(`[COPILOT]   ⏸ Session idle`);
          enqueue({
            type: "done",
            fullContent: finalContent,
            reasoning: reasoningContent || undefined,
            inputTokens,
            outputTokens,
          });
          endStream();
          break;
      }
    });

    // Wire abort signal
    const abortHandler = () => {
      console.log("[COPILOT] ⚠ Abort signal received — aborting session");
      session.abort().catch(() => {});
      // Safety: if SDK doesn't fire idle/error within 5s, force-end
      setTimeout(() => {
        if (!streamDone) failStream(new DOMException("Request aborted", "AbortError"));
      }, 5_000);
    };
    signal?.addEventListener("abort", abortHandler, { once: true });

    // Safety timeout (180s)
    const timeoutId = setTimeout(() => {
      if (!streamDone) failStream(new Error("Timeout: no response within 180s"));
    }, 180_000);

    // Step 3 — Send prompt (non-blocking; events arrive via listener)
    console.log(`[COPILOT] Step 3/3 — Sending prompt...`);
    const t3 = Date.now();
    await session.send({ prompt });
    console.log(`[COPILOT] Step 3/3 — Prompt sent (${Date.now() - t3}ms), streaming events...`);

    // Consume queue — yield chunks to the caller
    try {
      while (true) {
        if (queue.length === 0 && !streamDone && !streamError) {
          await new Promise<void>((r) => {
            notifyConsumer = r;
          });
        }
        while (queue.length > 0) {
          yield queue.shift()!;
        }
        if (streamError) throw streamError;
        if (streamDone) break;
      }
    } finally {
      clearTimeout(timeoutId);
      signal?.removeEventListener("abort", abortHandler);
      unsubscribe();
      await session.disconnect().catch((e) => console.warn("[COPILOT] Disconnect error (ignored):", e));
    }

    console.log(`[COPILOT] ✅ Complete (total: ${Date.now() - t0}ms, tools: ${toolCount})`);
    if (inputTokens || outputTokens) console.log(`[COPILOT]   Tokens — in: ${inputTokens}, out: ${outputTokens}`);
  } finally {
    releaseLock();
    if (locks.get(convId) === lockNext) locks.delete(convId);
  }
}
