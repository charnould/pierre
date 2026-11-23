export type IntakeErrorCode = 'not_found' | 'forbidden' | 'invalid' | 'conflict'

export class IntakesError extends Error {
  constructor(
    message: string,
    readonly code: IntakeErrorCode = 'invalid'
  ) {
    super(message)
    this.name = 'IntakesError'
  }
}
