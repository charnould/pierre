export async function formatMarkdown(source: string): Promise<string> {
  if (!source.trim()) return ''
  const proc = Bun.spawn(
    [
      process.execPath,
      'fmt',
      '--no-config',
      '--no-editorconfig',
      '--no-script',
      '--embedded-language-formatting=off',
      '--parser',
      'markdown'
    ],
    {
      env: { BUN_BE_BUN: '1' },
      stdin: new TextEncoder().encode(source),
      stdout: 'pipe',
      stderr: 'pipe'
    }
  )
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited
  ])
  if (exitCode !== 0) {
    throw new Error(stderr.trim() || `bun fmt exited ${exitCode}`)
  }
  return stdout
}
