import packageJson from '../package.json' with { type: 'json' }

export const CLI_VERSION = `cli-${packageJson.version}`
