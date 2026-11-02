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

## T3 — Dessins : coupe, semelle, projection

- **Fichiers modifiés** : `app/src/dessin.ts` (créé : `vuesDisponibles`, `phiDeLaVue`, `coupe`, `baseSvg`, `projectionSvg`, `OptionsDessin`), `app/src/textes.ts` (bloc `coupe` en FR et EN), `app/src/style.css` et `STYLES_TRACE` de `app/src/export.ts` (mêmes règles, fin de fichier).
- **Décisions** : viewBox de largeur fixe 640, échelle x/y unique, marges 110 / 170 ; les textes de cotes et d’efforts passent par `notationSvg` ; `d === null` dans les lignes du pivot est ignoré (pas de bras ni de flèche).
- **Points douteux** : le libellé `q_max` de la semelle reste un simple nombre avec `kPa`, sans symbole ; la hauteur des bandes qui se chevauchent est décalée par rangées de 18 px, valeur non spécifiée par le brief.
- **Statut des tests** : `lancer.mjs . dessin.test` : 69 réussis, 0 échec ; `typecheck.mjs .` : 0 erreur (TypeScript 6.0.3).

## T4 — Note de calcul

- **Fichiers modifiés** : `app/src/note.ts`, `app/src/textes.ts`. Claude : symboles `q` et `génération` dans `vue.ts`, signalés par l'exécutant, qui s'est arrêté à raison sur ce point hors de son périmètre.
- **Statut des tests** : voir le dernier commit de la tâche.

## T5 — Version anglaise

Exécutant arrêté par la limite de tours avec 20 tests en échec : terminé par Claude.

- **Fichiers modifiés** : `app/en/index.html`, `app/src/textes.ts`, `app/src/form.ts` (exécutant) ; `vue.ts`, `note.ts`, `textes.ts` (Claude).
- **Corrections de Claude** : `messageDErreur` ne traduisait rien ; noms de combinaisons et de cas non traduits ; `patin` et `talon` inversés en anglais ; classe `CC2` écrite en dur ; entrées sans unités ; CSV réduit à trois taux, il porte maintenant le détail (`blocsCalcul`, partagé avec la note).
- **Statut des tests** : `lancer.mjs .` : 338 réussis, 0 échec ; typage : 0 erreur.

## T6 (Claude)

- **Fichiers** : `app/public/` (icônes), `README.md`, en-têtes des deux pages, `HANDOFF.md`.
- **Décisions** : lien de manifeste retiré des pages, comme le gabarit (le plugin PWA l'injecte) ; liens vers le hub absolus.
- **Douteux** : aucune compilation Vite ni test jsdom possible sur le poste : la première vérification complète est la CI du premier envoi.
- **Tests** : banc local, tout passe (voir le résultat de la séance) ; la CI reste à constater.
