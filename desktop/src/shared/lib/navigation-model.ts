export const ABOUT_SUBJECTS = ['locataire', 'client', 'lot', 'batiment'] as const

export type AboutSubject = (typeof ABOUT_SUBJECTS)[number]

export type WorkflowStep = 'form' | 'output'
