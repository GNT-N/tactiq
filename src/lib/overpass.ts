// Instances publiques gratuites, avec quotas PAR IP. C'est la raison pour
// laquelle cette recherche part du NAVIGATEUR et non du serveur : l'IP de
// sortie d'un hébergeur mutualisé est partagée par des centaines de projets,
// donc limitée en permanence. Depuis ton poste, tu as ton propre quota.
// On bascule sur le miroir suivant quand le premier sature.
const ENDPOINTS = [
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass-api.de/api/interpreter',
]
const TIMEOUT_MS = 45_000

// Les catégories reprennent les noms des secteurs seedés en base, pour que
// l'import puisse rattacher directement le bon Secteur à la campagne.
export const CATEGORIES: Record<string, string[]> = {
  'Restauration':          ['amenity=restaurant', 'amenity=fast_food', 'amenity=cafe'],
  'Plomberie / Chauffage': ['craft=plumber', 'craft=hvac'],
  'Coiffure / Esthétique': ['shop=hairdresser', 'shop=beauty'],
  'Garage automobile':     ['shop=car_repair'],
  'Bâtiment / Rénovation': ['craft=builder', 'craft=carpenter', 'craft=electrician', 'craft=painter'],
  'Commerce de détail':    ['shop=bakery', 'shop=butcher', 'shop=florist', 'shop=clothes'],
  'Santé / Paramédical':   ['amenity=doctors', 'amenity=dentist', 'amenity=pharmacy'],
  'Immobilier':            ['office=estate_agent'],
}

export interface ProspectOsm {
  osm_id: string
  nom_entreprise: string
  adresse: string | null
  ville: string | null
  telephone: string | null
  site_web: string | null
  latitude: number | null
  longitude: number | null
}

interface ElementOsm {
  type: string
  id: number
  lat?: number
  lon?: number
  center?: { lat: number; lon: number }
  tags?: Record<string, string>
}

function construireRequete(ville: string, filtres: string[]) {
  // Guillemets échappés : un nom de commune peut en contenir (ex. L'Haÿ-les-Roses).
  const zone = ville.replace(/["\\]/g, '')

  const clauses = filtres
    .map(f => {
      const [cle, valeur] = f.split('=')
      return `  nwr(area.zone)["${cle}"="${valeur}"];`
    })
    .join('\n')

  // admin_level=8 = la commune en France. Sans ça, "Lyon" matche aussi la
  // Métropole et ses 59 communes, et la requête explose en volume.
  return `[out:json][timeout:40];
area["name"="${zone}"]["boundary"="administrative"]["admin_level"="8"]->.zone;
(
${clauses}
);
out center tags;`
}

function normaliserTelephone(brut: string | undefined) {
  if (!brut) return null
  const t = brut.split(';')[0].trim()
  return t || null
}

function extraireAdresse(tags: Record<string, string>) {
  const numero = tags['addr:housenumber']
  const rue = tags['addr:street']
  if (!rue) return null
  return [numero, rue].filter(Boolean).join(' ')
}

/**
 * Cherche des établissements dans une commune via OpenStreetMap.
 * `sansSiteUniquement` ne garde que ceux dont aucun tag de site web n'est
 * renseigné — c'est le signal de besoin recherché.
 */
export async function chercherProspects(
  ville: string,
  categorie: string,
  sansSiteUniquement = true,
): Promise<ProspectOsm[]> {
  const filtres = CATEGORIES[categorie]
  if (!filtres) throw new Error(`Catégorie inconnue : ${categorie}`)

  const requete = construireRequete(ville, filtres)

  // 429 (quota dépassé) et 504 (instance saturée) sont temporaires : on tente
  // le miroir suivant plutôt que d'échouer tout de suite.
  let res: Response | null = null

  for (const endpoint of ENDPOINTS) {
    try {
      res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ data: requete }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      })
    } catch {
      continue // miroir injoignable ou trop lent : on passe au suivant
    }

    if (res.ok) break
    if (res.status !== 429 && res.status !== 504) break
  }

  if (!res || !res.ok) {
    throw new Error(
      !res || res.status === 429 || res.status === 504
        ? 'OpenStreetMap est momentanément saturé sur toutes ses instances, réessaie dans quelques minutes'
        : `Overpass a répondu ${res.status}`
    )
  }

  const data = await res.json() as { elements?: ElementOsm[] }
  const elements = data.elements ?? []

  const prospects: ProspectOsm[] = []

  for (const el of elements) {
    const tags = el.tags ?? {}
    const nom = tags.name?.trim()
    if (!nom) continue // sans nom, un prospect n'est pas exploitable

    // OSM stocke le site web sous plusieurs clés selon les contributeurs.
    const site = tags.website || tags['contact:website'] || tags.url || null
    if (sansSiteUniquement && site) continue

    prospects.push({
      osm_id: `${el.type}/${el.id}`,
      nom_entreprise: nom,
      adresse: extraireAdresse(tags),
      // Le tag addr:city n'est renseigné que sur ~2 % des POI : à défaut, la
      // commune interrogée fait foi, puisque la requête est bornée à sa zone.
      ville: tags['addr:city'] || ville,
      telephone: normaliserTelephone(tags.phone || tags['contact:phone']),
      site_web: site,
      latitude: el.lat ?? el.center?.lat ?? null,
      longitude: el.lon ?? el.center?.lon ?? null,
    })
  }

  return prospects
}
