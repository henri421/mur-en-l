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
| Remblai | γ = 19,5 kN/m³, φ' = 30°, c' = 2,5 kPa, δ = 2/3 φ' sur l'about | idem |
| Sol d'assise | 0,40 m à φ' = 32,5°, puis φ' = 27,5°, c' = 20 kPa ; moyennes DIN 4017 : φ' = 28,89°, c' = 0 | glissement φ' = 32,5° ; portance φ' = 28,89°, c' = 0, D = 0,80 m |
| Bandes | 1 : G 2 kPa sur [0 ; 2,30] ; 2 : Q 5 kPa sur [2,30 ; 4,25] ; 3 : Q 20 kPa sur [4,25 ; 7,25] ; 4 : Q 9 kPa sur [7,25 ; 14,25] | idem, méthode DIN 4085 |
| Tête de voile | Q : 2,80 kN/m horizontal, 2,52 kN·m/m | idem |
| Terres devant le mur | 0,80 m au-dessus de la base | idem |
| Résistance sous la base | σ_R,d = 260 kPa | idem |
| Poussées | stabilité en poussée active ; voile au repos (K₀ = 0,5) | part de K_a 100 %, part de K_a du voile 0 % |
| Approche | DA2* (DIN 1054) | DA2*, bloc du talon, frottement de base, sans source unique ; γ_φ = 1,0 en EQU, C_Rd,c γ_C = 0,15, k₁ = 0,12 |

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

Toutes les données de MB sont maintenant saisies dans l'application, sauf la stratification du sol
d'assise, dont les moyennes de MB sont reprises.

| Vérification | MB | Application | Écart |
| :- | -: | -: | -: |
| Poussée des terres E_ah (kN/m, caractéristique) | 117,20 | 117,20 | 0 % |
| Hauteur de E_ah depuis la base (m) | 2,09 | 2,09 | 0 % |
| E_av sur l'about (kN/m) | 4,65 | 4,65 | 0 % |
| Renversement, e/b rapporté à 1/2 | 0,56 | 0,57 | +2 % |
| Glissement | 0,87 | 0,87 | 0 % |
| Portance | 1,83 | 1,83 | 0 % |
| Contrainte sous la base, σ_E,d (kPa) | 255,3 | 251,1 | −2 % |
| Excentricité, 2ᵉ noyau | 0,57 | 0,56 | −2 % |
| Voile au repos, M_Ed (kN·m/m) | 570,8 | 563,0 | −1,4 % |
| Voile au repos, V_Ed (kN/m) | 262,1 | 260,7 | −0,5 % |
| Voile, V_Rd,c (kN/m) | 219,7 | 218,5 | −0,5 % |
| Talon, M_Ed (kN·m/m) | 507,7 | 502,3 | −1,1 % |
| Talon, V_Ed (kN/m) | 212,1 | 206,2 | −2,8 % |
| Patin, M_Ed (kN·m/m) | 40,5 | 39,7 | −2 % |
| Patin, V_Ed (kN/m) | 181,1 | 176,7 | −2,4 % |

Les deux calculs refusent le mur en portance (1,83) et acceptent la contrainte sous la base.

## Origine des écarts

**Bandes.** MB prend sur l'écran un frottement moyen de 2,36° pour les bandes ; l'application garde
δ = 0 sur le sol au-dessus du talon : 26,9 au lieu de 27,2 kN/m caractéristiques, 0,4 kN/m sur H_d.
Au repos, MB prend ϑ₀ = 55,98° au lieu de l'angle de la poussée active : c'est le 1,4 % du voile.

**Talon et patin, effort tranchant.** MB combine dans les sections les terres sur le talon à 1,0 avec
la poussée à 1,35 (combinaison 27) : l'option « source unique » doit rester désactivée pour le suivre
(avec elle, le tranchant du talon baisse de 4,5 %). La composante E_av de l'about charge le bout du
talon dans les deux logiciels. Le reste vient de l'angle ϑ₀ et des composantes verticales des bandes,
que MB ajoute aux verticales.

**Contrainte sous la base.** B′ = 2,158 m dans l'application contre 2,13 dans MB, qui compte aussi
les composantes verticales des bandes dans les moments.

**Sol d'assise.** MB calcule φ', c' et γ moyens sur la profondeur de rupture des couches (DIN 4017) ;
l'application les prend en données.

## Constat

Toutes données saisies, l'application retrouve MB à 2 % près sur la stabilité externe et à 3 % près
sur les efforts des sections. Restent à reprendre la répartition trapézoïdale et l'angle ϑ₀ de
la DIN 4085 (texte de la norme attendu), et la moyenne des couches du sol d'assise de la DIN 4017.
