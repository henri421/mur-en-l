# Mur en L : plan de l'interface

Le noyau `src/` est écrit et testé pour les deux générations, charges en bande comprises (Claude,
`tests/mur.test.ts`, `tests/mur2e.test.ts`). Reste la page, sur le gabarit de `cisaillement-interface`.
Maquette validée le 2026-11-02, bandes ajoutées ensuite : `plan-webaedificium/maquette-mur-en-l.html`.

Saisie retenue pour les armatures : diamètre et espacement, convertis dans `form.ts`. Les charges réparties
se dessinent fermées par des flèches à leurs extrémités.

## Spécifications

Entrées du calcul : `verifierMur(donnees, profilRecommande())` en 1re génération,
`verifierMur2e(donnees, profil2eRecommande())` en 2e, types dans `src/index.ts`. L'interface ne calcule rien :
les taux, B' et les efforts viennent du résultat.

- **Saisie** : géométrie, remblai, charges en bande (nature G ou Q, q, distance au voile, largeur ; autant que
  voulu), fondation (annexe D ou q_Rd saisi), armatures.
- **Génération** : 1re par défaut, les données saisies restent au basculement. 1re : DA1, DA2, DA3.
  2e : (a) + (b) par défaut, (c), (d) ; CC2 par défaut ; case « dimensions contrôlées » (retire la déduction
  de 0,10 m) ; case « compter la profondeur » (facteur d_q). Valeurs recommandées annoncées à l'écran et dans
  la note : aucune annexe nationale belge n'est disponible.
- **Dessin** : coupe cotée du mur, poussée, résultantes et bras de levier ; charges réparties fermées par des
  flèches ; contrainte sous la semelle ; croquis de projection des bandes avec leurs deux droites de diffusion.
- **Verdicts**, en trois groupes distincts : stabilité externe, sections, dispositions.
- **Volets** : détail par combinaison, quatre cas de la base, sections.
- **Note** commune d'aedificium-ui, CSV, SVG, version anglaise sous `/en/` (`textes.ts`). Toute bande saisie
  fait afficher que sa projection n'est pas une méthode de l'EN 1997.

Hors périmètre v1, annoncé à l'écran : nappe, bêche, talus incliné, cohésion du remblai, butée devant
le patin, non drainé (saisir q_Rd), états de service (fissuration), stabilité générale.

## Contrat des modules

Les tests lisent ces noms, qui ne se négocient pas.

- `app/src/form.ts` : `Saisie` (`generation`, `approche1`, `approche2`, `consequences`, `dimensionsControlees`,
  `profondeurComptee`, `Dlower`, `h`, `eHaut`, `eBas`, `es`, `patin`, `talon`, `gammaBeton`, `gamma`, `phi`, `q`,
  `partKa` (en %, 100 par défaut), `bandes`, `phiBase`, `deltaSurPhi`, `modePortance`, `qRd`, `c`, `gammaBase`, `D`, `fck`, `fyk`, `a`, `voileArriere`,
  `voileAvant`, `semelleHaut`, `semelleBas`), `saisieParDefaut`, `lireSaisie` (rend `{ ok, calcul }`), `Calcul`,
  `verifier`, `aireParMetre`, `serialiser`, `relire`. Format de fichier : `mur-en-l/1`.
- `app/src/vue.ts` : `verdictsHtml(r)`, `voletsHtml(r)`, `blocEntrees(calcul)`, `blocsResultat(r)`, `messageDErreur(e)`.
- `app/src/dessin.ts` : `vuesDisponibles(r)`, `phiDeLaVue(r, vue)`, `coupe(calcul, r, vue, options)`, `baseSvg(r, vue)`,
  `projectionSvg(calcul, phi)`. Classes imposées en tête de `tests/app/dessin.test.ts`.
- `app/src/note.ts` : `noteDuCalcul(calcul, r, cartouche)`. `app/src/export.ts` : `STYLES_TRACE`.
- `app/src/textes.ts` : `textes()`, `phrase`.

Dessin et mise en page suivent la maquette, lue par morceaux : saisie lignes 101 à 167, coupe 170 à 280, semelle
281 à 304, projection 305 à 350, volets 351 à 414, verdicts 415 à 443. Styles lignes 7 à 100.

## Tâches

Le gabarit est `../cisaillement-interface/app/` : ne lire que le fichier nommé pour la tâche.

| Tâche | Fichiers | Gabarit à lire | Commande (filtre) | Dépend de |
| --- | --- | --- | --- | --- |
| T1 | `app/index.html`, `app/src/form.ts`, `app/src/main.ts`, `app/src/pwa.ts`, `app/src/style.css`, `vite.config.ts` | `index.html`, `form.ts`, `main.ts`, `pwa.ts`, `style.css` | `form.test`, puis `page.test` | noyau |
| T2 | `app/src/vue.ts`, `app/src/textes.ts` | `vue.ts`, `textes.ts` | `vue.test` | T1 |
| T3 | `app/src/dessin.ts` | aucun : la maquette | `dessin.test` | T1 |
| T4 | `app/src/note.ts`, `app/src/export.ts` | `note.ts`, `export.ts` | `note.test` | T2, T3 |
| T5 | `app/en/index.html`, `app/src/textes.ts` | `en/index.html` | `anglais.test` | T4 |
| T6 | icônes, README, carte et menu du hub, publication | Claude, pas l'exécutant | | T5 |

`page.test` lit `main.ts` tel qu'il sera à la fin : ses tests « main.ts » ne peuvent passer qu'après T4. Il est
normal que `main.ts` importe des modules encore vides pendant T1 ; les écrire avec leur signature suffit.

## Commandes

Une tâche (remplacer `form.test` par le filtre du tableau) :

```bash
export ELECTRON_RUN_AS_NODE=1; "<Code.exe>" ../_banc-local/lancer.mjs . form.test
```

Tout, puis le typage, à la fin de chaque tâche :

```bash
export ELECTRON_RUN_AS_NODE=1; "<Code.exe>" ../_banc-local/lancer.mjs .
```

```bash
export ELECTRON_RUN_AS_NODE=1; "<Code.exe>" ../_banc-local/typecheck.mjs .
```

Résultat attendu à la fin de T5 : tous les tests réussis, 0 erreur de typage.

## Décisions laissées à l'exécutant

Noms internes, découpage des fonctions privées, disposition fine tant que la maquette reste reconnaissable. Pas de
fond noir, pas d'interface façon tableur.

## Interdits pour l'exécutant

- Modifier `src/`, `tests/`, `docs/validation/`. Si un test paraît faux, s'arrêter sur cette tâche et le signaler dans
  `HANDOFF.md`.
- Calculer dans `app/`.
- `git push`, `git tag`.
