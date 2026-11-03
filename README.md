# mur-en-l

Mur de soutènement en L : stabilité externe et sections en béton armé, selon l'**EN 1997** et
l'**EN 1992-1-1**, dans leurs **deux générations**. Un bouton bascule de l'une à l'autre **sans rien
ressaisir**.

Fait partie de la suite [Aedificium web](https://henri421.github.io/WebAedificium/).
Page publiée : <https://henri421.github.io/mur-en-l/> (en anglais : `/en/`).

> **Aide au calcul. L'outil constate, il ne prescrit pas.** Valeurs recommandées des normes par
> défaut ; chaque coefficient partiel se modifie à l'écran, ce qui permet d'appliquer une annexe
> nationale, et la note liste les valeurs changées. La 2ᵉ génération n'est applicable qu'une fois son
> annexe nationale publiée. Les cas de `docs/validation/cas-reference.md` sont calculés à la main ;
> une première comparaison avec Frilo WSM+ est dans `docs/validation/frilo-mur-a.md`. La
> vérification finale incombe à l'ingénieur du projet.

## Ce que l'outil rend

- **Stabilité externe** : renversement autour de l'arête du patin, glissement, portance (annexe D
  de l'EN 1997-1:2004 ou résistance q_Rd saisie), excentricité.
- **1ʳᵉ génération** : DA1 (par défaut), DA2, DA2* (coefficients sur les effets, comme la DIN 1054),
  DA3 et EQU pour le renversement.
- **Coefficients partiels modifiables** : jeux A, M et R de l'EN 1997-1, EQU, et γ_C, γ_S, α_cc,
  C_Rd,c et k₁ de l'EN 1992-1-1 ; en 2ᵉ génération, k_F, k_M, k_R, γ des cas de vérification, γ_C,
  γ_S et γ_V. Une valeur changée porte la source « valeur saisie », avec la valeur recommandée.
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
- **DA2*** : excentricité, largeur efficace et inclinaison de la portance avec les actions
  caractéristiques ; effort normal de calcul comparé à R_k / γ_R,v. Glissement comme en DA2.
- **Principe de source unique** (EN 1997-1 §2.4.2(9), note), en option : les terres sur le talon
  prennent le coefficient de la poussée dans les cas de la base (portance, sections). Le glissement
  et le renversement restent inchangés.
- **δ sur le parement du voile**, en option (δ/φ′, 0 par défaut) : K_ah de Coulomb pour le voile
  seul, composante verticale E_av dans l'effort normal et moment réduit de E_av e/2. L'écran virtuel
  garde δ = 0.
- **Bloc du talon**, en option : le talon est isolé avec les terres qu'il porte ; la poussée sur
  l'écran virtuel et la réaction du voile entrent dans son moment, E_av dans son effort tranchant.
  Par défaut, console sous poids et réaction du sol, plus sûre.
- **Frottement de base**, en option : réparti comme la pression, avec un bras de demi-épaisseur ;
  il réduit les moments du patin et du talon.

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
