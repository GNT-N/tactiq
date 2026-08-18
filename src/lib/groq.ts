import Groq from 'groq-sdk'

// Un seul endroit pour le modèle. Le précédent (llama-3.3-70b-versatile) a
// disparu du catalogue Groq, et les deux appels ont cassé en silence chacun
// de leur côté — la génération d'email comme le résumé d'analyse.
export const MODELE = 'openai/gpt-oss-120b'

// Ces modèles émettent un canal "reasoning" qui consomme le budget de tokens
// AVANT d'écrire la réponse. Un budget serré tronque la sortie en plein
// milieu : le JSON devient impossible à parser, sans erreur explicite.
export const BUDGET_TOKENS = 2000

export const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

// Message d'erreur exploitable plutôt qu'un « Erreur serveur » opaque :
// c'est ce qui a coûté du temps la dernière fois.
export function messageErreurGroq(error: unknown) {
  const brut = error instanceof Error ? error.message : String(error)
  if (/model/i.test(brut) && /not found|decommissioned|does not exist/i.test(brut)) {
    return `Le modèle ${MODELE} n'est plus disponible chez Groq. À mettre à jour dans src/lib/groq.ts.`
  }
  if (/api key|401|unauthorized/i.test(brut)) {
    return 'Clé GROQ_API_KEY absente ou invalide.'
  }
  if (/rate limit|429/i.test(brut)) {
    return 'Quota Groq atteint, réessaie dans quelques minutes.'
  }
  return `Groq a refusé la demande : ${brut}`
}
