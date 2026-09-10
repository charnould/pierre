import { z } from 'zod/v4'

import { isBusinessModuleId, type BusinessModuleId } from '../../../../../shared/modules'
import type { User } from '../../../../utils/_schema'
import { listChatbotSummaries } from '../../../../utils/chatbot-config'

const BusinessModuleIdSchema = z.custom<BusinessModuleId>(isBusinessModuleId)
const AccessFields = {
  isAdministrator: z.boolean(),
  moduleIds: z.array(BusinessModuleIdSchema),
  chatbotIds: z.array(z.string().trim().min(1))
}

export const CreateUserBody = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email()),
  ...AccessFields,
  password: z.string().min(1)
})

export const PatchUserBody = z
  .object({
    isAdministrator: AccessFields.isAdministrator.optional(),
    moduleIds: AccessFields.moduleIds.optional(),
    chatbotIds: AccessFields.chatbotIds.optional(),
    password: z.string().min(1).optional()
  })
  .superRefine((value, context) => {
    if (Object.keys(value).length === 0) {
      context.addIssue({ code: 'custom', message: 'At least one field is required' })
    }
  })

export type AdminUser = Omit<User, 'passwordHash'>

export const toAdminUser = ({ passwordHash: _passwordHash, ...user }: User): AdminUser => user

export async function validateChatbotIds(chatbotIds: readonly string[]): Promise<boolean> {
  const available = new Set((await listChatbotSummaries()).map(({ id }) => id))
  return chatbotIds.every((id) => available.has(id))
}

export function invalidBody(error: z.ZodError) {
  return {
    error: {
      code: 'invalid_body',
      message: error.issues.map((issue) => issue.message).join('; ')
    }
  }
}
