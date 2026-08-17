import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getUser, unauthorized, userOwnsCampagne } from '@/lib/auth'
import { analyserProspect, type ResultatAnalyse } from '@/lib/analyse-prospect'
import { NextResponse } from 'next/server'

// Un lot borné par appel : au-delà, on dépasserait le temps d'exécution
// maximal d'une fonction serverless. Le client rappelle jusqu'à épuisement.
export const maxDuration = 60

const TAILLE_DEFAUT = 5
const TAILLE_MAX = 10

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

    // Uniquement les prospects jamais analysés : c'est ce qui garantit que
    // "restants" décroît et que la boucle appelante se termine.
    // Ré-analyser un prospect déjà noté se fait depuis sa fiche.
    const where: Prisma.ProspectWhereInput = {
      user_id: user.id,
      analyse_json: { equals: Prisma.DbNull },
      ...(campagne_id ? { campagne_id } : {}),
    }

    const lot = await prisma.prospect.findMany({
      where,
      select: { id: true },
      orderBy: { created_at: 'asc' },
      take: taille,
    })

    // Un site injoignable ne doit pas faire échouer tout le lot.
    const issues = await Promise.allSettled(
      lot.map(p => analyserProspect(p.id, user.id))
    )

    const resultats: ResultatAnalyse[] = []
    for (const issue of issues) {
      if (issue.status === 'fulfilled' && issue.value) resultats.push(issue.value)
      else if (issue.status === 'rejected') console.error('Analyse échouée:', issue.reason)
    }

    const restants = await prisma.prospect.count({ where })

    return NextResponse.json({
      traites: resultats.length,
      echecs: issues.length - resultats.length,
      restants,
      resultats,
    })
  } catch (error) {
    console.error('Erreur analyse en lot:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
