import { prisma } from '@/lib/prisma'
import { getUser, unauthorized, userOwnsCampagne } from '@/lib/auth'
import { enrichirProspect, type ResultatEnrichissement } from '@/lib/enrichir-prospect'
import { DELAI_ENTRE_APPELS_MS } from '@/lib/sirene'
import { NextResponse } from 'next/server'

export const maxDuration = 60

const TAILLE_DEFAUT = 10
const TAILLE_MAX = 25

export async function POST(request: Request) {
  try {
    const user = await getUser(request)
    if (!user) return unauthorized()

    const body = await request.json().catch(() => ({}))
    const campagne_id: string | undefined = body?.campagne_id
    const taille = Math.min(Math.max(Number(body?.taille) || TAILLE_DEFAUT, 1), TAILLE_MAX)

    if (campagne_id && !(await userOwnsCampagne(campagne_id, user.id))) {
      return NextResponse.json({ error: 'Campagne introuvable' }, { status: 404 })
    }

    // Critère : jamais tenté. Filtrer sur "siret null" seul ne suffirait pas —
    // un prospect sans correspondance reste sans SIRET et serait repris à
    // chaque tour, sans fin. Toute tentative laisse une interaction, donc
    // ce compte décroît strictement et la boucle appelante se termine.
    const where = {
      user_id: user.id,
      // Ne plus exclure ceux qui ont déjà un SIRET : venant d'OpenStreetMap,
      // ce sont justement ceux qu'on enrichit le mieux.
      interactions: { none: { type: 'enrichissement' } },
      ...(campagne_id ? { campagne_id } : {}),
    }

    const lot = await prisma.prospect.findMany({
      where,
      select: { id: true },
      orderBy: { created_at: 'asc' },
      take: taille,
    })

    // Séquentiel et espacé : l'API publique plafonne à quelques appels/seconde.
    const resultats: ResultatEnrichissement[] = []
    let echecs = 0

    for (const p of lot) {
      try {
        const r = await enrichirProspect(p.id, user.id)
        if (r) resultats.push(r)
        else echecs++
      } catch (error) {
        console.error('Enrichissement échoué:', error)
        echecs++
      }
      await new Promise(r => setTimeout(r, DELAI_ENTRE_APPELS_MS))
    }

    const apparies = resultats.filter(r => r.trouve).length
    const restants = await prisma.prospect.count({ where })

    return NextResponse.json({
      traites: resultats.length,
      apparies,
      sans_correspondance: resultats.length - apparies,
      echecs,
      restants,
      resultats,
    })
  } catch (error) {
    console.error('Erreur enrichissement en lot:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
