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

export async function GET(request: Request) {
  try {
    const user = await getUser(request)
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const campagnes = await prisma.campagne.findMany({
      where: { user_id: user.id },
      include: {
        secteur: true,
        _count: { select: { prospects: true } }
      },
      orderBy: { created_at: 'desc' }
    })

    return NextResponse.json(campagnes)
  } catch (error) {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const user = await getUser(request)
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const body = await request.json()

    const campagne = await prisma.campagne.create({
        data: {
            nom: body.nom,
            description: body.description || null,
            statut: 'active',
            user: {
            connect: { id: user.id }
            },
            ...(body.secteur_id ? {
            secteur: { connect: { id: body.secteur_id } }
            } : {})
        },
        include: {
            secteur: true,
            _count: { select: { prospects: true } }
        }
    })

    return NextResponse.json(campagne)
  } catch (error) {
    console.error('Erreur création campagne:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}