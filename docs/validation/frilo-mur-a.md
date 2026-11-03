# Comparaison avec Frilo WSM+ : mur A

Première confrontation de l'outil à un logiciel du commerce. Le mur A a été calculé dans Frilo WSM+
(version 2026-0-7, DIN EN 1992-1-1/NA et DIN EN 1997-1/NA, donc approche DA2* allemande), puis
ressaisi dans le noyau de l'application. Les scripts sont dans `frilo-mur-a/` :
`calcul-app.ts` rejoue l'application (`npx vite-node docs/validation/frilo-mur-a/calcul-app.ts`),
`frilo.py` rejoue le procédé Frilo à partir de ses efforts par cas de charge. Ce second script
retrouve les valeurs du rapport au centième (R_n,k = 416,8 kN/m, moments de sol du talon 152,99 et
du patin 40,05 kN·m/m, efforts tranchants 67,69 et 206,50 kN/m), ce qui autorise à retirer
proprement de Frilo les actions que l'application ne sait pas saisir.

## Données communes

| Grandeur | Valeur |
| :- | :- |
| Voile | h = 6,08 m au-dessus de la semelle ; 0,45 m constant |
| Semelle | 0,40 m ; patin 0,60 m ; talon 2,40 m ; B = 3,45 m ; H_t = 6,48 m |
| Béton | 25 kN/m³, C30/37, B500A, axe des barres à 55 mm |
| Remblai | γ = 18 kN/m³, φ'k = 32,5°, c' = 0 |
| Sol d'assise | φ'k = 32,5° et γ = 18 kN/m³ pour la portance ; δk = 30° pour le glissement ; D = 0,60 m |
| Bandes (Q, catégorie F) | 2 kPa sur [0 ; 2,30] ; 5 kPa sur [2,30 ; 4,25] ; 20 kPa sur [4,25 ; 7,25] ; 9 kPa sur [7,25 ; 10,75], depuis l'arrière du voile |
| Tête de voile (Q, catégorie C) | moment 2,52 kN·m/m et force horizontale 2,80 kN/m : **non saisissables dans l'application** |

Les deux actions de catégorie C sont retirées de Frilo par recalcul (colonne « Frilo sans C »)
pour comparer à actions égales. L'application est lancée en DA2 avec les valeurs recommandées, et
avec un profil dérivé où γ_φ = 1,0 en EQU, comme le fait l'annexe allemande.

## Résultats

| Vérification | Frilo | Frilo sans C | Application DA2 | Écart app / Frilo sans C |
| :- | -: | -: | -: | -: |
| Renversement EQU, γ_φ = 1,25 (recommandé) | | | 0,93 | |
| Renversement EQU, γ_φ = 1,0 | 0,66 | 0,63 | 0,72 | +14 % |
| Glissement | 1,05 | 1,03 | 1,16 | +12 % |
| Portance | 1,69 | 1,56 | 8,69 (2,46 verticales majorées) | voir plus bas |
| Excentricité G + Q, e / (B/3) | 0,65 | 0,62 | 0,68 | +11 % |
| Voile, M_Ed (kN·m/m) | 297,8 | 277,3 | 368,8 | +33 % |
| Voile, V_Ed (kN/m) | 145,9 | 142,9 | 185,8 | +30 % |
| Voile, armature tendue (cm²/m) | 16,43 | | 22,17 | |
| Talon, M_Ed (kN·m/m) | 222,3 | 206,1 | 369,4 | +79 % |
| Talon, V_Ed (kN/m) | 171,3 | 154,4 | 248,9 | +61 % |
| Talon, armature supérieure (cm²/m) | 15,46 | | 26,97 | |
| Patin, M_Ed (kN·m/m) | 36,8 | 35,5 | 72,3 | +104 % |
| Patin, V_Ed (kN/m) | 198,3 | 183,7 | 222,6 | +21 % |
| Patin, armature inférieure (cm²/m) | 4,98 (minimum) | | 5,20 (minimum) | +4 % |

Le verdict concorde : les deux calculs refusent le mur en portance et en glissement. Les poids
concordent aussi : moment stabilisant 636,23 kN·m/m dans l'application contre 636,81 dans Frilo,
la différence étant la terre posée sur le patin, que l'application ignore.

## Origine des écarts

**Poussée des terres.** 113,75 kN/m dans l'application contre 111,47 dans Frilo (+2 %). Frilo
applique δ = 2/3 φ' sur les 0,40 m de l'about du talon (K_agh = 0,251) et Rankine au-dessus ;
l'application prend δ = 0 sur toute la hauteur de l'écran virtuel.

**Charges en bande.** C'est le premier écart. Pour la bande 2, qui commence à l'écran, les deux
méthodes donnent la même poussée (5,07 kN/m). Pour les bandes 3 et 4, éloignées de l'écran,
l'application diffuse une pression uniforme K q entre z₁ = a tan φ' et z₂ = (a + b) tan(45° + φ'/2),
alors que Frilo trace un trapèze décroissant avec son propre angle de rupture (z₂ = 8,45 m au lieu
de 8,84 m pour la bande 3) : 31,9 contre 23,6 kN/m pour la bande 3, 9,2 contre 5,9 pour la bande 4.
La poussée variable caractéristique totale vaut 46,2 kN/m contre 34,6 (+33 %). Cet écart explique à
lui seul l'essentiel des écarts en EQU (avec γ_φ = 1), en glissement et dans le voile.

**Renversement.** Avec la valeur recommandée γ_φ = 1,25 du tableau A.2, le taux monte à 0,93 ; à
γ_φ = 1,0, comme Frilo, il reste 0,72 contre 0,63, différence due aux bandes et à la composante
verticale de poussée que Frilo compte sur l'about du talon.

**Glissement.** H_d = 222,8 kN/m contre 202,4 (bandes +17,4 kN/m, terres +3,1) ; N = 365,6 contre
373,5, Frilo comptant la terre sur le patin, la composante verticale de poussée et, à 1,0, les
composantes verticales des bandes, qui sont pourtant des actions variables favorables.

**Portance.** L'écart tient à la méthode, non aux formules : le facteur DIN 4017 N_b0 = 15,03
multiplie γ b', ce qui équivaut exactement au N_γ = 30,05 de l'annexe D. Décomposition :

| Étape | Taux |
| :- | -: |
| Frilo, rapport | 1,69 |
| Frilo sans actions de catégorie C | 1,56 |
| Actions de l'application, méthode DA2* (e et inclinaison caractéristiques, N_d = 1,35 N_k) | 2,17 |
| Application, DA2, verticales majorées (e = 0,84 m, H/V = 0,45 de calcul) | 2,46 |
| Application, DA2, verticales à 1,0 et poussée à 1,35 (e = 1,21 m > B/3) | 8,69 |

DA2* (DIN 1054) calcule l'excentricité et l'inclinaison avec les actions caractéristiques et
majore seulement l'effort normal. L'application applique DA2 sur les actions et combine des terres
sur le talon favorables (1,0) avec une poussée défavorable (1,35) : la résultante sort presque du
tiers central et la largeur efficace tombe à 1,03 m. Ce cas est le plus sévère de l'EN 1997-1 sans
principe de source unique (§2.4.2(9), note), alors que terres sur le talon et poussée viennent du
même remblai.

**Voile.** L'application calcule le voile avec δ = 0 (K = 0,301) ; Frilo prend δ = 2/3 φ' sur le
parement réel (K_agh = 0,251) et retranche le moment de la composante verticale E_av = 33,1 kN/m
excentrée de e/2 : 161,5 au lieu de 169,0 kN·m/m caractéristiques. Les bandes ajoutent encore
63,2 kN·m/m caractéristiques dans l'application contre 39,5 dans Frilo.

**Talon.** Frilo isole le talon avec le prisme de terre qu'il porte : la poussée sur l'écran
virtuel et la réaction du voile s'y équilibrent presque (+35,7 kN·m/m de calcul), les poussées des
bandes réduisent le moment négatif (+53,3), et le frottement sous la semelle, réparti comme la
pression, ajoute un bras de demi-épaisseur (+16,4). L'application traite le talon en console
chargée par le poids des terres et la réaction du sol seulement, avec une contrainte de calcul plus
excentrée. Les deux modèles s'accordent sur la charge des poids, 464,3 et 464,4 kN·m/m.

**Patin.** L'application est gouvernée par le cas des verticales à 1,0 (e = 1,21 m, 472 kPa au
bord) et néglige le frottement sous la base. Frilo retient pour la flexion une combinaison moins
excentrée (e = 0,57 m) et retranche le bras du frottement (10,0 kN·m/m). Remarque : la combinaison
que Frilo retient pour le tranchant (e = 1,12 m) donnerait elle-même 41,0 kN·m/m, au-delà des
36,75 retenus en flexion ; sans conséquence ici puisque l'armature minimale gouverne.

**Résistance à l'effort tranchant.** V_Rd,c du voile vaut 197,2 kN/m dans l'application contre
170,0 dans Frilo : l'annexe allemande prend C_Rd,c = 0,15/γ_c = 0,10 et k₁ = 0,12 au lieu des
valeurs recommandées 0,12 et 0,15. L'écart est réglementaire, non numérique.

## Vérifications propres à Frilo

Stabilité générale par Bishop (taux 0,82), tassement et rotation ne sont pas dans le périmètre de
l'outil. Le rapport Frilo affiche un tassement moyen de 17 mm dans le récapitulatif et de 1,738 mm
dans le détail du calcul : l'une des deux valeurs est à vérifier dans Frilo.

## Constat

La chaîne de calcul de l'outil est cohérente avec Frilo là où les hypothèses coïncident (poids,
moments stabilisants, poussée d'une bande au droit de l'écran, formule de portance). Les écarts
sont tous du côté de la sécurité et tiennent à quatre choix déclarés : δ = 0 sur le parement du
voile, diffusion uniforme des bandes éloignées, DA2 sur les actions sans principe de source unique,
talon et patin en console sans les efforts horizontaux du prisme ni le frottement de base.
