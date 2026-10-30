export async function formatText(filename: string, source: string): Promise<string> {
  const proc = Bun.spawn([process.execPath, 'fmt', '--stdin-filepath', filename], {
    stdin: new TextEncoder().encode(source),
    stdout: 'pipe',
    stderr: 'pipe'
  })
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited
  ])
  if (exitCode !== 0) throw new Error(stderr.trim() || `bun fmt exited ${exitCode}`)
  return stdout
}
