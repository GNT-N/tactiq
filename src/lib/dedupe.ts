// Deux sources décrivent rarement une enseigne à l'identique : on compare
// sur une forme normalisée plutôt que caractère par caractère.
const DIACRITIQUES = /[\u0300-\u036f]/g

function normaliser(v: string) {
  return v.normalize('NFD').replace(DIACRITIQUES, '').toLowerCase().replace(/[^a-z0-9]/g, '')
}

export function cleProspect(nom: string, ville: string | null) {
  return `${normaliser(nom)}@${normaliser(ville ?? '')}`
}
