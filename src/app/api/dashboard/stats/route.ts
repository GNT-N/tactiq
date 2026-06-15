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

    const prospects = await prisma.prospect.findMany({
      where: { user_id: user.id },
      select: { statut: true, valeur_estimee: true, created_at: true }
    })

    const emails = await prisma.email.findMany({
      where: { prospect: { user_id: user.id } },
      select: { id: true }
    })

    const totalProspects = prospects.length
    const emailsEnvoyes = emails.length
    const convertis = prospects.filter(p => p.statut === 'converti').length
    const tauxConversion = totalProspects > 0 ? Math.round((convertis / totalProspects) * 100) : 0
    const pipeline = prospects.reduce((acc, p) => acc + (p.valeur_estimee || 0), 0)

    const statutsCount: Record<string, number> = {}
    prospects.forEach(p => {
      statutsCount[p.statut] = (statutsCount[p.statut] || 0) + 1
    })

    const statutsColors: Record<string, string> = {
      nouveau:    '#64748b',
      contacte:   '#3b82f6',
      en_attente: '#f59e0b',
      converti:   '#22c55e',
      perdu:      '#ef4444',
    }

    const statutsLabels: Record<string, string> = {
      nouveau:    'Nouveau',
      contacte:   'Contacté',
      en_attente: 'En attente',
      converti:   'Converti',
      perdu:      'Perdu',
    }

    const statuts = Object.entries(statutsCount).map(([key, value]) => ({
      name: statutsLabels[key] || key,
      value,
      color: statutsColors[key] || '#64748b',
    }))

    const trente = new Date()
    trente.setDate(trente.getDate() - 30)

    const recentProspects = prospects.filter(p => new Date(p.created_at) >= trente)

    const activityMap: Record<string, number> = {}
    recentProspects.forEach(p => {
      const jour = new Date(p.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
      activityMap[jour] = (activityMap[jour] || 0) + 1
    })

    const activity = Object.entries(activityMap)
      .map(([jour, prospects]) => ({ jour, prospects }))
      .sort((a, b) => a.jour.localeCompare(b.jour))

    const campagnesRaw = await prisma.campagne.findMany({
      where: { user_id: user.id, statut: 'active' },
      include: {
        prospects: { select: { statut: true } }
      },
      take: 5
    })

    const campagnes = campagnesRaw.map(c => {
      const total = c.prospects.length
      const convertis = c.prospects.filter(p => p.statut === 'converti').length
      const tauxConversion = total > 0 ? Math.round((convertis / total) * 100) : 0
      return {
        id: c.id,
        nom: c.nom,
        total,
        convertis,
        tauxConversion,
      }
    })
    
    return NextResponse.json({
      stats: { totalProspects, emailsEnvoyes, tauxConversion, pipeline },
      statuts,
      activity,
      campagnes,
    })
  } catch (error) {
    console.error('Erreur dashboard stats:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}