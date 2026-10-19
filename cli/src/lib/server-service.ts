import { renameSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'

import { fsyncPath } from './fs.ts'
import { must, type Context, type Runtime } from './system.ts'

export function serverUnit(ctx: Context): string {
  const { bin, envFile, home, serverCurrent } = ctx.runtime.paths
  return `[Unit]
Description=PIERRE
After=network-online.target
Wants=network-online.target

[Service]
Environment=NODE_ENV=production
Environment=PIERRE_HOME=${home}
Environment=LD_LIBRARY_PATH=${serverCurrent}
EnvironmentFile=${envFile}
ExecStart=${bin}
Restart=on-failure
RestartSec=2

[Install]
WantedBy=multi-user.target
`
}

export async function writeUnit(ctx: Context, content: string) {
  const path = ctx.runtime.paths.unitFile
  const temporary = `${path}.new`
  writeFileSync(temporary, content)
  fsyncPath(temporary)
  renameSync(temporary, path)
  fsyncPath(dirname(path))
  await must(ctx.runtime, 'systemctl', ['daemon-reload'])
}

export async function writeServerUnit(ctx: Context) {
  await writeUnit(ctx, serverUnit(ctx))
}

export function isHealthyResponse(status: number, body: string): boolean {
  return status >= 200 && status < 300 && body.trim() === 'ok'
}

export async function waitForBody(
  runtime: Runtime,
  url: string,
  attempts: number,
  timeoutMs = 2000
): Promise<boolean> {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const response = await runtime.request(url, { timeoutMs })
    if (isHealthyResponse(response.status, response.body)) return true
    if (attempt < attempts) await runtime.sleep(1000)
  }
  return false
}
