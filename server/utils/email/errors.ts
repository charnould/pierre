type EmailSendErrorCode =
  | 'not_configured'
  | 'cm_unavailable'
  | 'cm_rejected'
  | 'cm_invalid_response'

export class EmailSendError extends Error {
  readonly status: number
  readonly code: EmailSendErrorCode
  readonly retryable: boolean

  constructor(status: number, code: EmailSendErrorCode, message: string, retryable: boolean) {
    super(message)
    this.status = status
    this.code = code
    this.retryable = retryable
  }
}
