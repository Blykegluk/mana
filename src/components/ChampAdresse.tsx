import { useEffect, useId, useRef, useState } from 'react'
import { suggererAdresses, type AdresseSuggeree } from '../lib/adresse'

/**
 * Saisie d'adresse assistée : la frappe reste libre, et les adresses de la
 * Base Adresse Nationale qui correspondent s'affichent dessous. Choisir une
 * suggestion remplace la saisie par l'adresse complète (voie, code postal,
 * commune). Clavier : ↑ ↓ pour parcourir, Entrée pour choisir, Échap pour fermer.
 */
export function ChampAdresse({
  value,
  onChange,
  onChoisir,
  placeholder,
  communes,
  autoFocus,
}: {
  value: string
  onChange: (texte: string) => void
  /** Appelé avec l'adresse structurée quand une suggestion est choisie. */
  onChoisir?: (a: AdresseSuggeree) => void
  placeholder?: string
  /** Ne propose que des communes (« Suresnes 92150 »). */
  communes?: boolean
  autoFocus?: boolean
}) {
  const id = useId()
  const [suggestions, setSuggestions] = useState<AdresseSuggeree[]>([])
  const [ouvert, setOuvert] = useState(false)
  const [actif, setActif] = useState(-1)
  // Pas de recherche tant que l'utilisateur n'a pas tapé : une valeur déjà
  // enregistrée ne doit pas ouvrir la liste à l'affichage du formulaire.
  const frappe = useRef(false)

  useEffect(() => {
    if (!frappe.current) return
    const controle = new AbortController()
    const minuterie = window.setTimeout(() => {
      suggererAdresses(value, { communes, signal: controle.signal })
        .then((s) => {
          setSuggestions(s)
          setActif(-1)
          setOuvert(s.length > 0)
        })
        .catch(() => {
          /* service indisponible ou requête annulée : la saisie libre suffit */
        })
    }, 250)
    return () => {
      window.clearTimeout(minuterie)
      controle.abort()
    }
  }, [value, communes])

  function choisir(a: AdresseSuggeree) {
    frappe.current = false
    onChange(a.libelle)
    onChoisir?.(a)
    setOuvert(false)
    setSuggestions([])
  }

  function clavier(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!ouvert || suggestions.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActif((i) => (i + 1) % suggestions.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActif((i) => (i <= 0 ? suggestions.length - 1 : i - 1))
    } else if (e.key === 'Enter' && actif >= 0) {
      e.preventDefault()
      choisir(suggestions[actif])
    } else if (e.key === 'Escape') {
      setOuvert(false)
    }
  }

  return (
    <div className="champ-adresse">
      <input
        type="text"
        role="combobox"
        aria-expanded={ouvert}
        aria-controls={`${id}-liste`}
        aria-autocomplete="list"
        aria-activedescendant={actif >= 0 ? `${id}-${actif}` : undefined}
        autoComplete="off"
        autoFocus={autoFocus}
        value={value}
        placeholder={placeholder}
        onChange={(e) => {
          frappe.current = true
          onChange(e.target.value)
        }}
        onKeyDown={clavier}
        onFocus={() => suggestions.length > 0 && setOuvert(true)}
        onBlur={() => setOuvert(false)}
      />
      {ouvert && (
        <ul className="champ-adresse-liste" id={`${id}-liste`} role="listbox">
          {suggestions.map((a, i) => (
            <li
              key={a.libelle}
              id={`${id}-${i}`}
              role="option"
              aria-selected={i === actif}
              className={i === actif ? 'actif' : ''}
              // mousedown plutôt que click : il passe avant le blur qui ferme la liste
              onMouseDown={(e) => {
                e.preventDefault()
                choisir(a)
              }}
              onMouseEnter={() => setActif(i)}
            >
              {a.voie ? (
                <>
                  <strong>{a.voie}</strong> <span className="muted">{a.codePostal} {a.commune}</span>
                </>
              ) : (
                <>
                  <strong>{a.commune}</strong> <span className="muted">{a.codePostal}</span>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
