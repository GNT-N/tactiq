import { Prisma } from '@prisma/client'
import { prisma } from './prisma'
import { rechercherEntreprise, rechercherParSiret } from './sirene'

export interface ResultatEnrichissement {
  id: string
  nom_entreprise: string
  trouve: boolean
  siret: string | null
  dirigeant: string | null
  actif: boolean | null
  confiance: number | null
}

/**
 * Rapproche un prospect du registre national des entreprises et complète
 * SIRET et dirigeant. Renvoie null si le prospect n'appartient pas à
 * l'utilisateur ; `trouve: false` si aucun appariement n'est assez fiable.
 */
export async function enrichirProspect(
  prospectId: string,
  userId: string,
): Promise<ResultatEnrichissement | null> {
  const prospect = await prisma.prospect.findFirst({
    where: { id: prospectId, user_id: userId },
    select: { id: true, nom_entreprise: true, ville: true, statut: true, siret: true, nom_dirigeant: true },
  })

  if (!prospect) return null

  // Un SIRET connu (souvent fourni par OpenStreetMap) vaut mieux que
  // n'importe quel appariement sur le nom : on l'utilise en priorité.
  const fiche = prospect.siret
    ? await rechercherParSiret(prospect.siret)
    : await rechercherEntreprise(prospect.nom_entreprise, prospect.ville)

  if (!fiche) {
    await prisma.interaction.create({
      data: {
        prospect_id: prospect.id,
        type: 'enrichissement',
        contenu: 'Aucune entreprise correspondante au registre national',
      },
    })
    return {
      id: prospect.id,
      nom_entreprise: prospect.nom_entreprise,
      trouve: false,
      siret: null,
      dirigeant: null,
      actif: null,
      confiance: null,
    }
  }

  const etat = fiche.actif
    ? 'active'
    : `CESSÉE${fiche.date_fermeture ? ` le ${fiche.date_fermeture}` : ''}`

  // Une entreprise fermée ne vaut pas la peine d'être démarchée. On ne
  // reclasse que les prospects encore intacts, jamais un statut posé à la main.
  const reclasser = !fiche.actif && prospect.statut === 'nouveau'

  await prisma.$transaction([
    prisma.prospect.update({
      where: { id: prospect.id },
      data: {
        siret: fiche.siret ?? prospect.siret,
        nom_dirigeant: fiche.dirigeant ?? prospect.nom_dirigeant,
        // Conservé pour que l'analyse puisse en tenir compte dans le score.
        sirene_json: {
          nom_officiel: fiche.nom_officiel,
          actif: fiche.actif,
          date_creation: fiche.date_creation,
          date_fermeture: fiche.date_fermeture,
          effectif: fiche.effectif,
          activite_naf: fiche.activite_naf,
          confiance: fiche.confiance,
          enrichi_le: new Date().toISOString(),
        } as unknown as Prisma.InputJsonObject,
        ...(reclasser ? { statut: 'perdu' } : {}),
      },
    }),
    prisma.interaction.create({
      data: {
        prospect_id: prospect.id,
        type: 'enrichissement',
        contenu: `${fiche.nom_officiel} · ${etat} · SIRET ${fiche.siret ?? 'inconnu'} · dirigeant ${fiche.dirigeant ?? 'inconnu'} · confiance ${fiche.confiance}`,
        ...(reclasser ? { statut_avant: prospect.statut, statut_apres: 'perdu' } : {}),
      },
    }),
  ])

  return {
    id: prospect.id,
    nom_entreprise: prospect.nom_entreprise,
    trouve: true,
    siret: fiche.siret,
    dirigeant: fiche.dirigeant,
    actif: fiche.actif,
    confiance: fiche.confiance,
  }
}
