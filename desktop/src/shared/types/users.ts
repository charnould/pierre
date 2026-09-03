import type { BusinessModuleId } from '../../../../shared/modules'

export type OrgUser = {
  login: string
  email: string
  hasAvatar: boolean
  avatarBytes: number
  avatarVersion: number
  /** Resolved label: custom display name or email local-part. */
  displayName: string
}

export type UsersListResponse = {
  users: OrgUser[]
}

export type UserPrincipal = {
  email: string
  isAdministrator: boolean
  moduleIds: BusinessModuleId[]
  chatbotIds: string[]
}

export type AdminUserProfile = {
  id: string
  name: string
  moduleIds: BusinessModuleId[]
  chatbotIds: string[]
}

export type AdminUser = UserPrincipal & { profileId: string | null }

export type AdminUsersData = {
  users: AdminUser[]
  profiles: AdminUserProfile[]
  modules: Array<{ id: BusinessModuleId; label: string }>
  chatbots: Array<{ id: string; label: string }>
}

type AdminApiError = {
  error: {
    code: string
    message: string
    details?: Array<{ row: number; message: string }>
  }
}

export type AdminUsersResponse = { data: AdminUsersData } | AdminApiError

export type SaveAdminUserPayload = {
  url: string
  email: string
  isAdministrator: boolean
  moduleIds: BusinessModuleId[]
  chatbotIds: string[]
  profileId: string | null
  password: string
}

export type PatchAdminUserPayload = Partial<Omit<SaveAdminUserPayload, 'url' | 'email'>> & {
  url: string
  email: string
}

export type AdminUserMutationResponse =
  | {
      data: {
        user: AdminUser
      }
    }
  | AdminApiError

export type DeleteAdminUserResponse = { data: { email: string } } | AdminApiError

export type ImportAdminUsersResponse =
  | { data: { created: number; updated: number } }
  | AdminApiError

export type SaveAdminUserProfilePayload = {
  url: string
  name: string
  moduleIds: BusinessModuleId[]
  chatbotIds: string[]
}

export type PatchAdminUserProfilePayload = Partial<Omit<SaveAdminUserProfilePayload, 'url'>> & {
  url: string
  id: string
}

export type AdminUserProfileMutationResponse =
  | { data: { profile: AdminUserProfile } }
  | AdminApiError

export type DeleteAdminUserProfileResponse = { data: { id: string } } | AdminApiError

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
    avatarVersion: number
    displayName: string
  }
}

export type GetAvatarPayload = {
  url: string
  email: string
}

/** Native file dialog + main-process decode. `null` if the user cancelled. */
export type PickedAvatarImage = {
  name: string
  type: string
  buffer: ArrayBuffer
  width: number
  height: number
}
