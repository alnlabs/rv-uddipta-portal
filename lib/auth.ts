export const OWNER_EMAIL_DOMAIN = 'owners.rvuddipta.app'

export function phoneToEmail(phone: string) {
  return `${phone}@${OWNER_EMAIL_DOMAIN}`
}

export function cleanError(message: string | undefined) {
  return String(message || 'Something went wrong')
    .replace(/^.*error:\s*/i, '')
    .replace(/^.*exception:\s*/i, '')
}
