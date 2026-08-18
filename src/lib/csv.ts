// Analyseur CSV minimal mais correct : guillemets, séparateurs et sauts de
// ligne à l'intérieur des champs, doublement des guillemets ("" = ").
// Les exports Excel français utilisent le point-virgule, on le détecte.

export interface LigneProspect {
  nom_entreprise: string
  ville: string | null
  adresse: string | null
  telephone: string | null
  email_contact: string | null
  site_web: string | null
  nom_dirigeant: string | null
  siret: string | null
  secteur_activite: string | null
  notes: string | null
}

export interface ResultatParsing {
  lignes: LigneProspect[]
  ignorees: number
  colonnes_reconnues: string[]
  separateur: string
}

function detecterSeparateur(entete: string) {
  const candidats = [';', ',', '\t']
  let meilleur = ','
  let max = 0
  for (const c of candidats) {
    // On compte hors guillemets pour ne pas être trompé par "Dupont, SARL"
    let n = 0
    let dansGuillemets = false
    for (const ch of entete) {
      if (ch === '"') dansGuillemets = !dansGuillemets
      else if (ch === c && !dansGuillemets) n++
    }
    if (n > max) { max = n; meilleur = c }
  }
  return meilleur
}

export function parserCsv(texte: string, separateur?: string): string[][] {
  // Retire le BOM que produisent Excel et Notepad.
  const contenu = texte.replace(/^\uFEFF/, '')
  const premiereLigne = contenu.split(/\r?\n/)[0] ?? ''
  const sep = separateur ?? detecterSeparateur(premiereLigne)

  const lignes: string[][] = []
  let champ = ''
  let ligne: string[] = []
  let dansGuillemets = false

  for (let i = 0; i < contenu.length; i++) {
    const c = contenu[i]

    if (dansGuillemets) {
      if (c === '"') {
        if (contenu[i + 1] === '"') { champ += '"'; i++ }
        else dansGuillemets = false
      } else {
        champ += c
      }
      continue
    }

    if (c === '"') { dansGuillemets = true; continue }
    if (c === sep) { ligne.push(champ); champ = ''; continue }

    if (c === '\n' || c === '\r') {
      if (c === '\r' && contenu[i + 1] === '\n') i++
      ligne.push(champ)
      // Une ligne vide n'est pas une donnée
      if (ligne.some(v => v.trim() !== '')) lignes.push(ligne)
      ligne = []
      champ = ''
      continue
    }

    champ += c
  }

  ligne.push(champ)
  if (ligne.some(v => v.trim() !== '')) lignes.push(ligne)

  return lignes
}

function normaliserEntete(v: string) {
  return v
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .trim()
}

// Un même champ peut s'intituler de plusieurs façons selon la source.
const SYNONYMES: Record<keyof LigneProspect, string[]> = {
  nom_entreprise:   ['nomentreprise', 'entreprise', 'nom', 'raisonsociale', 'societe', 'enseigne', 'company', 'name'],
  ville:            ['ville', 'commune', 'city', 'localite'],
  adresse:          ['adresse', 'address', 'rue', 'voie'],
  telephone:        ['telephone', 'tel', 'phone', 'mobile', 'portable'],
  email_contact:    ['email', 'emailcontact', 'mail', 'courriel', 'adresseemail'],
  site_web:         ['siteweb', 'site', 'website', 'url', 'web', 'internet'],
  nom_dirigeant:    ['dirigeant', 'nomdirigeant', 'gerant', 'contact', 'responsable', 'representant'],
  siret:            ['siret', 'siren'],
  secteur_activite: ['secteur', 'secteuractivite', 'activite', 'metier', 'naf'],
  notes:            ['notes', 'note', 'commentaire', 'remarque', 'observations'],
}

export function lireProspects(texte: string): ResultatParsing {
  const lignes = parserCsv(texte)
  const separateur = detecterSeparateur(texte.replace(/^\uFEFF/, '').split(/\r?\n/)[0] ?? '')

  if (lignes.length < 2) {
    return { lignes: [], ignorees: 0, colonnes_reconnues: [], separateur }
  }

  const entetes = lignes[0].map(normaliserEntete)

  // index de colonne pour chaque champ connu
  const position = {} as Record<keyof LigneProspect, number>
  const reconnues: string[] = []

  for (const [champ, alias] of Object.entries(SYNONYMES) as Array<[keyof LigneProspect, string[]]>) {
    const idx = entetes.findIndex(e => alias.includes(e))
    position[champ] = idx
    if (idx >= 0) reconnues.push(champ)
  }

  const valeur = (ligne: string[], champ: keyof LigneProspect) => {
    const i = position[champ]
    if (i < 0) return null
    const v = (ligne[i] ?? '').trim()
    return v === '' ? null : v
  }

  const prospects: LigneProspect[] = []
  let ignorees = 0

  for (const ligne of lignes.slice(1)) {
    const nom = valeur(ligne, 'nom_entreprise')
    if (!nom) { ignorees++; continue } // sans nom, la ligne est inexploitable

    prospects.push({
      nom_entreprise: nom,
      ville: valeur(ligne, 'ville'),
      adresse: valeur(ligne, 'adresse'),
      telephone: valeur(ligne, 'telephone'),
      email_contact: valeur(ligne, 'email_contact'),
      site_web: valeur(ligne, 'site_web'),
      nom_dirigeant: valeur(ligne, 'nom_dirigeant'),
      siret: valeur(ligne, 'siret'),
      secteur_activite: valeur(ligne, 'secteur_activite'),
      notes: valeur(ligne, 'notes'),
    })
  }

  return { lignes: prospects, ignorees, colonnes_reconnues: reconnues, separateur }
}
