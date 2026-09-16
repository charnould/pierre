import { z } from 'zod/v4'

import { isBusinessModuleId, type BusinessModuleId } from '../../../../../shared/modules'
import { listChatbotSummaries } from '../../../../utils/chatbot-config'

const BusinessModuleIdSchema = z.custom<BusinessModuleId>(isBusinessModuleId)
const Password = z.string().min(8).max(128)
const AccessFields = {
  isAdministrator: z.boolean(),
  moduleIds: z.array(BusinessModuleIdSchema),
  chatbotIds: z.array(z.string().trim().min(1))
}

const ProfileId = z.string().trim().min(1).nullable()

export const CreateUserBody = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email()),
  ...AccessFields,
  profileId: ProfileId.optional(),
  password: Password
})

export const PatchUserBody = z
  .object({
    isAdministrator: AccessFields.isAdministrator.optional(),
    moduleIds: AccessFields.moduleIds.optional(),
    chatbotIds: AccessFields.chatbotIds.optional(),
    profileId: ProfileId.optional(),
    password: Password.optional()
  })
  .superRefine((value, context) => {
    if (Object.keys(value).length === 0) {
      context.addIssue({ code: 'custom', message: 'At least one field is required' })
    }
  })

export const ProfileBody = z.object({
  name: z.string().trim().min(1).max(80),
  moduleIds: AccessFields.moduleIds,
  chatbotIds: AccessFields.chatbotIds
})

export const PatchProfileBody = z
  .object({
    name: z.string().trim().min(1).max(80).optional(),
    moduleIds: AccessFields.moduleIds.optional(),
    chatbotIds: AccessFields.chatbotIds.optional()
  })
  .superRefine((value, context) => {
    if (Object.keys(value).length === 0) {
      context.addIssue({ code: 'custom', message: 'At least one field is required' })
    }
  })

export async function validateChatbotIds(chatbotIds: readonly string[]): Promise<boolean> {
  const available = new Set((await listChatbotSummaries()).map(({ id }) => id))
  return chatbotIds.every((id) => available.has(id))
}

const profileMessages = {
  profile_not_found: 'Profil introuvable.',
  profile_in_use: 'Ce profil est encore affecté à des utilisateurs.',
  profile_name_taken: 'Un profil avec ce nom existe déjà.'
} as const

export function profileError(code: keyof typeof profileMessages) {
  return {
    error: { code, message: profileMessages[code] },
    status: code === 'profile_not_found' ? 404 : 409
  } as const
}

export function invalidBody(error: z.ZodError) {
  return {
    error: {
      code: 'invalid_body',
      message: error.issues.map((issue) => issue.message).join('; ')
    }
  }
}
