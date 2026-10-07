import { closeSync, fsyncSync, openSync, renameSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'

import { must, type Context } from './system.ts'

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
  const file = openSync(temporary, 'r')
  fsyncSync(file)
  closeSync(file)
  renameSync(temporary, path)
  const directory = openSync(dirname(path), 'r')
  fsyncSync(directory)
  closeSync(directory)
  await must(ctx.runtime, 'systemctl', ['daemon-reload'])
}

export async function writeServerUnit(ctx: Context) {
  await writeUnit(ctx, serverUnit(ctx))
}
