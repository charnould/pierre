import type { AuthContext } from '../../../utils/authenticate-user'
import { deleteUserAsAdministrator } from '../../../utils/handle-user'

export const deleteUser = async (c: AuthContext) => {
  const email = (c.req.param('email') ?? '').trim().toLowerCase()
  const actor = c.get('user')
  const deleted = await deleteUserAsAdministrator(actor.email, email)
  if (!deleted.ok) {
    const messages = {
      user_not_found: 'Utilisateur introuvable.',
      cannot_demote_self: 'Vous ne pouvez pas retirer votre propre accès administrateur.',
      cannot_delete_self: 'Vous ne pouvez pas supprimer votre propre compte.',
      last_administrator: 'Le dernier administrateur ne peut pas être supprimé.'
    }
    return c.json(
      { error: { code: deleted.code, message: messages[deleted.code] } },
      deleted.code === 'user_not_found' ? 404 : 409
    )
  }
  return c.json({ data: { email } })
}
