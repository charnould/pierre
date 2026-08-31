import { type MakeResult, renameReleaseArtifacts } from './forge/rename-release-artifacts.ts'

const platformIcons: Partial<Record<NodeJS.Platform, string>> = {
  darwin: 'src/assets/icons/macos/icon',
  win32: 'src/assets/icons/windows/icon',
  linux: 'src/assets/icons/linux/icons/512x512'
}

const platformIcon = platformIcons[process.platform]

export default {
  packagerConfig: {
    name: 'pierre',
    executableName: 'pierre',
    appBundleId: 'com.pierre.hlm',
    appCategoryType: 'public.app-category.productivity',
    icon: platformIcon,
    // Ad-hoc signing on macOS: transforms the "damaged app" Gatekeeper hard-block
    // into an "unidentified developer" warning that users can bypass via right-click > Open.
    // A proper Apple Developer ID certificate + notarization would remove this warning entirely.
    ...(process.platform === 'darwin' && { osxSign: { identity: '-' } }),
    extraResources: [
      { from: 'src/assets/icons/windows/icon.ico', to: 'icons/windows/icon.ico' },
      { from: 'src/assets/icons/linux/icons/512x512.png', to: 'icons/linux/icons/512x512.png' },
      { from: 'src/assets/report', to: 'report' },
      { from: 'src/assets/fonts', to: 'fonts' }
    ],
    ignore: [
      /node_modules/,
      /^\/src\//,
      /^\/electron\/main\.ts$/,
      /^\/preload\/index\.(cjs|ts)$/,
      /input\.css$/,
      /electron\.vite\.config\.ts$/,
      /forge\.config\.js$/,
      /forge\.config\.ts$/,
      /tsconfig\.json$/,
      /\.gitignore$/
    ]
  },
  makers: [
    {
      name: '@electron-forge/maker-dmg',
      platforms: ['darwin'],
      config: { icon: 'src/assets/icons/macos/icon.icns' }
    },
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin']
    },
    {
      name: '@electron-forge/maker-squirrel',
      platforms: ['win32'],
      config: {
        name: 'pierre',
        setupExe: 'pierre-win32-setup.exe',
        setupIcon: 'src/assets/icons/windows/icon.ico',
        iconUrl:
          'https://raw.githubusercontent.com/charnould/pierre/master/desktop/src/assets/icons/windows/icon.ico',
        noDelta: true
      }
    }
  ],
  publishers: [
    {
      name: '@electron-forge/publisher-github',
      config: {
        repository: {
          owner: 'charnould',
          name: 'pierre'
        },
        tagPrefix: '',
        draft: false,
        prerelease: false
      }
    }
  ],
  hooks: {
    postMake: async (_forgeConfig: unknown, makeResults: MakeResult[]) =>
      renameReleaseArtifacts(makeResults)
  }
}
