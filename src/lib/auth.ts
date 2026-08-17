import { createClient } from '@supabase/supabase-js'
import type { User } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { prisma } from './prisma'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Outil mono-utilisateur : seul ce compte a accès, même si d'autres comptes
// Supabase existent. Volontairement fermé par défaut — sans la variable,
// tout est refusé plutôt que d'ouvrir silencieusement.
const PROPRIETAIRE = process.env.TACTIQ_USER_ID

// Vérifie le Bearer token de la requête. Null si absent, invalide, ou si le
// compte n'est pas celui du propriétaire.
export async function getUser(request: Request): Promise<User | null> {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader) return null

  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !user) return null

  if (!PROPRIETAIRE) {
    console.error('TACTIQ_USER_ID non définie : tous les accès sont refusés.')
    return null
  }

  if (user.id !== PROPRIETAIRE) return null

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
