const ENDPOINT = 'https://recherche-entreprises.api.gouv.fr/search'
const TIMEOUT_MS = 15_000

// L'API publique tolère quelques requêtes par seconde : au-delà elle
// renvoie 429. On espace les appels en lot plutôt que de la saturer.
export const DELAI_ENTRE_APPELS_MS = 250

// En dessous de ce score, on préfère ne rien rattacher qu'associer
// un prospect à la mauvaise entreprise.
const SEUIL_CONFIANCE = 0.6

export interface FicheEntreprise {
  siren: string
  siret: string | null
  nom_officiel: string
  actif: boolean
  date_creation: string | null
  date_fermeture: string | null
  activite_naf: string | null
  commune: string | null
  dirigeant: string | null
  confiance: number
}

interface ResultatApi {
  siren: string
  nom_complet?: string
  nom_raison_sociale?: string
  siege?: {
    siret?: string
    etat_administratif?: string
    libelle_commune?: string
    activite_principale?: string
    date_creation?: string
    date_fermeture?: string | null
  }
  dirigeants?: Array<{ prenoms?: string; nom?: string; denomination?: string }>
}

function normaliser(v: string) {
  return v
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

// Score 0-1 entre le nom OSM et la raison sociale du registre. Volontairement
// simple : le but est d'écarter les mauvais appariements, pas de les classer finement.
export function similarite(a: string, b: string): number {
  const na = normaliser(a)
  const nb = normaliser(b)
  if (!na || !nb) return 0
  if (na === nb) return 1
  if (na.includes(nb) || nb.includes(na)) return 0.85

  const ta = new Set(na.split(' ').filter(m => m.length > 2))
  const tb = new Set(nb.split(' ').filter(m => m.length > 2))
  if (ta.size === 0 || tb.size === 0) return 0

  let communs = 0
  for (const m of ta) if (tb.has(m)) communs++

  return communs / Math.min(ta.size, tb.size)
}

// Le registre renvoie parfois le nom d'usage entre parenthèses, souvent
// identique au nom : "QUETTIER (QUETTIER)". On ne garde la parenthèse que
// si elle apporte réellement une information.
function nettoyerNom(v: string) {
  return v.replace(/\s*\(([^)]+)\)\s*$/, (tout, entre: string) =>
    v.toLowerCase().includes(entre.toLowerCase() + ' (') || v.trim().toLowerCase().startsWith(entre.toLowerCase())
      ? ''
      : tout
  ).trim()
}

function extraireDirigeant(r: ResultatApi): string | null {
  const d = r.dirigeants?.[0]
  if (!d) return null
  const personne = [d.prenoms, d.nom].filter(Boolean).join(' ').trim()
  return nettoyerNom(personne) || d.denomination?.trim() || null
}

/**
 * Cherche l'entreprise au registre national à partir du nom d'enseigne et
 * de la commune. Renvoie null si aucun candidat n'est assez proche —
 * un mauvais rattachement coûte plus cher qu'une absence de donnée.
 */
export async function rechercherEntreprise(
  nom: string,
  ville: string | null,
): Promise<FicheEntreprise | null> {
  const params = new URLSearchParams({
    q: ville ? `${nom} ${ville}` : nom,
    per_page: '10',
  })

  const res = await fetch(`${ENDPOINT}?${params}`, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })

  if (res.status === 429) throw new Error('Annuaire des entreprises momentanément saturé')
  if (!res.ok) throw new Error(`Annuaire des entreprises a répondu ${res.status}`)

  const data = await res.json() as { results?: ResultatApi[] }
  const resultats = data.results ?? []
  if (resultats.length === 0) return null

  const villeNorm = ville ? normaliser(ville) : null

  let meilleur: { r: ResultatApi; score: number } | null = null

  for (const r of resultats) {
    const officiel = r.nom_complet || r.nom_raison_sociale || ''
    let score = similarite(nom, officiel)

    // Même commune : on accorde un bonus, mais le nom reste déterminant.
    const commune = r.siege?.libelle_commune
    if (villeNorm && commune && normaliser(commune) === villeNorm) {
      score = Math.min(1, score + 0.15)
    }

    if (!meilleur || score > meilleur.score) meilleur = { r, score }
  }

  if (!meilleur || meilleur.score < SEUIL_CONFIANCE) return null

  const { r, score } = meilleur

  return {
    siren: r.siren,
    siret: r.siege?.siret ?? null,
    nom_officiel: r.nom_complet || r.nom_raison_sociale || '',
    actif: r.siege?.etat_administratif === 'A',
    date_creation: r.siege?.date_creation ?? null,
    date_fermeture: r.siege?.date_fermeture ?? null,
    activite_naf: r.siege?.activite_principale ?? null,
    commune: r.siege?.libelle_commune ?? null,
    dirigeant: extraireDirigeant(r),
    confiance: Math.round(score * 100) / 100,
  }
}
