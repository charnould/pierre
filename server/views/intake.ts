import { html, raw } from 'hono/html'

import type { IntakePublicBoot, IntakeRecord } from '../../shared/intakes'
import { intakeCss, intakeJs } from './assets'
import { htmlPage } from './document'

export function intakePage(params: {
  organizationName: string
  intake: Pick<IntakeRecord, 'config'>
  token: string
  speechEnabled: boolean
  initialSubmissionId: string
}) {
  const { organizationName, intake, token, speechEnabled, initialSubmissionId } = params
  const { form, access } = intake.config
  const actionUrl = `/repondre/${encodeURIComponent(token)}`

  const boot: IntakePublicBoot = {
    organizationName,
    form,
    hasPasswords: access.passwords.length > 0,
    actionUrl,
    speechUrl: speechEnabled ? `${actionUrl}/speech` : null,
    initialSubmissionId
  }
  const bootJson = JSON.stringify(boot).replace(/</g, '\\u003c')

  return htmlPage({
    title: `${form.title} — ${organizationName}`,
    stylesheet: intakeCss,
    bodyClass: 'bg-background text-foreground',
    head: html`<meta name="robots" content="noindex, nofollow" />
      <script type="module" src="${intakeJs}"></script>`,
    body: html`<script type="application/json" id="intake-data">
        ${raw(bootJson)}
      </script>
      <div id="root"></div>`
  })
}
