import { groq, MODELE } from './groq'
import { Prisma } from '@prisma/client'
import { prisma } from './prisma'
import { analyserSite, type Signal } from './analyse-site'

// Le résumé ne doit commenter que ce qui a été réellement observé.
async function resumer(
  nomEntreprise: string,
  signaux: Signal[],
  secteur: string | null,
  argumentSecteur: string | null,
) {
  if (signaux.length === 0) return 'Site en bon état : aucun signal de besoin détecté.'

  const prompt = `Tu es un expert en prospection pour freelances web.

Entreprise : ${nomEntreprise}${secteur ? `\nSecteur : ${secteur}` : ''}
${argumentSecteur ? `Enjeu du secteur : ${argumentSecteur}` : ''}

Constats techniques relevés automatiquement sur son site :
${signaux.map(s => `- ${s.label}`).join('\n')}

Rédige 2 phrases maximum, en français, expliquant le besoin web de cette entreprise.
Appuie-toi UNIQUEMENT sur les constats ci-dessus. N'invente aucun autre constat,
aucun chiffre, aucune statistique. Réponds avec le texte seul, sans préambule.`

  const completion = await groq.chat.completions.create({
    messages: [{ role: 'user', content: prompt }],
    model: MODELE,
    temperature: 0.4,
    // 200 suffisaient pour deux phrases, mais le canal "reasoning" mange
    // le budget avant : la réponse revenait vide.
    max_tokens: 1200,
  })

  return completion.choices[0]?.message?.content?.trim() || null
}

export interface ResultatAnalyse {
  id: string
  nom_entreprise: string
  score: number
  resume_ia: string | null
}

/**
 * Analyse le site d'un prospect, enregistre le score et trace l'opération.
 * Renvoie null si le prospect n'existe pas ou n'appartient pas à l'utilisateur.
 */
export async function analyserProspect(
  prospectId: string,
  userId: string,
): Promise<ResultatAnalyse | null> {
  const prospect = await prisma.prospect.findFirst({
    where: { id: prospectId, user_id: userId },
    include: { campagne: { include: { secteur: true } } }
  })

  if (!prospect) return null

  const sirene = prospect.sirene_json as {
    actif?: boolean
    date_creation?: string | null
    effectif?: number | null
  } | null

  const analyse = await analyserSite(prospect.site_web, {
    nom_entreprise: prospect.nom_entreprise,
    telephone: prospect.telephone,
    email_contact: prospect.email_contact,
    sirene,
  })

  const secteur = prospect.campagne?.secteur?.nom ?? prospect.secteur_activite ?? null
  const config = prospect.campagne?.secteur?.config_json as { argument_cle?: string } | null
  const argument = typeof config?.argument_cle === 'string' ? config.argument_cle : null

  // Le score reste calculé même si Groq tombe : seul le résumé est optionnel.
  let resume: string | null = null
  try {
    resume = await resumer(prospect.nom_entreprise, analyse.signaux, secteur, argument)
  } catch (error) {
    console.error('Résumé IA indisponible:', error)
  }

  await prisma.$transaction([
    prisma.prospect.update({
      where: { id: prospect.id },
      data: {
        score: analyse.score,
        // Prisma attend un objet JSON indexable, pas une interface nommée.
        analyse_json: analyse as unknown as Prisma.InputJsonObject,
        resume_ia: resume ?? prospect.resume_ia,
      }
    }),
    prisma.interaction.create({
      data: {
        prospect_id: prospect.id,
        type: 'analyse_ia',
        contenu: `Analyse du site : score ${analyse.score}/10`,
      }
    }),
  ])

  return {
    id: prospect.id,
    nom_entreprise: prospect.nom_entreprise,
    score: analyse.score,
    resume_ia: resume,
  }
}
