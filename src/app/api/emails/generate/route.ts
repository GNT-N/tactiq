import Groq from 'groq-sdk'
import { prisma } from '@/lib/prisma'
import { getUser, unauthorized } from '@/lib/auth'
import { NextResponse } from 'next/server'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

export async function POST(request: Request) {
  try {
    const user = await getUser(request)
    if (!user) return unauthorized()

    const { prospect_id } = await request.json()

    if (!prospect_id) {
      return NextResponse.json({ error: 'prospect_id requis' }, { status: 400 })
    }

    // Relu en base : le contenu du prompt ne vient jamais du client.
    const prospect = await prisma.prospect.findFirst({
      where: { id: prospect_id, user_id: user.id }
    })

    if (!prospect) return NextResponse.json({ error: 'Introuvable' }, { status: 404 })

    const prompt = `Tu es un expert en prospection commerciale pour freelances web.

Génère un email de prospection professionnel, personnalisé et convaincant pour ce prospect :

Entreprise : ${prospect.nom_entreprise}
Secteur : ${prospect.secteur_activite || 'Non précisé'}
Ville : ${prospect.ville || 'Non précisée'}
Dirigeant : ${prospect.nom_dirigeant || 'Non précisé'}
Site web : ${prospect.site_web || 'Pas de site web'}
Notes : ${prospect.notes || 'Aucune note'}

Règles :
- Objet accrocheur et personnalisé
- Ton professionnel mais humain, pas robotique
- Mentionne un problème spécifique détecté (site absent, obsolète, non responsive...)
- Propose une solution concrète
- Call to action clair (appel, réunion, démo)
- Maximum 150 mots pour le corps
- En français
- Ne pas inventer de chiffres ou stats

Réponds UNIQUEMENT avec un JSON valide dans ce format exact :
{
  "sujet": "l'objet de l'email",
  "corps": "le corps de l'email avec des sauts de ligne \\n"
}`

    const completion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.7,
      max_tokens: 1000,
    })

    const content = completion.choices[0]?.message?.content || ''

    // Parse le JSON
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return NextResponse.json({ error: 'Erreur génération' }, { status: 500 })

    const emailData = JSON.parse(jsonMatch[0])

    return NextResponse.json({
      sujet: emailData.sujet,
      corps: emailData.corps,
    })

  } catch (error) {
    console.error('Erreur génération email:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
