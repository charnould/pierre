/** Compares two canonical account principals (email or login) case-insensitively. */
export function sameCollaboratorLogin(a: string, b: string): boolean {
  const left = a.trim().toLowerCase()
  const right = b.trim().toLowerCase()
  return Boolean(left) && left === right
}

/** True when the viewer owns the resource or holds administrator rights. */
export function canManageCollaboratorResource(
  owner: string,
  viewerLogin: string,
  isAdministrator = false
): boolean {
  return isAdministrator || sameCollaboratorLogin(owner, viewerLogin)
}
