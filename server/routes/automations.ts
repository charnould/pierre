import { Hono } from 'hono'

import { type AuthContext, authenticate, type AuthEnv } from '../utils/authenticate-user'
import { authorizeModule } from '../utils/authorize-role'
import { run_automation_now } from '../utils/automations/run'
import { CreateAutomationBodySchema, PatchAutomationBodySchema } from '../utils/automations/schemas'
import {
  AutomationsError,
  create_automation,
  delete_automation,
  list_automations,
  set_automation_pin,
  update_automation
} from '../utils/automations/store'

export const listAutomations = async (c: AuthContext) => {
  const user = c.get('user')
  try {
    return c.json({ data: list_automations(user.email, user.email) })
  } catch (error) {
    if (error instanceof AutomationsError) {
      return c.json({ error: { code: error.code, message: error.message } }, 400)
    }
    console.error('[automations.list]', error)
    return c.json({ error: { code: 'internal_error', message: 'Failed to list automations' } }, 500)
  }
}

export const createAutomation = async (c: AuthContext) => {
  const user = c.get('user')
  let body: unknown
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: { code: 'invalid_body', message: 'Invalid JSON body' } }, 400)
  }
  const parsed = CreateAutomationBodySchema.safeParse(body)
  if (!parsed.success) {
    return c.json(
      {
        error: {
          code: 'invalid_body',
          message: parsed.error.issues.map((i) => i.message).join('; ')
        }
      },
      400
    )
  }
  try {
    return c.json({ data: await create_automation(user.email, parsed.data) }, 201)
  } catch (error) {
    if (error instanceof AutomationsError) {
      const status = error.code === 'forbidden' ? 403 : 400
      return c.json({ error: { code: error.code, message: error.message } }, status)
    }
    console.error('[automations.create]', error)
    return c.json(
      { error: { code: 'internal_error', message: 'Failed to create automation' } },
      500
    )
  }
}

export const patchAutomation = async (c: AuthContext) => {
  const user = c.get('user')
  const id = c.req.param('id')
  if (!id) {
    return c.json({ error: { code: 'invalid_body', message: 'Missing id' } }, 400)
  }
  let body: unknown
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: { code: 'invalid_body', message: 'Invalid JSON body' } }, 400)
  }
  const parsed = PatchAutomationBodySchema.safeParse(body)
  if (!parsed.success) {
    return c.json(
      {
        error: {
          code: 'invalid_body',
          message: parsed.error.issues.map((i) => i.message).join('; ')
        }
      },
      400
    )
  }
  try {
    return c.json({ data: await update_automation(id, user.email, parsed.data) })
  } catch (error) {
    if (error instanceof AutomationsError) {
      const status = error.code === 'not_found' ? 404 : error.code === 'forbidden' ? 403 : 400
      return c.json({ error: { code: error.code, message: error.message } }, status)
    }
    console.error('[automations.patch]', error)
    return c.json(
      { error: { code: 'internal_error', message: 'Failed to update automation' } },
      500
    )
  }
}

export const deleteAutomation = async (c: AuthContext) => {
  const user = c.get('user')
  const id = c.req.param('id')
  if (!id) {
    return c.json({ error: { code: 'invalid_body', message: 'Missing id' } }, 400)
  }
  try {
    delete_automation(id, user.email)
    return c.json({ data: { deleted: true } })
  } catch (error) {
    if (error instanceof AutomationsError) {
      const status = error.code === 'not_found' ? 404 : error.code === 'forbidden' ? 403 : 400
      return c.json({ error: { code: error.code, message: error.message } }, status)
    }
    console.error('[automations.delete]', error)
    return c.json(
      { error: { code: 'internal_error', message: 'Failed to delete automation' } },
      500
    )
  }
}

export const runAutomation = async (c: AuthContext) => {
  const user = c.get('user')
  const id = c.req.param('id')
  if (!id) {
    return c.json({ error: { code: 'invalid_body', message: 'Missing id' } }, 400)
  }
  try {
    const data = await run_automation_now(id, user.email)
    return c.json({ data })
  } catch (error) {
    if (error instanceof AutomationsError) {
      const status =
        error.code === 'not_found'
          ? 404
          : error.code === 'forbidden'
            ? 403
            : error.code === 'conflict'
              ? 409
              : error.code === 'unavailable'
                ? 503
                : 400
      return c.json({ error: { code: error.code, message: error.message } }, status)
    }
    console.error('[automations.run]', error)
    return c.json({ error: { code: 'internal_error', message: 'Failed to run automation' } }, 500)
  }
}

export const pinAutomation = async (c: AuthContext) => {
  const user = c.get('user')
  const id = c.req.param('id')
  if (!id) {
    return c.json({ error: { code: 'invalid_body', message: 'Missing id' } }, 400)
  }
  try {
    return c.json({ data: set_automation_pin(id, user.email, user.email, true) })
  } catch (error) {
    if (error instanceof AutomationsError) {
      const status = error.code === 'not_found' ? 404 : error.code === 'forbidden' ? 403 : 400
      return c.json({ error: { code: error.code, message: error.message } }, status)
    }
    console.error('[automations.pin]', error)
    return c.json({ error: { code: 'internal_error', message: 'Failed to pin automation' } }, 500)
  }
}

export const unpinAutomation = async (c: AuthContext) => {
  const user = c.get('user')
  const id = c.req.param('id')
  if (!id) {
    return c.json({ error: { code: 'invalid_body', message: 'Missing id' } }, 400)
  }
  try {
    return c.json({ data: set_automation_pin(id, user.email, user.email, false) })
  } catch (error) {
    if (error instanceof AutomationsError) {
      const status = error.code === 'not_found' ? 404 : error.code === 'forbidden' ? 403 : 400
      return c.json({ error: { code: error.code, message: error.message } }, status)
    }
    console.error('[automations.unpin]', error)
    return c.json({ error: { code: 'internal_error', message: 'Failed to unpin automation' } }, 500)
  }
}

export const automations = new Hono<AuthEnv>()

automations.use('*', authenticate, authorizeModule('automations'))
automations.get('/', listAutomations)
automations.post('/', createAutomation)
automations.patch('/:id', patchAutomation)
automations.delete('/:id', deleteAutomation)
automations.post('/:id/run', runAutomation)
automations.post('/:id/pin', pinAutomation)
automations.delete('/:id/pin', unpinAutomation)
