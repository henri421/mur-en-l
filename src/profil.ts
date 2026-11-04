/**
 * Coefficients partiels du mur en L : jeux A, M et R de l'EN 1997-1:2004,
 * annexe A, et leur assemblage en approches de calcul (§2.4.7.3.4).
 *
 * Valeurs RECOMMANDEES, que l'annexe nationale peut modifier. Chaque valeur
 * porte sa source ; une valeur sans source bloque le calcul.
 *
 * Grandeurs sans dimension.
 */

import type { ValeurSourcee } from 'equilibre-statique';

export type { ValeurSourcee };

/** Jeu d'actions : permanentes et variable, defavorables et favorables. */
export interface JeuActions {
  gG_dst: ValeurSourcee;
  gG_stb: ValeurSourcee;
  gQ_dst: ValeurSourcee;
  /** Une action variable favorable n'est pas prise : 0. */
  gQ_stb: ValeurSourcee;
}

/** Jeu de materiaux : tan phi' et c' sont divises par ces coefficients. */
export interface JeuSol {
  gPhi: ValeurSourcee;
  gC: ValeurSourcee;
}

/** Jeu de resistances de la fondation superficielle (tableau A.5). */
export interface JeuResistance {
  gRv: ValeurSourcee;
  gRh: ValeurSourcee;
}

/** Coefficients du beton arme, EN 1992-1-1:2004. */
export interface JeuBeton {
  /** gamma_C et gamma_S, tableau 2.1N. */
  gC: ValeurSourcee;
  gS: ValeurSourcee;
  /** alpha_cc, §3.1.6(1)P. */
  alphaCc: ValeurSourcee;
  /** Numerateur de C_Rd,c = c_Rd,c / gamma_C et k_1, §6.2.2(1). */
  cRdc: ValeurSourcee;
  k1: ValeurSourcee;
}

export interface ProfilMur {
  nom: string;
  date: string;
  /** Renversement : tableaux A.1 et A.2. */
  EQU: { actions: JeuActions; sol: JeuSol };
  A1: JeuActions;
  A2: JeuActions;
  M1: JeuSol;
  M2: JeuSol;
  R1: JeuResistance;
  R2: JeuResistance;
  R3: JeuResistance;
  beton: JeuBeton;
}

/**
 * DA2* : DA2 dont les coefficients portent sur les effets. Excentricite, largeur
 * efficace et inclinaison de la portance viennent des actions caracteristiques,
 * seul l'effort normal est majore : coefficients sur les effets, EN 1997-1
 * §2.4.7.3.2, eq. 2.6b, comme le fait la DIN 1054:2010.
 */
export type Approche = 'DA1' | 'DA2' | 'DA2*' | 'DA3';

/** Une combinaison a verifier, coefficients resolus. */
export interface Combinaison {
  nom: string;
  /** Terres et surcharge du remblai, transmises par le sol. */
  geotechnique: JeuActions;
  /** Poids du beton. Differe du precedent en DA3 seulement. */
  structure: JeuActions;
  sol: JeuSol;
  resistance: JeuResistance;
  /** DA2* : portance avec excentricite et inclinaison caracteristiques. */
  effetsCaracteristiques?: boolean;
  /**
   * Jeu des actions geotechniques : A1 (ou VC1, VC4 en 2e generation) ou A2 (VC3).
   * Il choisit le gamma_Q saisi pour une action variable. A1 si absent.
   */
  jeu?: 'A1' | 'A2';
}

function actions(source: string, gG_dst: number, gG_stb: number, gQ_dst: number): JeuActions {
  return {
    gG_dst: { valeur: gG_dst, source },
    gG_stb: { valeur: gG_stb, source },
    gQ_dst: { valeur: gQ_dst, source },
    gQ_stb: { valeur: 0, source: `${source} (action variable favorable : 0)` },
  };
}

function sol(source: string, gPhi: number, gC: number): JeuSol {
  return { gPhi: { valeur: gPhi, source }, gC: { valeur: gC, source } };
}

function resistance(source: string, gRv: number, gRh: number): JeuResistance {
  return { gRv: { valeur: gRv, source }, gRh: { valeur: gRh, source } };
}

export function profilRecommande(): ProfilMur {
  const tA3 = 'EN 1997-1:2004, tableau A.3, valeur recommandée';
  const tA4 = 'EN 1997-1:2004, tableau A.4, valeur recommandée';
  const tA5 = 'EN 1997-1:2004, tableau A.5, valeur recommandée';
  return {
    nom: 'EN 1997-1:2004, valeurs recommandées',
    date: '2026-11-01',
    EQU: {
      actions: actions('EN 1997-1:2004, tableau A.1, valeur recommandée', 1.1, 0.9, 1.5),
      sol: sol('EN 1997-1:2004, tableau A.2, valeur recommandée', 1.25, 1.25),
    },
    A1: actions(`${tA3}, jeu A1`, 1.35, 1.0, 1.5),
    A2: actions(`${tA3}, jeu A2`, 1.0, 1.0, 1.3),
    M1: sol(`${tA4}, jeu M1`, 1.0, 1.0),
    M2: sol(`${tA4}, jeu M2`, 1.25, 1.25),
    R1: resistance(`${tA5}, jeu R1`, 1.0, 1.0),
    R2: resistance(`${tA5}, jeu R2`, 1.4, 1.1),
    R3: resistance(`${tA5}, jeu R3`, 1.0, 1.0),
    beton: {
      gC: { valeur: 1.5, source: 'EN 1992-1-1:2004, tableau 2.1N, valeur recommandée' },
      gS: { valeur: 1.15, source: 'EN 1992-1-1:2004, tableau 2.1N, valeur recommandée' },
      alphaCc: { valeur: 1.0, source: 'EN 1992-1-1:2004, §3.1.6(1)P, valeur recommandée' },
      cRdc: { valeur: 0.18, source: 'EN 1992-1-1:2004, §6.2.2(1), valeur recommandée de C_Rd,c × γ_C' },
      k1: { valeur: 0.15, source: 'EN 1992-1-1:2004, §6.2.2(1), valeur recommandée' },
    },
  };
}

/** Leve en nommant la premiere valeur non numerique ou sans source. */
export function verifierProfil(p: ProfilMur): void {
  const jeux: [string, object][] = [
    ['EQU actions', p.EQU.actions], ['EQU sol', p.EQU.sol],
    ['A1', p.A1], ['A2', p.A2], ['M1', p.M1], ['M2', p.M2], ['R1', p.R1], ['R2', p.R2], ['R3', p.R3],
    ['béton', p.beton],
  ];
  for (const [nom, j] of jeux) {
    for (const [cle, v] of Object.entries(j) as [string, ValeurSourcee][]) {
      if (!Number.isFinite(v.valeur) || v.valeur < 0) throw new Error(`Profil : ${cle} (${nom}) n'est pas un nombre positif.`);
      if (v.source.trim() === '') throw new Error(`Profil : ${cle} (${nom}) n'a pas de source ; une valeur sans provenance bloque le calcul.`);
    }
  }
}

/**
 * Les combinaisons d'une approche, EN 1997-1 §2.4.7.3.4.
 *
 * DA3 : A1 sur les actions de structure (poids du beton) et A2 sur les actions
 * geotechniques (terres, et surcharge du remblai, qui agit a travers le sol).
 */
export function combinaisons(approche: Approche, p: ProfilMur): Combinaison[] {
  if (approche === 'DA1') {
    return [
      { nom: 'DA1-1', geotechnique: p.A1, structure: p.A1, sol: p.M1, resistance: p.R1 },
      { nom: 'DA1-2', geotechnique: p.A2, structure: p.A2, sol: p.M2, resistance: p.R1, jeu: 'A2' },
    ];
  }
  if (approche === 'DA2') return [{ nom: 'DA2', geotechnique: p.A1, structure: p.A1, sol: p.M1, resistance: p.R2 }];
  if (approche === 'DA2*') {
    return [{ nom: 'DA2*', geotechnique: p.A1, structure: p.A1, sol: p.M1, resistance: p.R2, effetsCaracteristiques: true }];
  }
  return [{ nom: 'DA3', geotechnique: p.A2, structure: p.A1, sol: p.M2, resistance: p.R3, jeu: 'A2' }];
}
