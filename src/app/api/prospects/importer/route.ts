import { prisma } from '@/lib/prisma'
import { getUser, unauthorized, userOwnsCampagne } from '@/lib/auth'
import { CATEGORIES } from '@/lib/overpass'
import { cleProspect } from '@/lib/dedupe'
import { NextResponse } from 'next/server'

export const maxDuration = 60

const LIMITE_MAX = 200
const LONGUEUR_MAX = 300

// La recherche Overpass est faite par le navigateur (quotas par IP : celle
// d'un hébergeur mutualisé est saturée en permanence, celle du poste de
// l'utilisateur ne l'est pas). Le serveur reçoit donc des résultats déjà
// trouvés — donc des données contrôlées par le client, qu'il faut valider.
interface EntreeImport {
  nom_entreprise?: unknown
  adresse?: unknown
  ville?: unknown
  telephone?: unknown
  site_web?: unknown
}

function texte(v: unknown): string | null {
  if (typeof v !== 'string') return null
  const t = v.trim().slice(0, LONGUEUR_MAX)
  return t === '' ? null : t
}

export async function POST(request: Request) {
  try {
    const user = await getUser(request)
    if (!user) return unauthorized()

    const body = await request.json().catch(() => ({}))
    const categorie: string = body?.categorie
    const campagne_id: string | undefined = body?.campagne_id
    const brut: unknown = body?.prospects

    if (!Array.isArray(brut)) {
      return NextResponse.json({ error: 'Liste de prospects manquante' }, { status: 400 })
    }
    if (!CATEGORIES[categorie]) {
      return NextResponse.json(
        { error: 'Catégorie inconnue', categories: Object.keys(CATEGORIES) },
        { status: 400 }
      )
    }
    if (campagne_id && !(await userOwnsCampagne(campagne_id, user.id))) {
      return NextResponse.json({ error: 'Campagne introuvable' }, { status: 404 })
    }

    // On ne fait confiance à aucun champ : tout est retypé et borné.
    const trouves = (brut as EntreeImport[])
      .map(e => ({
        nom_entreprise: texte(e?.nom_entreprise),
        adresse: texte(e?.adresse),
        ville: texte(e?.ville),
        telephone: texte(e?.telephone),
        site_web: texte(e?.site_web),
      }))
      .filter((e): e is { nom_entreprise: string } & typeof e => e.nom_entreprise !== null)

    const existants = await prisma.prospect.findMany({
      where: { user_id: user.id },
      select: { nom_entreprise: true, ville: true },
    })
    const connus = new Set(existants.map(p => cleProspect(p.nom_entreprise, p.ville)))

    const nouveaux = []
    for (const p of trouves) {
      const k = cleProspect(p.nom_entreprise, p.ville)
      if (connus.has(k)) continue
      connus.add(k) // évite aussi les doublons internes au lot
      nouveaux.push(p)
      if (nouveaux.length >= LIMITE_MAX) break
    }

    if (nouveaux.length > 0) {
      await prisma.prospect.createMany({
        data: nouveaux.map(p => ({
          user_id: user.id,
          campagne_id: campagne_id ?? null,
          nom_entreprise: p.nom_entreprise,
          secteur_activite: categorie,
          ville: p.ville,
          adresse: p.adresse,
          telephone: p.telephone,
          site_web: p.site_web,
          score: 0,
          statut: 'nouveau',
        })),
      })
    }

    return NextResponse.json({
      trouves: trouves.length,
      importes: nouveaux.length,
      doublons: trouves.length - nouveaux.length,
      limite_atteinte: nouveaux.length >= LIMITE_MAX,
    })
  } catch (error) {
    console.error('Erreur import prospects:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
