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
- **Dessin** : coupe cotée du mur, poussée, résultantes et bras de levier (EQU). Bandes avec flèches de
  fermeture et leurs deux droites de diffusion.
- **Verdicts**, en trois groupes distincts : stabilité externe, sections, dispositions.
- **Volets** : détail par combinaison, quatre cas de la base, sections.
- **Note** commune d'aedificium-ui, CSV, SVG, version anglaise sous `/en/` (`textes.ts`). Toute bande saisie
  fait afficher que sa projection n'est pas une méthode de l'EN 1997.

Hors périmètre v1, annoncé à l'écran : nappe, bêche, talus incliné, cohésion du remblai, butée devant
le patin, non drainé (saisir q_Rd), états de service (fissuration), stabilité générale.

## Tâches

| Tâche | Fichiers | Dépendance |
| --- | --- | --- |
| T1 | `app/index.html`, `app/src/form.ts`, `app/src/pwa.ts`, `app/src/style.css`, `vite.config.ts` | noyau |
| T2 | `app/src/vue.ts` : verdicts et volets | T1 |
| T3 | `app/src/dessin.ts` : coupe et bras de levier | T1 |
| T4 | `app/src/note.ts`, `app/src/export.ts`, CSV | T2 |
| T5 | `app/en/index.html`, `app/src/textes.ts` | T4 |
| T6 | icônes, README, carte et menu du hub, publication | T5 |

Les tests d'acceptation de T1 à T5 restent à écrire sur le modèle de `cisaillement-interface/tests/app/`,
et doivent échouer avant l'implémentation.

## Commandes

```bash
export ELECTRON_RUN_AS_NODE=1; "<Code.exe>" ../_banc-local/lancer.mjs .
```

Résultat attendu pour le noyau : tous les tests de `tests/mur.test.ts` et `tests/mur2e.test.ts` réussis.

## Interdits pour l'exécutant

- Modifier `src/`, `tests/mur.test.ts`, `tests/mur2e.test.ts`, `docs/validation/`, ou un test d'acceptation.
- Calculer dans `app/`.
- `git push`, `git tag`.
