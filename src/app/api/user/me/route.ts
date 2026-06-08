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
    const { data: { user } } = await supabaseAdmin.auth.getUser(token)
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const profile = await prisma.user.findUnique({
      where: { id: user.id },
      select: { nom: true, metier: true, ville: true, plan: true, theme: true }
    })

    return NextResponse.json(profile)
  } catch (error) {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    const token = authHeader.replace('Bearer ', '')
    const { data: { user } } = await supabaseAdmin.auth.getUser(token)
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const body = await request.json()

    const profile = await prisma.user.update({
      where: { id: user.id },
      data: {
        nom: body.nom !== undefined ? body.nom : undefined,
        metier: body.metier !== undefined ? body.metier : undefined,
        ville: body.ville !== undefined ? body.ville : undefined,
        theme: body.theme !== undefined ? body.theme : undefined,
      }
    })

    return NextResponse.json(profile)
  } catch (error) {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}