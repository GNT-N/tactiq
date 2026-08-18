'use client'

import { useEffect, useRef, useState } from 'react'

// Modification d'un champ isolé, sans ouvrir le formulaire complet.
// Au repos la valeur ressemble à une valeur ; au survol un soulignement
// discret indique qu'elle se modifie. Pas d'icône crayon sur chaque ligne :
// vingt crayons ne disent rien de plus qu'un seul comportement cohérent.

interface Props {
  libelle: string
  valeur: string | null
  onEnregistrer: (valeur: string | null) => Promise<unknown>
  type?: 'text' | 'tel' | 'email' | 'url'
  mono?: boolean
  placeholder?: string
}

export default function ChampEditable({
  libelle, valeur, onEnregistrer, type = 'text', mono = false, placeholder = '—',
}: Props) {
  const [edition, setEdition] = useState(false)
  const [brouillon, setBrouillon] = useState(valeur ?? '')
  const [enregistrement, setEnregistrement] = useState(false)
  const champ = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (edition) champ.current?.focus()
  }, [edition])

  // Une valeur modifiée ailleurs (enrichissement, analyse) doit se refléter
  // ici. C'est l'ajustement pendant le rendu recommandé par React pour
  // synchroniser un état avec une prop — un effet provoquerait un rendu en
  // cascade et n'est pas fait pour ça.
  const [valeurConnue, setValeurConnue] = useState(valeur)
  if (valeur !== valeurConnue && !edition) {
    setValeurConnue(valeur)
    setBrouillon(valeur ?? '')
  }

  const valider = async () => {
    const propre = brouillon.trim()
    const nouvelle = propre === '' ? null : propre

    if (nouvelle === (valeur ?? null)) { setEdition(false); return }

    setEnregistrement(true)
    try {
      await onEnregistrer(nouvelle)
      setEdition(false)
    } finally {
      setEnregistrement(false)
    }
  }

  const annuler = () => {
    setBrouillon(valeur ?? '')
    setEdition(false)
  }

  return (
    <div className="flex justify-between items-center gap-3 min-h-[28px]">
      <span className="text-[var(--texte-attenue)] shrink-0">{libelle}</span>

      {edition ? (
        <input
          ref={champ}
          type={type}
          value={brouillon}
          disabled={enregistrement}
          onChange={e => setBrouillon(e.target.value)}
          onBlur={valider}
          onKeyDown={e => {
            if (e.key === 'Enter') valider()
            if (e.key === 'Escape') annuler()
          }}
          className={`flex-1 min-w-0 text-right bg-[var(--acier-700)] border border-[var(--theme-primary-50)] px-2 py-0.5 text-white text-sm focus:outline-none ${mono ? 'donnee' : ''}`}
        />
      ) : (
        <button
          type="button"
          onClick={() => setEdition(true)}
          title={`Modifier ${libelle.toLowerCase()}`}
          className={`text-right truncate transition border-b border-dashed border-transparent hover:border-[var(--theme-primary-50)] ${mono ? 'donnee' : ''} ${valeur ? 'text-white' : 'text-[var(--texte-attenue)]'}`}
        >
          {valeur || placeholder}
        </button>
      )}
    </div>
  )
}
