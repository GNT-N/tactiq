import { prisma } from '@/lib/prisma'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function getUser(request: Request) {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader) return null
  const token = authHeader.replace('Bearer ', '')
  const { data: { user } } = await supabaseAdmin.auth.getUser(token)
  return user
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await getUser(request)
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const prospect = await prisma.prospect.findFirst({
      where: { id, user_id: user.id },
      include: {
        campagne: true,
        interactions: { orderBy: { created_at: 'desc' } },
        emails: { orderBy: { created_at: 'desc' } }
      }
    })

    if (!prospect) return NextResponse.json({ error: 'Introuvable' }, { status: 404 })
    return NextResponse.json(prospect)
  } catch (error) {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await getUser(request)
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const body = await request.json()

    const prospect = await prisma.prospect.updateMany({
      where: { id, user_id: user.id },
      data: body
    })

    return NextResponse.json(prospect)
  } catch (error) {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await getUser(request)
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const body = await request.json()

    const prospect = await prisma.prospect.updateMany({
      where: { id, user_id: user.id },
      data: {
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
        campagne_id: body.campagne_id || null,
        score: body.score,
      }
    })

    return NextResponse.json(prospect)
  } catch (error) {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await getUser(request)
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    await prisma.prospect.deleteMany({
      where: { id, user_id: user.id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}