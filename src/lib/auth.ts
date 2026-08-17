import { createClient } from '@supabase/supabase-js'
import type { User } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { prisma } from './prisma'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Vérifie le Bearer token de la requête. Null si absent ou invalide.
export async function getUser(request: Request): Promise<User | null> {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader) return null

  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
  if (error) return null

  return user
}

export function unauthorized() {
  return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
}

// Gardes d'appartenance : un id venant du client ne prouve pas qu'il est à nous.
export async function userOwnsProspect(prospectId: string, userId: string) {
  const prospect = await prisma.prospect.findFirst({
    where: { id: prospectId, user_id: userId },
    select: { id: true },
  })
  return prospect !== null
}

export async function userOwnsCampagne(campagneId: string, userId: string) {
  const campagne = await prisma.campagne.findFirst({
    where: { id: campagneId, user_id: userId },
    select: { id: true },
  })
  return campagne !== null
}
