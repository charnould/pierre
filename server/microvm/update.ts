import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

type Download = { sha256: string; url: string }
type Versions = {
  node: {
    version: string
    'linux-amd64': Download
    'linux-arm64': Download
  }
  smolvm: {
    version: string
    'darwin-arm64': Download
    'linux-amd64': Download
  }
  ubuntuImage: string
  ubuntuSnapshot: string
}

const ROOT = import.meta.dir
const VERSIONS_PATH = join(ROOT, 'versions.json')
const GUEST_PACKAGE = join(ROOT, 'guest/package.json')
const GUEST_LOCK = join(ROOT, 'guest/package-lock.json')
const SEMVER = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/
const UBUNTU_DIGEST = /^docker\.io\/library\/ubuntu@sha256:[a-f0-9]{64}$/

export function parseArgs(args: string[]) {
  const values: Record<string, string> = {}
  let rebuild = false
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]!
    if (arg === '--rebuild') {
      rebuild = true
      continue
    }
    if (!['--smolvm', '--pi', '--node', '--ubuntu', '--ubuntu-snapshot'].includes(arg)) {
      throw new Error(`Unknown argument: ${arg}`)
    }
    const value = args[index + 1]
    if (!value || value.startsWith('--')) throw new Error(`Missing value for ${arg}`)
    values[arg.slice(2)] = value
    index += 1
  }
  if (!rebuild && Object.keys(values).length === 0) {
    throw new Error('Provide explicit versions or --rebuild')
  }
  return { rebuild, values }
}

async function text(url: string): Promise<string> {
  const response = await fetch(url, { headers: { 'user-agent': 'pierre-microvm-update' } })
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`)
  return response.text()
}

function checksum(source: string, name: string): string {
  const line = source
    .split('\n')
    .map((value) => value.trim().split(/\s+/))
    .find((fields) => fields[1] === name)
  if (!line?.[0] || !/^[a-f0-9]{64}$/.test(line[0])) {
    throw new Error(`Missing checksum for ${name}`)
  }
  return line[0]
}

async function smolvm(version: string): Promise<Versions['smolvm']> {
  if (!SEMVER.test(version)) throw new Error(`Invalid smolvm version: ${version}`)
  const base = `https://github.com/smol-machines/smolvm/releases/download/v${version}`
  const checksums = await text(`${base}/checksums.sha256`)
  const darwin = `smolvm-${version}-darwin-arm64.tar.gz`
  const linux = `smolvm-${version}-linux-x86_64.tar.gz`
  return {
    version,
    'darwin-arm64': {
      url: `${base}/${darwin}`,
      sha256: checksum(checksums, darwin)
    },
    'linux-amd64': {
      url: `${base}/${linux}`,
      sha256: checksum(checksums, linux)
    }
  }
}

async function node(version: string): Promise<Versions['node']> {
  if (!SEMVER.test(version)) throw new Error(`Invalid Node version: ${version}`)
  const base = `https://nodejs.org/dist/v${version}`
  const checksums = await text(`${base}/SHASUMS256.txt`)
  const arm64 = `node-v${version}-linux-arm64.tar.xz`
  const amd64 = `node-v${version}-linux-x64.tar.xz`
  return {
    version,
    'linux-amd64': {
      url: `${base}/${amd64}`,
      sha256: checksum(checksums, amd64)
    },
    'linux-arm64': {
      url: `${base}/${arm64}`,
      sha256: checksum(checksums, arm64)
    }
  }
}

async function validatePi(version: string) {
  if (!SEMVER.test(version)) throw new Error(`Invalid Pi version: ${version}`)
  const response = await fetch(
    `https://registry.npmjs.org/@earendil-works%2Fpi-coding-agent/${version}`
  )
  if (!response.ok) throw new Error(`Pi ${version} is not published`)
}

async function run(command: string[], cwd = ROOT) {
  const process = Bun.spawn(command, { cwd, stderr: 'inherit', stdout: 'inherit' })
  const code = await process.exited
  if (code !== 0) throw new Error(`${command.join(' ')} exited with ${code}`)
}

async function main() {
  if (process.platform !== 'darwin' || process.arch !== 'arm64') {
    throw new Error('microvm:update requires a bare-metal macOS ARM64 host')
  }
  const { values } = parseArgs(Bun.argv.slice(2))
  const versions = JSON.parse(await readFile(VERSIONS_PATH, 'utf8')) as Versions
  const guestPackage = JSON.parse(await readFile(GUEST_PACKAGE, 'utf8')) as {
    dependencies: Record<string, string>
  }

  if (values['smolvm']) versions.smolvm = await smolvm(values['smolvm'])
  if (values['node']) versions.node = await node(values['node'])
  if (values['ubuntu']) {
    if (!UBUNTU_DIGEST.test(values['ubuntu'])) {
      throw new Error('Ubuntu must be an immutable docker.io/library/ubuntu@sha256 digest')
    }
    versions.ubuntuImage = values['ubuntu']
  }
  if (values['ubuntu-snapshot']) {
    if (!/^http:\/\/snapshot\.ubuntu\.com\/ubuntu\/\d{8}T\d{6}Z$/.test(values['ubuntu-snapshot'])) {
      throw new Error('Ubuntu snapshot must be an immutable snapshot.ubuntu.com timestamp')
    }
    versions.ubuntuSnapshot = values['ubuntu-snapshot']
  }
  if (values['pi']) {
    await validatePi(values['pi'])
    guestPackage.dependencies['@earendil-works/pi-coding-agent'] = values['pi']
  }

  const versionsBackup = await readFile(VERSIONS_PATH)
  const packageBackup = await readFile(GUEST_PACKAGE)
  const lockBackup = await readFile(GUEST_LOCK)
  try {
    await writeFile(VERSIONS_PATH, `${JSON.stringify(versions, null, 2)}\n`)
    await writeFile(GUEST_PACKAGE, `${JSON.stringify(guestPackage, null, 2)}\n`)
    await run(['npm', 'install', '--package-lock-only', '--ignore-scripts'], join(ROOT, 'guest'))
    await run(['bash', join(ROOT, 'scripts/build.sh'), 'darwin-arm64'])
  } catch (error) {
    await writeFile(VERSIONS_PATH, versionsBackup)
    await writeFile(GUEST_PACKAGE, packageBackup)
    await writeFile(GUEST_LOCK, lockBackup)
    throw error
  }

  console.log(
    'macOS ARM64 build passed. Commit the candidate so Linux CI can validate the same SHA.'
  )
}

if (import.meta.main) await main()
