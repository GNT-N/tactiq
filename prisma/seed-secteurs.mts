import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! })
})

// config_json pilote l'analyse du besoin et la génération d'email :
// signaux_besoin = ce qui trahit un manque dans ce métier,
// argument_cle = l'angle commercial, leviers = ce qu'un site apporte concrètement.
const SECTEURS = [
  {
    nom: 'Restauration',
    config_json: {
      signaux_besoin: ['Aucun site', 'Menu uniquement sur Facebook', 'Pas de réservation en ligne', 'Photos de mauvaise qualité'],
      argument_cle: 'Les clients cherchent le menu et les horaires sur mobile avant de se déplacer.',
      leviers: ['Menu à jour', 'Réservation en ligne', 'Fiche Google soignée', 'Galerie photo'],
    },
  },
  {
    nom: 'Plomberie / Chauffage',
    config_json: {
      signaux_besoin: ['Aucun site', 'Pas de numéro cliquable', 'Site non adapté au mobile', 'Aucune zone d\'intervention affichée'],
      argument_cle: 'Une urgence se cherche sur mobile : sans site clair, l\'appel part chez le concurrent.',
      leviers: ['Appel en un clic', 'Zone d\'intervention', 'Avis clients', 'Demande de devis'],
    },
  },
  {
    nom: 'Coiffure / Esthétique',
    config_json: {
      signaux_besoin: ['Aucun site', 'Pas de prise de rendez-vous en ligne', 'Tarifs introuvables', 'Site vitrine figé'],
      argument_cle: 'La prise de rendez-vous en ligne capte les clients hors horaires d\'ouverture.',
      leviers: ['Réservation en ligne', 'Grille tarifaire', 'Portfolio', 'Rappel automatique'],
    },
  },
  {
    nom: 'Garage automobile',
    config_json: {
      signaux_besoin: ['Aucun site', 'Prestations non détaillées', 'Site non responsive', 'Pas de demande de devis'],
      argument_cle: 'Le comparatif de garages se fait en ligne : sans prestations ni tarifs, pas de contact.',
      leviers: ['Liste des prestations', 'Devis en ligne', 'Prise de rendez-vous', 'Avis clients'],
    },
  },
  {
    nom: 'Bâtiment / Rénovation',
    config_json: {
      signaux_besoin: ['Aucun site', 'Pas de galerie de réalisations', 'Aucune certification affichée', 'Site obsolète'],
      argument_cle: 'Un chantier se vend par la preuve : sans photos de réalisations, la confiance ne se crée pas.',
      leviers: ['Galerie avant/après', 'Certifications RGE', 'Témoignages', 'Formulaire de devis'],
    },
  },
  {
    nom: 'Commerce de détail',
    config_json: {
      signaux_besoin: ['Aucun site', 'Pas de catalogue en ligne', 'Horaires introuvables', 'Aucune vente à distance'],
      argument_cle: 'Le client vérifie la disponibilité en ligne avant de se déplacer en boutique.',
      leviers: ['Catalogue produits', 'Horaires et accès', 'Click and collect', 'Newsletter'],
    },
  },
  {
    nom: 'Santé / Paramédical',
    config_json: {
      signaux_besoin: ['Aucun site', 'Pas de prise de rendez-vous', 'Informations pratiques manquantes', 'Site non responsive'],
      argument_cle: 'Les patients cherchent horaires, accès et modalités de rendez-vous depuis leur mobile.',
      leviers: ['Informations pratiques', 'Prise de rendez-vous', 'Présentation du cabinet', 'Accessibilité'],
    },
  },
  {
    nom: 'Immobilier',
    config_json: {
      signaux_besoin: ['Aucun site', 'Annonces uniquement sur portails tiers', 'Pas d\'estimation en ligne', 'Site daté'],
      argument_cle: 'Dépendre uniquement des portails coûte cher en commissions et en visibilité de marque.',
      leviers: ['Vitrine des biens', 'Estimation en ligne', 'Notoriété locale', 'Captation de leads'],
    },
  },
]

const resultats = await Promise.all(
  SECTEURS.map(s =>
    prisma.secteur.upsert({
      where: { nom: s.nom },
      update: { config_json: s.config_json },
      create: s,
    })
  )
)

console.log(`${resultats.length} secteurs en base :`)
for (const s of resultats) console.log('  -', s.nom)

await prisma.$disconnect()
