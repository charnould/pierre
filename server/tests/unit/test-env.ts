if (!Bun.env['AUTH_SECRET'] || Bun.env['AUTH_SECRET'].length < 32) {
  Bun.env['AUTH_SECRET'] = 's'.repeat(32)
}
if (!Bun.env['AUTH_BEARER']) Bun.env['AUTH_BEARER'] = 'test-bearer'
