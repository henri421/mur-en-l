# Comparaison avec mb BauStatik S530 : mur « coupe type 1 »

Deuxième confrontation à un logiciel du commerce : mb BauStatik S530.de 2026.009 (DIN EN 1997-1,
DIN 1054:2010, poussées selon la DIN 4085:2017-08), rapport du 04/11/2026. Même géométrie que le
mur A de Frilo, mais d'autres données de sol et de charges : ce n'est pas le même calcul que
`frilo-mur-a.md`. Le script `mb-mur-type1/calcul-app.ts` rejoue l'application
(`npx vite-node docs/validation/mb-mur-type1/calcul-app.ts`).

## Données

| Grandeur | MB | Application |
| :- | :- | :- |
| Voile, semelle | h = 6,08 m, 0,45 m ; patin 0,60 m, talon 2,40 m, 0,40 m | idem |
| Remblai | γ = 19,5 kN/m³, φ' = 30°, **c' = 2,5 kPa** | γ = 19,5, φ' = 30°, c' = 0 (hors périmètre) |
| Sol d'assise | 0,40 m à φ' = 32,5°, puis φ' = 27,5°, c' = 20 kPa ; moyennes DIN 4017 : φ' = 28,89°, c' = 0 | glissement φ' = 32,5° ; portance φ' = 28,89°, c' = 0, D = 0,80 m |
| Bandes | 1 : G 2 kPa sur [0 ; 2,30] ; 2 : Q 5 kPa sur [2,30 ; 4,25] ; 3 : Q 20 kPa sur [4,25 ; 7,25] ; 4 : Q 9 kPa sur [7,25 ; 14,25] | idem, méthode DIN 4085 |
| Tête de voile | Q : 2,80 kN/m horizontal, 2,52 kN·m/m | non saisissable, retiré de MB quand c'est possible |
| Poussées | stabilité en poussée active ; voile au repos (K₀ = 0,5) | part de K_a 100 %, part de K_a du voile 0 % |
| Approche | DA2* (DIN 1054) | DA2*, source unique, bloc du talon, frottement de base ; γ_φ = 1,0 en EQU, C_Rd,c γ_C = 0,15, k₁ = 0,12 |

## La méthode DIN 4085 des charges en bande

Le rapport MB donne, pour chaque bande, l'angle de rupture ϑ, le coefficient K_aVh, la zone chargée
et la résultante. Il en ressort la règle suivante, que l'application applique maintenant en
option (`methodeBandes: 'din4085'`) :

1. seule la part b' de la bande comprise dans le coin de rupture pousse, c'est-à-dire jusqu'à
   H cot ϑ de l'écran ; la bande 4, au-delà, ne pousse pas, et la bande 3 ne compte que pour
   1,98 m sur 3,00 ;
2. ΔE_ah = K_aVh q b', avec K_aVh = K_ah tan ϑ ;
3. la zone chargée va de z₁ = a tan φ' à z₂ = (a + b') tan ϑ, comme l'EAB et l'EAU (E 220) ;
4. MB prend sur l'écran virtuel un frottement moyen de 2,36° (E_av / E_ah de la bande 2), d'où
   ϑ = 59,42° et K_aVh = 0,551 au lieu de 60° et 0,577.

| Bande | MB | Application, δ = 2,36° (test) | Application, δ = 0 | Diffusion de l'outil |
| :- | -: | -: | -: | -: |
| 2, E_ah (kN/m) | 5,10 | 5,10 | 5,34 | 5,34 |
| 3, E_ah (kN/m) | 21,81 | 21,82 | 21,84 | 36,08 |
| 4, E_ah (kN/m) | 0 | 0 | 0 | 11,04 |

La diffusion de l'outil donne la même poussée que la DIN 4085 pour une bande qui commence à
l'écran, mais l'excès K q a (tan ϑ − tan φ') pour une bande éloignée, et elle fait pousser une
bande située hors du coin. C'était la première cause d'écart avec Frilo.

Deux points restent différents. MB répartit la poussée en trapèze quand la bande ne commence pas à
l'écran (5,98 puis 2,08 kPa pour la bande 3), l'application en rectangle ; la résultante est la même,
seul son bras change. Au repos, MB prend ϑ₀ = 55,98° (K₀Vh = 0,741 = K₀ tan ϑ₀), l'application garde
l'angle de la poussée active : la règle de ϑ₀ n'est pas dans le rapport.

## Résultats

Colonne « MB sans tête » : charges en tête de voile retirées à partir des efforts par action du
rapport, pour le renversement, le glissement, la portance (DIN 4017 refaite avec les moyennes de MB)
et le voile. Les sections du talon et du patin les gardent.

| Vérification | MB | MB sans tête | Application |
| :- | -: | -: | -: |
| Poussée des terres E_ah (kN/m, caractéristique) | 117,20 | 117,20 | 136,47 |
| Renversement, e/b rapporté à 1/2 | 0,56 | 0,52 | 0,61 |
| Glissement | 0,87 | 0,85 | 0,99 |
| Portance | 1,83 | 1,66 | 2,51 |
| Voile au repos, M_Ed (kN·m/m) | 570,8 | 541,5 | 533,7 |
| Voile au repos, V_Ed (kN/m) | 262,1 | 257,9 | 256,5 |
| Voile, V_Rd,c (kN/m) | 219,7 | | 218,5 |
| Talon, M_Ed (kN·m/m) | 507,7 | | 465,7 |
| Talon, V_Ed (kN/m) | 212,1 | | 217,8 |
| Patin, M_Ed (kN·m/m) | 40,5 | | 42,3 |
| Patin, V_Ed (kN/m) | 181,1 | | 189,2 |

Les deux calculs refusent le mur en portance.

## Origine des écarts

**Cohésion du remblai.** C'est le premier écart de la stabilité externe. MB retranche K_ach c' = 2,89
kPa sur toute la hauteur et borne la pression par le minimum de la DIN 4085 (K_min = 0,217) dans le
premier mètre : 117,20 kN/m au lieu de 136,47 sans cohésion. Glissement, renversement et portance
en sont plus sévères dans l'application, qui n'admet pas de cohésion dans le remblai.

**Voile.** Au repos et pour les terres seules, l'application retrouve MB exactement
(1,35 × 365,23 kN·m/m, `tests/bancs.test.ts`). Les 1,4 % restants viennent des bandes au repos
(ϑ₀ plus faible chez MB, donc un coin plus large).

**Talon.** MB isole le talon comme le fait l'option « bloc du talon » : poussée active sur l'écran,
pression au repos sur le voile, réaction du sol avec frottement. L'application est 8 % sous MB :
la cohésion réduit chez MB la poussée sur l'écran, qui soulage le talon, et MB garde les charges en
tête de voile.

**Patin.** 4 % d'écart, dans le sens de la sécurité : MB compte le poids de la terre sur le patin,
que l'application ignore.

**Portance.** Outre la poussée, MB compte la terre sur le patin et la composante verticale de
poussée dans V, et calcule φ', c' et γ moyens sur la profondeur de rupture des deux couches ;
l'application prend ces moyennes en données.

## Constat

Avec la méthode DIN 4085, les poussées des bandes coïncident avec MB, et le voile au repos sous les
terres seules est identique. Les écarts restants viennent de données que l'outil ne prend pas encore :
cohésion du remblai avec pression minimale, sol d'assise stratifié, terre sur le patin, charges en
tête de voile, angle ϑ₀ au repos. Ils vont tous dans le sens de la sécurité.
