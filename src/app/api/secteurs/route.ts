import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const secteurs = await prisma.secteur.findMany({
      orderBy: { nom: 'asc' }
    })
    return NextResponse.json(secteurs)
  } catch (error) {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}