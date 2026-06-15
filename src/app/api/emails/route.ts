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

    const emails = await prisma.email.findMany({
      where: { prospect: { user_id: user.id } },
      include: {
        prospect: {
          select: { id: true, nom_entreprise: true, ville: true }
        }
      },
      orderBy: { created_at: 'desc' }
    })

    return NextResponse.json(emails)
  } catch (error) {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}