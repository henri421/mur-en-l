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
