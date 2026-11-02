# Cas de référence du mur en L

Calcul fait hors du code, puis recopié en dur dans `tests/mur.test.ts`. Il n'a été comparé à aucun
logiciel ni à aucun exemple publié : c'est une vérification de la chaîne de calcul, pas une validation
externe. Toutes les valeurs sont par mètre de mur.

## Données

| Grandeur | Valeur |
| --- | --- |
| Voile | h = 3,00 m ; épaisseur 0,30 m |
| Semelle | épaisseur 0,40 m ; patin 0,70 m ; talon 1,60 m ; B = 2,60 m |
| Écran virtuel | H_t = 3,40 m |
| Béton armé | 25 kN/m³, C30/37, B500 |
| Remblai | γ = 18 kN/m³, φ'k = 30°, q = 10 kPa |
| Sol d'assise | γ = 19 kN/m³, φ'k = 30°, c' = 0, δk = φ'k, D = 0,80 m |
| Armatures | 1340,41 mm²/m (HA16 tous les 150 mm), axe à 50 mm du parement |

## Poids

- Voile : 25 × 0,30 × 3,00 = 22,5 kN, à x = 0,85 m de l'arête du patin.
- Semelle : 25 × 2,60 × 0,40 = 26,0 kN, à x = 1,30 m.
- Terres sur le talon : 18 × 1,60 × 3,00 = 86,4 kN, à x = 1,80 m.
- Surcharge sur le talon : 10 × 1,60 = 16,0 kN, à x = 1,80 m.

## Renversement, EQU

tan φ'd = tan 30° / 1,25, d'où Ka = 0,40913, P_G = ½ Ka γ H_t² = 42,566 kN et P_Q = Ka q H_t = 13,910 kN.

- M_dst,d = 1,10 × 42,566 × 3,40/3 + 1,50 × 13,910 × 3,40/2 = 88,537 kN·m
- M_stb,d = 0,90 × (22,5 × 0,85 + 26 × 1,30 + 86,4 × 1,80) = 187,600 kN·m
- Taux = 0,472

## Glissement

N_d = 134,9 kN (poids à 1,0 ; surcharge verticale favorable, prise à 0).

| Combinaison | Ka | H_d (kN) | μ_d | R_d (kN) | Taux |
| --- | --- | --- | --- | --- | --- |
| DA1-1 | 0,33333 | 63,818 | 0,57735 | 77,885 | 0,819 |
| DA1-2 | 0,40913 | 60,650 | 0,46188 | 62,308 | 0,973 |
| DA2 | 0,33333 | 63,818 | 0,52486 | 70,804 | 0,901 |
| DA3 | 0,40913 | 60,650 | 0,46188 | 62,308 | 0,973 |

## Portance, annexe D

Le cas le plus sévère n'a ni surcharge sur le talon ni majoration des verticales :

| Combinaison | V (kN) | M (kN·m) | e (m) | B' (m) | R_d (kN) | Taux |
| --- | --- | --- | --- | --- | --- | --- |
| DA1-1 | 134,9 | 48,885 | 0,362 | 1,875 | 243,83 | 0,553 |
| DA1-2 | 134,9 | 45,909 | 0,340 | 1,919 | 143,03 | 0,943 |
| DA2 | 134,9 | 48,885 | 0,362 | 1,875 | 174,16 | 0,775 |
| DA3 | 134,9 | 45,909 | 0,340 | 1,919 | 143,03 | 0,943 |

Détail DA1-1 : N_q = 18,401 ; N_γ = 20,093 ; 1 - H/V = 0,5269 ; i_q = 0,27765 ; i_γ = 0,14630 ;
q' = 19 × 0,80 = 15,2 kPa ; R/A' = 15,2 × 18,401 × 0,27765 + ½ × 19 × 1,875 × 20,093 × 0,14630 = 130,03 kPa.

## Sections, DA1-1

| Section | M_Ed (kN·m) | V_Ed (kN) | M_Rd, bloc rectangulaire (kN·m) | V_Rd,c (kN) | A_s,min (mm²/m) |
| --- | --- | --- | --- | --- | --- |
| Voile (N = 22,5 kN) | 58,950 | 51,450 | 139,9 | 146,28 | 376,5 |
| Patin | 20,631 | 57,534 | 195,5 | 166,41 | 527,1 |
| Talon | 48,261 | 49,224 | 195,5 | 166,41 | 527,1 |

Pour le talon, la flexion gouverne dans le cas « verticales inf » et le tranchant dans le cas
« verticales sup, surcharge sur le talon ». Le logiciel calcule M_Rd avec le diagramme de `section-uls`
(parabole-rectangle) ; les tests acceptent 2 % d'écart avec le bloc rectangulaire.

## 2e génération (EN 1997-1:2024, EN 1997-3:2025, EN 1990:2023, EN 1992-1-1:2023)

Même mur, CC2, valeurs recommandées (aucune annexe nationale belge disponible), dimensions non contrôlées
(B_d = B - 0,10 = 2,50 m pour la portance), facteur de profondeur non compté. Valeurs recopiées dans
`tests/mur2e.test.ts`, depuis un calcul écrit à part du code.

### Basculement et excentricité

VC2(a), φ'k : Ka = 1/3. M_dst,d = 81,960 kN·m. M_stb,d = 22,5 × 0,85 + 26 × 1,30 + 1,15 × 86,4 × 1,80
= 231,773 kN·m. Taux 0,354.

Tableau 5.3, valeurs caractéristiques, autour du milieu : e_G = 0,0462 m (0,107 de B/6) ;
e_G+Q = 0,1890 m (0,218 de B/3).

### Glissement et portance

| Combinaison | H_d (kN) | μ_d | Taux glissement | B' (m) | R_d (kN) | Taux portance |
| --- | --- | --- | --- | --- | --- | --- |
| (a) VC4 + M1 | 63,818 | 0,57735 | 0,819 | 1,7752 | 235,98 | 0,572 |
| (b) VC3 + M2 | 60,650 | 0,46188 | 0,973 | 1,8194 | 142,76 | 0,945 |
| (c) VC1 + M2 | 78,33 | 0,46188 | 1,257 | | | 2,31 |
| (d) VC1, résistances | 63,818 | 0,52486 | 0,901 | | | 0,800 |

La combinaison (c) refuse ce mur : ce n'est pas une erreur, elle cumule les actions de VC1 et les
matériaux de M2.

### Sections, combinaison (a)

| Section | V_Rd,c (kN) | A_s,min (mm²/m) | M_Rd, ± 2 % (kN·m) |
| --- | --- | --- | --- |
| Voile | 176,22 | 386,2 | 138,3 |
| Semelle | 208,51 | 490,4 | 194,0 |

## Charges en bande

L'EN 1997 ne donne aucune méthode pour une charge de largeur finie, dans aucune des deux générations :
seule la surcharge uniforme y figure. La méthode retenue est une diffusion usuelle, annoncée comme hors
Eurocode à l'écran et dans la note. Elle n'a été comparée à aucune source publiée.

Pour une bande de bord proche à la distance a de l'écran et de largeur b :

- pression K_a q uniforme entre z1 = a tan φ'd et z2 = (a + b) tan(45° + φ'd/2), bornée à la hauteur de l'écran ;
- φ'd et K_a sont ceux de la combinaison ;
- stabilité : écran virtuel au droit du talon. La part de la bande posée sur le talon pèse sur lui et ne
  pousse pas ; la part au-delà pousse et ne pèse pas ;
- voile : la bande entière se diffuse depuis le parement arrière, sur la hauteur h ;
- une bande G posée sur le talon pèse dans les quatre cas (au coefficient favorable ou défavorable) ; une
  bande Q seulement dans les cas « surcharge sur le talon ».

Contrôle : une bande de distance 0 et de largeur 1000 m redonne la surcharge uniforme de même intensité,
sur les deux générations.

Remblai sans surcharge uniforme, valeurs calculées à la main, combinaison (a) sauf mention :

| Bande | Grandeur | Calcul | Valeur |
| --- | --- | --- | --- |
| Q 20 kPa, à 2,6 m, large de 1 m | H_d | 1,35 × 34,68 + 1,5 × 20/3 × (3,4 - 0,57735) | 75,045 kN |
| idem | M_Ed voile | 1,35 × 27 + 1,5 × 20/3 × 1,49889 × (3 - 2,25056) | 47,682 kN·m |
| idem, (b) | H_d | 42,566 + 1,3 × 0,40913 × 20 × 2,6649 | 70,914 kN |
| G 10 kPa, à 0,4 m, large de 0,8 m | N_d | 134,9 + 8 | 142,9 kN |
| G 10 kPa, à 1,1 m, large de 1 m | N_d | 134,9 + 10 × 0,5 | 139,9 kN |
| idem | H_d | 1,35 × (34,68 + 10/3 × 0,5 × tan 60°) | 50,715 kN |
