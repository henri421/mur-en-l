# Handoff

## T1 — Interface, saisie et cablage

### Fichiers modifiés
- `app/src/form.ts` (créé) : `Saisie`, `saisieParDefaut`, `lireSaisie`, `verifier`, `serialiser`, `relire`, `aireParMetre`.
- `app/src/main.ts` (créé) : cablage DOM, saisie en mémoire et localStorage, bascule de génération, bandes, exports.
- `app/index.html` (créé) : page française complète, `h1` « Mur en L », zones et actions exigées.
- `app/src/textes.ts` : ajout de `messages.positifAttendu` (FR et EN), seule chaîne demandée par `form.ts`.
- `app/src/style.css` : règles ajoutées en fin de fichier pour `table.bandes` et `.verdicts` / `.verdict-groupe`.

`app/src/pwa.ts`, `vite.config.ts`, `vue.ts`, `dessin.ts`, `note.ts`, `export.ts`, `src/` et `tests/` n’ont pas été modifiés.

### Décisions
- Une seule `Saisie` pour les deux générations ; les champs propres à l’autre génération restent mémorisés et ne sont pas lus (`qRd` en annexe D, `c`/`gammaBase`/`D` en saisie directe, `Dlower` en 1re).
- Un diamètre d’armature nul vaut une aire nulle sans lire l’espacement ; un espacement non strictement positif est refusé en le nommant (`...espacement`).
- `main.ts` ne calcule rien : il appelle `lireSaisie`, `verifier`, puis les rendus `vue`, `dessin`, `note`, `export`. Le chargement de `pwa.ts` est conditionnel à la présence de `serviceWorker`.
- `relire` remplit les champs absents par les valeurs par défaut et ignore les bandes mal formées ; un format inconnu lève une erreur nommant `/format/i`.

### Points douteux
- `app/src/style.css` contient déjà, vers la ligne 261, un commentaire mal formé (bloc ouvert sans `/*`). Hors périmètre de T1, laissé tel quel.
- La page `en/` n’existe pas encore ; le lien de langue pointe vers `en/` comme demandé.
- `index.html` charge `manifest.webmanifest` et `icone.svg` ; ces fichiers ne sont pas encore présents dans `app/`.

### Statut des tests
- `lancer.mjs . form.test` : 17 réussis, 0 échec.
- `lancer.mjs . page.test` : 11 réussis, 0 échec.
- `typecheck.mjs .` : 0 erreur (TypeScript 6.0.3).

## T2 — Verdicts et volets

Exécutant arrêté par la limite de tours, tests déjà verts : section écrite par Claude.

- **Fichiers modifiés** : `app/src/vue.ts`, `app/src/textes.ts`. Claude : `barres` ajouté à `Calcul` dans `form.ts`.
- **Statut des tests** : `lancer.mjs . vue.test` : 72 réussis, 0 échec ; typage : 0 erreur.
