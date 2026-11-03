# Plan de parité avec Frilo WSM+

Objectif : que l'outil couvre ce que Frilo WSM+ vérifie sur un mur en L, sans renoncer à la doctrine
de la suite (l'outil constate, chaque choix est déclaré, les valeurs recommandées restent la base,
une annexe nationale est un profil dérivé). Le mur A (`docs/validation/frilo-mur-a.md`) sert de
premier banc ; le même mur saisi dans MBaec en donnera un second.

Rendre une armature requise reste un constat au sens de `CONVENTIONS.md` : c'est la section qui
satisfait l'inéquation normative, pas un plan de ferraillage.

## Inventaire des écarts

| Domaine | Frilo WSM+ | Outil aujourd'hui | Lot |
| :- | :- | :- | :- |
| Bancs de comparaison | | un cas calculé à la main | L0 |
| Approche allemande DA2* | oui | DA1, DA2, DA3 | L1 |
| Principe de source unique | implicite en DA2* | non | L1 |
| Profils d'annexe nationale | DIN | recommandées seules | L1 |
| δ sur le parement du voile (STR) | 2/3 φ' saisi | δ = 0 | L1 |
| Talon : prisme de terre isolé, frottement de base | oui | console simple | L1 |
| Plusieurs actions variables, ψ₀, catégories | oui | une seule famille Q | L2 |
| Charges sur le voile (moment, force en tête) | oui | non | L2 |
| Bandes : diffusion trapézoïdale, charges linéiques | oui | diffusion uniforme | L2 |
| Terre sur le patin, niveau aval distinct | oui | ignorée | L2 |
| Goussets, talon et patin d'épaisseurs différentes | oui | voile à fruit avant seul | L3 |
| Talus incliné (Coulomb) | oui | hors périmètre | L3 |
| Bêche | option | hors périmètre | L3 |
| Remblai multicouche, cohésion | oui | une couche, c' = 0 | L4 |
| Nappe, γ', pression d'eau | oui | hors périmètre | L4 |
| Butée devant le patin, poussée au repos ou de compactage | option | partKa seul | L4 |
| Portance en sol stratifié (moyennes DIN 4017) | oui | une couche | L5 |
| Joint bâillant, noyaux 1 et 2 | oui | 2e génération seule | L5 |
| Tassement et rotation | oui | hors périmètre | L5 |
| Stabilité générale (Bishop) | oui | hors périmètre | L5 |
| Armatures requises, cadres requis | oui | taux pour As saisie | L6 |
| Enrobage par classe d'exposition | oui | distance saisie | L6 |
| Ouverture des fissures | w_max affiché | hors périmètre | L6 |
| Flambement du voile | absent | absent | L6, avantage possible |
| Note détaillée par cas de charge, croquis d'armatures | oui | note par combinaison | L7 |

## Lots

Les lots sont ordonnés par effet sur le banc Frilo : L1 et L2 suffisent à rejouer le mur A sans
retouche ; les suivants élargissent le domaine. Taille indicative : P (petit), M (moyen), G (grand).

### L0. Bancs de comparaison (P)

Format `docs/validation/bancs/<nom>.json` : saisie de l'outil, logiciel, version, normes, valeurs
relevées avec leur page, et tolérance par grandeur. Un test `tests/bancs.test.ts` charge chaque banc
et compare, en marquant « écart déclaré » ce qu'un choix de l'outil explique encore. Bancs prévus :
Frilo mur A complet et sans actions de catégorie C, MBaec mur A, puis un cas sans bande pour isoler
les poussées. À faire avant tout autre lot : chaque lot suivant doit faire baisser l'écart mesuré.

### L1. Options de méthode (M)

État au 2026-11-03 : lot fait (DA2*, source unique, coefficients modifiables à l'écran au lieu de
profils d'annexe codés en dur, δ sur le parement, bloc du talon, frottement de base). δ sur l'about
du talon pour l'écran virtuel reste à faire (2 % sur la poussée du mur A). L0 : `tests/bancs.test.ts`
compare au rapport Frilo les grandeurs dont les hypothèses coïncident.

Ce lot referme l'essentiel des écarts du mur A.

1. **Approche DA2*** (DIN 1054:2010, 2.4.7.3.4) : excentricité, inclinaison et largeur efficace
   avec les actions caractéristiques, effort normal majoré seul. `src/profil.ts` (approche
   `DA2*`), `calculerCombinaison` dans `src/mur.ts`.
2. **Principe de source unique** (EN 1997-1 §2.4.2(9), note) : case qui affecte le même coefficient
   aux terres sur le talon et à la poussée. Supprime les cas « verticales inf » pour le remblai.
3. **Coefficients modifiables** : aucune annexe codée en dur. Les valeurs recommandées sont
   proposées, chacune se change à l'écran ; pour rejouer Frilo : γ_φ = 1,0 en EQU, C_Rd,c γ_C = 0,15,
   k₁ = 0,12. C_Rd,c et k₁ passent par les options de `shearWithoutLinks` de `section-uls`.
4. **δ sur le parement réel** (EN 1997-1 §9.5.1(6)) pour le voile : K_a de Coulomb, composante
   verticale E_av dans N et son moment excentré. Et δ sur l'about du talon pour l'écran virtuel,
   en option.
5. **Talon par prisme isolé** : poussées sur l'écran virtuel et sur le voile, frottement de base
   réparti comme la pression, en option à côté de la console actuelle (qui reste par défaut, plus
   sûre). Même option de frottement pour le patin.

Validation : mur A sans actions de catégorie C, profil DIN, DA2*, δ = 2/3 φ'. Cible : renversement,
glissement, portance et voile à moins de 3 % de Frilo, bandes mises à part.

### L2. Actions (M)

1. **Actions variables multiples** : catégorie (EN 1990 tableau A1.1), ψ₀, ψ₁, ψ₂ ; combinaisons
   6.10 avec action dominante et concomitantes, énumérées comme le fait Frilo (12 combinaisons pour
   le mur A). Fichier nouveau `src/combinaisons.ts`.
2. **Charges sur le voile** : moment en tête, force horizontale et verticale linéiques à une
   hauteur donnée, nature G ou Q.
3. **Bandes** : seconde méthode de diffusion, trapézoïdale avec angle de rupture propre à la bande
   (DIN 4085:2017), choisie par l'utilisateur ; l'actuelle reste disponible. Charges linéiques et
   ponctuelles sur le remblai. Avertissement maintenu : aucune des deux n'est dans l'EN 1997.
4. **Terre devant le patin** : poids sur le patin et hauteur aval distincte de la profondeur D.

Validation : mur A complet, sans retouche des actions.

### L3. Géométrie (M)

Goussets amont et aval du voile, gousset du talon, épaisseurs distinctes du patin et du talon,
parement arrière incliné. Talus incliné β avec Coulomb (EN 1997-1 annexe C, C.2), qui remplace
Rankine sur l'écran virtuel. Bêche sous la semelle, avec sa butée et son effet sur le glissement.
`blocs()` devient une liste de polygones : poids, centres et dessin en sortent ensemble, ce qui
évite de dupliquer la géométrie dans `dessin.ts`.

### L4. Sols et eau (G)

Remblai multicouche (γ, γ', φ', c' par couche), cohésion avec annulation des tractions, comme
Frilo. Nappe amont et aval : poids déjaugés, pression d'eau sur l'écran et sous-pression sous la
semelle, avec le cas UPL déjà prévu dans `equilibre-statique`. Butée devant le patin avec facteur
de réduction saisi (EN 1997-1 §9.5.3 et annexe C). Poussée au repos ou de compactage pour les
sections, distincte de celle de la stabilité externe, ce que Frilo sépare aussi.

### L5. Vérifications géotechniques (G)

1. **Joint bâillant** en 1re génération : noyau 1 pour les permanentes (e ≤ B/6) et noyau 2 pour
   toutes les actions (e ≤ B/3), constats de service distincts.
2. **Portance en sol stratifié** : moyennes pondérées sur la profondeur de rupture, comme la DIN
   4017, signalées comme choix hors EN 1997.
3. **Tassement et rotation** : contrainte de Steinbrenner ou de Boussinesq sous semelle rigide,
   modules saisis par couche, profondeur limite déclarée.
4. **Stabilité générale** : Bishop simplifié (EN 1997-1 §11), grille de centres et de rayons,
   lamelles, charges défavorables seules. Lot le plus long ; il peut devenir un paquet partagé de
   la suite.

### L6. Béton armé (M)

Armatures requises en flexion et cadres requis en tranchant, rendus à côté des taux pour l'armature
saisie. Enrobage nominal par classe d'exposition (EN 1992-1-1 §4.4.1), axe des barres déduit.
Ouverture des fissures (§7.3.4) à la combinaison quasi permanente, et armature minimale de maîtrise
(§7.3.2). Réduction de l'effort tranchant à d du nu, en option. Flambement du voile (§5.8), que Frilo
signale comme absent : ce serait un avantage de l'outil.

### L7. Sorties (P)

Note détaillée par cas de charge, avec les formules développées comme dans Frilo, pour qu'un
contrôleur suive chaque terme. Croquis d'armatures schématique. Export du banc de comparaison
depuis l'interface, pour qu'un essai dans un autre logiciel devienne un fichier de `bancs/`.

## Ordre conseillé

L0, puis L1 et L2, qui rendent le mur A rejouable à l'identique. Ensuite L6 et L5.1, peu coûteux et
utiles au quotidien. L3 et L4 étendent le domaine. L5.3 et L5.4 arrivent en dernier, ce sont les
plus longs à valider.

## Banc MBaec

Saisir dans MBaec le mur A tel quel, puis sans les actions de catégorie C, et relever par
vérification : poussée des terres et de chaque bande, efforts sur la base, taux EQU, glissement et
portance, M_Ed et V_Ed au nu du voile, du talon et du patin, armatures requises. Noter l'annexe
nationale, l'approche, δ et la méthode de diffusion des bandes : sans elles, l'écart ne s'interprète
pas.
