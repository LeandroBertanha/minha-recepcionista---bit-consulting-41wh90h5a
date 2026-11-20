export type RestrictedContactsParseResult = {
  valid: string[]
  invalid: string[]
}

export const normalizeRestrictedContact = (value: unknown): string | null => {
  const digits = String(value || '').replace(/\D/g, '')

  if (digits.length === 10 || digits.length === 11) return `55${digits}`
  if (digits.length >= 12 && digits.length <= 15) return digits

  return null
}

export const parseRestrictedContacts = (input: string): RestrictedContactsParseResult => {
  const entries = input
    .split(/[\n,;]+/)
    .map((value) => value.trim())
    .filter(Boolean)
  const valid: string[] = []
  const invalid: string[] = []

  for (const entry of entries) {
    const normalized = normalizeRestrictedContact(entry)
    if (normalized) valid.push(normalized)
    else invalid.push(entry)
  }

  return {
    valid: [...new Set(valid)],
    invalid: [...new Set(invalid)],
  }
}

export const normalizeRestrictedContacts = (values: unknown): string[] => {
  if (!Array.isArray(values)) return []

  return [
    ...new Set(
      values.map(normalizeRestrictedContact).filter((value): value is string => Boolean(value)),
    ),
  ]
}
