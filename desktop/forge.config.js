const platformIcon = {
  darwin: 'src/assets/icons/macos/icon',
  win32: 'src/assets/icons/windows/icon',
  linux: 'src/assets/icons/linux/icons/512x512'
}[process.platform]

export default {
  packagerConfig: {
    name: 'pierre',
    executableName: 'pierre',
    appBundleId: 'com.pierre.hlm',
    appCategoryType: 'public.app-category.productivity',
    icon: platformIcon,
    extraResources: [
      { from: 'src/assets/icons/windows/icon.ico', to: 'icons/windows/icon.ico' },
      { from: 'src/assets/icons/linux/icons/512x512.png', to: 'icons/linux/icons/512x512.png' }
    ],
    ignore: [
      /node_modules/,
      /^\/src\//,
      /^\/main\.ts$/,
      /^\/preload\.cjs$/,
      /input\.css$/,
      /electron\.vite\.config\.ts$/,
      /forge\.config\.js$/,
      /tsconfig\.json$/,
      /\.gitignore$/
    ]
  },
  makers: [
    {
      name: '@electron-forge/maker-dmg',
      config: {
        icon: 'src/assets/icons/macos/icon.icns'
      }
    },
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin']
    },
    {
      name: '@electron-forge/maker-squirrel',
      config: {
        name: 'pierre',
        setupIcon: 'src/assets/icons/windows/icon.ico'
      }
    }
  ]
}
