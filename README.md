# mur-en-l

Mur de soutènement en L : stabilité externe et sections en béton armé, selon l'**EN 1997** et
l'**EN 1992-1-1**, dans leurs **deux générations**. Un bouton bascule de l'une à l'autre **sans rien
ressaisir**.

Fait partie de la suite [Aedificium web](https://henri421.github.io/WebAedificium/).
Page publiée : <https://henri421.github.io/mur-en-l/> (en anglais : `/en/`).

> **Aide au calcul. L'outil constate, il ne prescrit pas.** Valeurs recommandées des normes, sans
> annexe nationale belge. La 2ᵉ génération n'est applicable qu'une fois son annexe nationale
> publiée. **Aucune valeur n'a encore été comparée à un calcul externe** : les cas de
> `docs/validation/cas-reference.md` sont calculés à la main. La vérification finale incombe à
> l'ingénieur du projet.

## Ce que l'outil rend

- **Stabilité externe** : renversement autour de l'arête du patin, glissement, portance (annexe D
  de l'EN 1997-1:2004 ou résistance q_Rd saisie), excentricité.
- **1ʳᵉ génération** : DA1 (par défaut), DA2, DA3 et EQU pour le renversement.
- **2ᵉ génération** : approches (a) + (b), (c) et (d), classes de conséquences CC1 à CC3.
- **Sections** : flexion, tranchant et armature minimale du voile, du patin et du talon, par les
  moteurs de `section-uls` et avec les efforts de chaque combinaison.
- **Charges** : surcharge uniforme et plusieurs charges en bande de largeur finie, permanentes ou
  variables.
- **Dessins** : coupe avec poussées, poids, cotes et bras de levier, contrainte sous la semelle,
  projection des bandes sur l'écran virtuel.
- **Sorties** : coupe (SVG), résultats (CSV), note de calcul HTML produite par les mêmes fonctions
  que l'écran, saisie enregistrée (JSON).

## Choix déclarés

- **Écran virtuel** au droit du talon ; les terres situées sur le talon pèsent et stabilisent.
- **Charges en bande** : l'EN 1997 ne donne pas de méthode. L'outil diffuse la charge entre
  z₁ = a tan φ'd et z₂ = (a + b) tan(45° + φ'd/2), avec une pression K q uniforme bornée à la
  hauteur de l'écran. Ce qui repose sur le talon pèse sans pousser. Un avertissement le rappelle
  dans le résultat et dans la note. `a` et `b` sont mesurés depuis l'écran ; à la saisie, la
  distance se mesure depuis l'arrière du voile.
- **Part de K_a** : K = p K_a + (1 − p)(1 − sin φ), avec le φ de chaque combinaison. C'est un choix
  de l'outil, sans clause à citer. Il remplace K_a partout ; les angles de diffusion ne changent pas.
- **2ᵉ génération** : largeur de portance réduite de 0,1 m sauf dimensions contrôlées ; facteur de
  profondeur optionnel.
- Sections au nu du voile, sans réduction à la distance d (sens de la sécurité).

## Hors périmètre

Nappe phréatique, bêche, talus incliné, cohésion du remblai, butée devant le patin, calcul non
drainé, états de service (fissuration), stabilité générale du site.

## Origine des moteurs

Ce dépôt appelle trois paquets de la suite : `equilibre-statique` (renversement, glissement,
quatre cas sur la base), `section-uls` (sections) et `aedificium-ui` (interface et note). Le module
de sol est écrit ici, dans `src/sol.ts`.

## Développement

```bash
npm install
npm run typecheck
npm test
npm run build
```

Licence MIT.
