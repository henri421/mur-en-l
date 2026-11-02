/**
 * Coefficients partiels du mur en L en 2e generation : cas de verification de
 * l'EN 1990:2023 (tableaux A.1.8 et A.1.9), jeux M1 et M2 de l'EN 1997-1:2024
 * (tableaux 4.8 a 4.10), combinaisons du mur poids de l'EN 1997-3:2025
 * (tableau 7.2).
 *
 * Valeurs RECOMMANDEES, que l'annexe nationale peut modifier. Chaque valeur
 * porte sa source ; une valeur sans source bloque le calcul.
 *
 * Grandeurs sans dimension.
 *
 * Dans ce modele lineaire, VC1 et VC4 donnent les memes nombres : 1,35 kF sur la
 * poussee, sur l'action comme sur son effet, et 1,5 kF sur la surcharge
 * (gamma_Q,red x gamma_E). La combinaison (e) du tableau 7.2 se confond donc avec
 * (d), et n'est pas proposee.
 */

import type { ValeurSourcee } from 'equilibre-statique';
import type { Combinaison, JeuActions, JeuResistance, JeuSol } from './profil';

export type Approche2e = 'a+b' | 'c' | 'd';
export type ClasseConsequences = 'CC1' | 'CC2' | 'CC3';

export interface Profil2e {
  nom: string;
  date: string;
  kF: Record<ClasseConsequences, ValeurSourcee>;
  kM: Record<ClasseConsequences, ValeurSourcee>;
  kR: Record<ClasseConsequences, ValeurSourcee>;
  /** VC1 et VC4 : gamma_G (ou gamma_E) et gamma_Q, avant k_F. */
  gG: ValeurSourcee;
  gQ: ValeurSourcee;
  gG_fav: ValeurSourcee;
  /** VC2(a) : partie stabilisatrice d'une action de source unique. */
  gG_stb_VC2a: ValeurSourcee;
  /** VC3 : sans k_F. */
  gG_VC3: ValeurSourcee;
  gQ_VC3: ValeurSourcee;
  /** Jeu M2 sur tan phi', c' et tan delta, avant k_M. */
  gM2: ValeurSourcee;
  gRN: ValeurSourcee;
  gRT: ValeurSourcee;
}

const SOURCE_90 = 'EN 1990:2023, tableau A.1.8, valeur recommandée';
const SOURCE_97_3 = 'EN 1997-3:2025, tableau 7.2, valeur recommandée';

function parClasse(source: string, cc1: number, cc2: number, cc3: number): Record<ClasseConsequences, ValeurSourcee> {
  return { CC1: { valeur: cc1, source }, CC2: { valeur: cc2, source }, CC3: { valeur: cc3, source } };
}

export function profil2eRecommande(): Profil2e {
  const v = (valeur: number, source: string): ValeurSourcee => ({ valeur, source });
  return {
    nom: 'EN 1990:2023 et EN 1997:2024-2025, valeurs recommandées',
    date: '2026-11-02',
    kF: parClasse('EN 1990:2023, tableau A.1.9, valeur recommandée', 0.9, 1.0, 1.1),
    kM: parClasse('EN 1997-1:2024, tableau 4.9, valeur recommandée', 0.9, 1.0, 1.1),
    kR: parClasse('EN 1997-1:2024, tableau 4.10, valeur recommandée', 0.9, 1.0, 1.1),
    gG: v(1.35, SOURCE_90),
    gQ: v(1.5, SOURCE_90),
    gG_fav: v(1.0, SOURCE_90),
    gG_stb_VC2a: v(1.15, SOURCE_90),
    gG_VC3: v(1.0, SOURCE_90),
    gQ_VC3: v(1.3, SOURCE_90),
    gM2: v(1.25, 'EN 1997-1:2024, tableau 4.8, valeur recommandée, jeu M2'),
    gRN: v(1.4, SOURCE_97_3),
    gRT: v(1.1, SOURCE_97_3),
  };
}

/** Leve en nommant la premiere valeur non numerique ou sans source. */
export function verifierProfil2e(p: Profil2e): void {
  const valeurs: [string, ValeurSourcee][] = [];
  for (const [cle, x] of Object.entries(p)) {
    if (cle === 'nom' || cle === 'date') continue;
    if (cle === 'kF' || cle === 'kM' || cle === 'kR') {
      for (const [cc, y] of Object.entries(x as Record<string, ValeurSourcee>)) valeurs.push([`${cle} ${cc}`, y]);
    } else valeurs.push([cle, x as ValeurSourcee]);
  }
  for (const [nom, v] of valeurs) {
    if (!Number.isFinite(v.valeur) || v.valeur < 0) throw new Error(`Profil : ${nom} n'est pas un nombre positif.`);
    if (v.source.trim() === '') throw new Error(`Profil : ${nom} n'a pas de source ; une valeur sans provenance bloque le calcul.`);
  }
}

function fois(v: ValeurSourcee, k: ValeurSourcee): ValeurSourcee {
  return { valeur: v.valeur * k.valeur, source: `${v.source} × facteur de conséquence, ${k.source}` };
}

function actions(gG: ValeurSourcee, gG_fav: ValeurSourcee, gQ: ValeurSourcee): JeuActions {
  return {
    gG_dst: gG,
    gG_stb: gG_fav,
    gQ_dst: gQ,
    gQ_stb: { valeur: 0, source: `${gQ.source} (action variable favorable : 0)` },
  };
}

/**
 * Les combinaisons du tableau 7.2, pour le glissement et la portance d'un mur
 * poids. La combinaison (c) omet k_M sur les materiaux : note d du tableau 5.2,
 * vers lequel 7.6.4 et 7.6.5 renvoient. Le tableau 7.2 ne porte pas k_R sur 1,4 et
 * 1,1 : il est applique ici d'apres 4.4.1.5, NOTE 2 de l'EN 1997-1:2024.
 */
export function combinaisons2e(approche: Approche2e, cc: ClasseConsequences, p: Profil2e): Combinaison[] {
  const kF = p.kF[cc];
  const vc1 = actions(fois(p.gG, kF), p.gG_fav, fois(p.gQ, kF));
  const vc3 = actions(p.gG_VC3, p.gG_fav, p.gQ_VC3);
  const un: ValeurSourcee = { valeur: 1, source: 'EN 1997-1:2024, tableau 4.8, jeu M1' };
  const sansR: JeuResistance = {
    gRv: { valeur: 1, source: 'EN 1997-3:2025, tableau 7.2, sans coefficient' },
    gRh: { valeur: 1, source: 'EN 1997-3:2025, tableau 7.2, sans coefficient' },
  };
  const m1: JeuSol = { gPhi: un, gC: un };
  const m2k = fois(p.gM2, p.kM[cc]);
  const m2: JeuSol = { gPhi: m2k, gC: m2k };
  if (approche === 'a+b') {
    return [
      { nom: '(a) VC4 + M1', geotechnique: vc1, structure: vc1, sol: m1, resistance: sansR },
      { nom: '(b) VC3 + M2', geotechnique: vc3, structure: vc3, sol: m2, resistance: sansR },
    ];
  }
  if (approche === 'c') {
    return [{ nom: '(c) VC1 + M2', geotechnique: vc1, structure: vc1, sol: { gPhi: p.gM2, gC: p.gM2 }, resistance: sansR }];
  }
  const kR = p.kR[cc];
  return [{ nom: '(d) VC1, résistances', geotechnique: vc1, structure: vc1, sol: m1, resistance: { gRv: fois(p.gRN, kR), gRh: fois(p.gRT, kR) } }];
}
