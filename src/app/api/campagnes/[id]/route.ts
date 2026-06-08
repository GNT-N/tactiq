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

    const campagne = await prisma.campagne.findFirst({
      where: { id, user_id: user.id },
      include: {
        secteur: true,
        prospects: {
          orderBy: { score: 'desc' }
        }
      }
    })

    if (!campagne) return NextResponse.json({ error: 'Introuvable' }, { status: 404 })
    return NextResponse.json(campagne)
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

    const campagne = await prisma.campagne.updateMany({
      where: { id, user_id: user.id },
      data: body
    })

    return NextResponse.json(campagne)
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

    // Détache les prospects de la campagne avant suppression
    await prisma.prospect.updateMany({
      where: { campagne_id: id, user_id: user.id },
      data: { campagne_id: null }
    })

    await prisma.campagne.deleteMany({
      where: { id, user_id: user.id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}