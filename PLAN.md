# Mur en L : plan de l'interface

Le noyau `src/` est écrit et testé en 1re génération (Claude, `tests/mur.test.ts`). Reste la page, sur le
gabarit de `cisaillement-interface`. Maquette validée le 2026-11-02 :
`plan-webaedificium/maquette-mur-en-l.html`.

**Bloqué :** l'utilisateur veut les deux générations (2026-11-02). Le noyau de 2e génération passe avant
les tests d'interface, car il change la saisie et l'appel à `verifierMur`. Clauses à relire :

- EN 1997-3:2025 : 5.5.2, 5.5.3, 5.6, 7.5.3, 7.6, tableaux 5.2 et 7.2, annexes B.4 et D.3 ;
- EN 1997-1:2024 : 4.4.1.3, 4.4.1.5 (facteurs de conséquence), 8.1.3.1 (basculement) ;
- EN 1990:2023 : annexe A (VC1 à VC4), 8.3.3.1 ;
- EN 1992-1-1:2023, avec les mécanismes du blog `tranchant-sans-armature` et `armatures-minimales`.

Saisie retenue pour les armatures : diamètre et espacement, convertis dans `form.ts`. Les charges réparties
se dessinent fermées par des flèches à leurs extrémités.

## Spécifications

Entrée unique du calcul : `verifierMur(donnees, profilRecommande())`, types dans `src/index.ts`.
L'interface ne calcule rien : les taux, B' et les efforts viennent du résultat.

- **Saisie** : géométrie, remblai, fondation (annexe D ou q_Rd saisi), armatures, approche (DA1 par
  défaut, DA2, DA3).
- **Dessin** : coupe cotée du mur, poussée, résultantes et bras de levier (EQU).
- **Verdicts**, en trois groupes distincts : stabilité externe, sections, dispositions.
- **Volets** : détail par combinaison, quatre cas de la base, sections.
- **Note** commune d'aedificium-ui, CSV, SVG, version anglaise sous `/en/` (`textes.ts`).

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
export ELECTRON_RUN_AS_NODE=1; "/c/Users/henri/AppData/Local/Programs/Microsoft VS Code/Code.exe" ../_banc-local/lancer.mjs .
```

Résultat attendu pour le noyau : tous les tests de `tests/mur.test.ts` réussis.

## Interdits pour l'exécutant

- Modifier `src/`, `tests/mur.test.ts`, `docs/validation/`, ou un test d'acceptation.
- Calculer dans `app/`.
- `git push`, `git tag`.
