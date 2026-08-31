export type OrgUser = {
  login: string
  email: string
  role: string
  config: string[]
  hasAvatar: boolean
  avatarBytes: number
  /** Resolved label: custom display name or email local-part. */
  displayName: string
}

export type UsersListResponse = {
  users: OrgUser[]
}

export type PatchMyPreferencesPayload = {
  url: string
  avatar?: null
  display_name?: string | null
}

export type PatchMyPreferencesResponse = {
  data: {
    hasAvatar: boolean
    displayName: string
  }
}

export type UploadMyAvatarPayload = {
  url: string
  name: string
  type: string
  buffer: ArrayBuffer
}

export type UploadMyAvatarResponse = {
  data: {
    hasAvatar: boolean
    avatarBytes: number
    displayName: string
  }
}

export type GetAvatarPayload = {
  url: string
  login: string
}

/** Native file dialog + main-process decode. `null` if the user cancelled. */
export type PickedAvatarImage = {
  name: string
  type: string
  buffer: ArrayBuffer
  width: number
  height: number
}
