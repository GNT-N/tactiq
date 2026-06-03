import { prisma } from '@/lib/prisma'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
    if (error || !user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const prospects = await prisma.prospect.findMany({
      where: { user_id: user.id },
      include: { campagne: true },
      orderBy: { created_at: 'desc' }
    })

    return NextResponse.json(prospects)
  } catch (error) {
    console.error('Erreur prospects:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
    if (error || !user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const body = await request.json()

    const prospect = await prisma.prospect.create({
      data: {
        user_id: user.id,
        nom_entreprise: body.nom_entreprise,
        secteur_activite: body.secteur_activite || null,
        ville: body.ville || null,
        adresse: body.adresse || null,
        telephone: body.telephone || null,
        email_contact: body.email_contact || null,
        site_web: body.site_web || null,
        nom_dirigeant: body.nom_dirigeant || null,
        siret: body.siret || null,
        valeur_estimee: body.valeur_estimee || null,
        notes: body.notes || null,
        score: 0,
        statut: 'nouveau',
      }
    })

    return NextResponse.json(prospect)
  } catch (error) {
    console.error('Erreur création prospect:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}