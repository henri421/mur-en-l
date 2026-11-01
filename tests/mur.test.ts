import { describe, it, expect } from 'vitest';
import { kaRankine, phiCalcul, portanceDrainee } from '../src/sol';
import { combinaisons, profilRecommande, verifierProfil } from '../src/profil';
import { contrainteSol, verifierMur, type DonneesMur } from '../src/mur';

const profil = profilRecommande();

/**
 * Cas de reference de docs/validation/cas-reference.md. Les valeurs attendues
 * viennent d'un calcul independant du code, ecrit en dur ici.
 */
function mur(approche: DonneesMur['approche'] = 'DA1'): DonneesMur {
  return {
    geometrie: { h: 3.0, eHaut: 0.3, eBas: 0.3, es: 0.4, patin: 0.7, talon: 1.6 },
    gammaBeton: 25,
    remblai: { gamma: 18, phi: 30, q: 10 },
    fondation: { phi: 30, deltaSurPhi: 1, portance: { mode: 'annexeD', phi: 30, c: 0, gamma: 19, D: 0.8 } },
    armatures: { fck: 30, fyk: 500, a: 50, voileArriere: 1340.41, voileAvant: 0, semelleHaut: 1340.41, semelleBas: 1340.41 },
    approche,
  };
}

function combinaison(approche: DonneesMur['approche'], nom: string) {
  const r = verifierMur(mur(approche), profil).combinaisons.find((c) => c.nom === nom);
  if (!r) throw new Error(`combinaison ${nom} absente`);
  return r;
}

describe('sol', () => {
  it('K_a de Rankine, phi = 30 : 1/3', () => {
    expect(kaRankine(phiCalcul(30, 1))).toBeCloseTo(1 / 3, 10);
  });

  it('phi_d divise la tangente : 30 degres et 1,25 donnent K_a = 0,40913', () => {
    expect(kaRankine(phiCalcul(30, 1.25))).toBeCloseTo(0.40913, 5);
  });

  it('annexe D : N_q, N_gamma et facteurs a phi = 30, charge inclinee', () => {
    const r = portanceDrainee({ Bp: 1.87523, V: 134.9, H: 63.818, phi: phiCalcul(30, 1), c: 0, gamma: 19, q: 15.2 });
    expect(r.Nq).toBeCloseTo(18.4011, 3);
    expect(r.Ngamma).toBeCloseTo(20.0931, 3);
    expect(r.iq).toBeCloseTo(0.27765, 4);
    expect(r.igamma).toBeCloseTo(0.1463, 4);
    expect(r.q_u).toBeCloseTo(130.0258, 2);
  });

  it('annexe D avec cohesion : N_c = 30,14 et terme de cohesion', () => {
    const phi = phiCalcul(30, 1);
    const r = portanceDrainee({ Bp: 2, V: 100, H: 0, phi, c: 10, gamma: 19, q: 0 });
    expect(r.Nc).toBeCloseTo(30.14, 2);
    expect(r.ic).toBeCloseTo(1, 10);
    expect(r.q_u).toBeCloseTo(10 * r.Nc + 0.5 * 19 * 2 * r.Ngamma, 8);
  });

  it('un effort horizontal excessif annule les facteurs d inclinaison', () => {
    const r = portanceDrainee({ Bp: 2, V: 100, H: 200, phi: phiCalcul(30, 1), c: 0, gamma: 19, q: 15 });
    expect(r.iq).toBe(0);
    expect(r.q_u).toBe(0);
  });

  it('refuse un angle nul : le non draine n est pas dans ce module', () => {
    expect(() => phiCalcul(0, 1)).toThrow(/frottement/);
  });
});

describe('profil', () => {
  it('une valeur sans source bloque', () => {
    const p = profilRecommande();
    p.R2.gRv.source = ' ';
    expect(() => verifierProfil(p)).toThrow(/source/);
  });

  it('DA1 a deux combinaisons, DA2 et DA3 une', () => {
    expect(combinaisons('DA1', profil).map((c) => c.nom)).toEqual(['DA1-1', 'DA1-2']);
    expect(combinaisons('DA2', profil).map((c) => c.nom)).toEqual(['DA2']);
    expect(combinaisons('DA3', profil).map((c) => c.nom)).toEqual(['DA3']);
  });
});

describe('Cas de reference : poids et renversement', () => {
  const r = verifierMur(mur(), profil);

  it('poids et geometrie', () => {
    expect(r.B).toBeCloseTo(2.6, 10);
    expect(r.Ht).toBeCloseTo(3.4, 10);
    expect(r.poids.voile).toBeCloseTo(22.5, 8);
    expect(r.poids.semelle).toBeCloseTo(26, 8);
    expect(r.poids.terresTalon).toBeCloseTo(86.4, 8);
    expect(r.poids.surchargeTalon).toBeCloseTo(16, 8);
  });

  it('EQU : K_a a phi_d, 1,10 / 0,90 / 1,50, surcharge verticale ignoree', () => {
    expect(r.renversement.Ka).toBeCloseTo(0.40913, 5);
    expect(r.renversement.poussee.P_G).toBeCloseTo(42.566, 3);
    expect(r.renversement.poussee.P_Q).toBeCloseTo(13.9105, 3);
    expect(r.renversement.pivot.M_dst_d).toBeCloseTo(88.5374, 3);
    expect(r.renversement.pivot.M_stb_d).toBeCloseTo(187.6005, 3);
    expect(r.renversement.taux).toBeCloseTo(0.47195, 4);
  });
});

describe('Cas de reference : glissement', () => {
  for (const [approche, nom, Hd, Rd, taux] of [
    ['DA1', 'DA1-1', 63.818, 77.8846, 0.81939],
    ['DA1', 'DA1-2', 60.6497, 62.3076, 0.97339],
    ['DA2', 'DA2', 63.818, 70.8041, 0.90133],
    ['DA3', 'DA3', 60.6497, 62.3076, 0.97339],
  ] as const) {
    it(`${nom} : H_d, R_d et taux`, () => {
      const g = combinaison(approche, nom).glissement;
      expect(g.H_d).toBeCloseTo(Hd, 3);
      expect(g.N_d).toBeCloseTo(134.9, 6);
      expect(g.R_d).toBeCloseTo(Rd, 3);
      expect(g.taux).toBeCloseTo(taux, 4);
    });
  }
});

describe('Cas de reference : portance annexe D', () => {
  it('DA1-1 : les quatre cas', () => {
    const c = combinaison('DA1', 'DA1-1').cas;
    const attendus = [
      [206.115, 25.3091, 0.12279, 2.35442, 662.0389, 0.31133],
      [182.115, 37.3091, 0.20487, 2.19027, 509.4741, 0.35746],
      [158.9, 36.8854, 0.23213, 2.13574, 400.4354, 0.39682],
      [134.9, 48.8854, 0.36238, 1.87523, 243.829, 0.55326],
    ];
    attendus.forEach(([V, M, e, Bp, R, t], i) => {
      expect(c[i].V).toBeCloseTo(V, 3);
      expect(c[i].M).toBeCloseTo(M, 3);
      expect(c[i].e).toBeCloseTo(e, 4);
      expect(c[i].Bp).toBeCloseTo(Bp, 4);
      expect(c[i].R_d).toBeCloseTo(R, 2);
      expect(c[i].taux).toBeCloseTo(t, 4);
    });
  });

  for (const [approche, nom, t] of [
    ['DA1', 'DA1-1', 0.55326],
    ['DA1', 'DA1-2', 0.94315],
    ['DA2', 'DA2', 0.77456],
    ['DA3', 'DA3', 0.94315],
  ] as const) {
    it(`${nom} : cas gouvernant sans surcharge sur le talon`, () => {
      const p = combinaison(approche, nom).portance;
      expect(p.taux).toBeCloseTo(t, 4);
      expect(p.surchargeSurTalon).toBe(false);
    });
  }

  it('DA3 : le beton suit A1, les terres A2', () => {
    const c = combinaison('DA3', 'DA3').cas[0];
    // 1,35 x 48,5 + 1,0 x 86,4 + 1,3 x 16
    expect(c.V).toBeCloseTo(172.675, 3);
    expect(c.taux).toBeCloseTo(0.69752, 4);
  });

  it('q_Rd saisi : R_d = q_Rd B\', sans gamma_Rv supplementaire', () => {
    const d = mur('DA2');
    d.fondation.portance = { mode: 'saisie', qRd: 200 };
    const c = verifierMur(d, profil).combinaisons[0].cas[3];
    expect(c.sol).toBeNull();
    expect(c.R_d).toBeCloseTo(200 * 1.87523, 2);
    expect(c.taux).toBeCloseTo(134.9 / (200 * 1.87523), 4);
  });
});

describe('Cas de reference : efforts dans les sections', () => {
  it('voile DA1-1 : M_Ed et V_Ed au pied', () => {
    const v = combinaison('DA1', 'DA1-1').voile;
    expect(v.M_Ed).toBeCloseTo(58.95, 3);
    expect(v.V_Ed).toBeCloseTo(51.45, 3);
    expect(v.faceTendue).toBe('arriere');
  });

  it('voile DA1-2 : A2 avec M2', () => {
    const v = combinaison('DA1', 'DA1-2').voile;
    expect(v.M_Ed).toBeCloseTo(57.0738, 3);
    expect(v.V_Ed).toBeCloseTo(49.0958, 3);
  });

  it('patin DA1-1 : le cas gouvernant est verticales sup, surcharge sur le talon', () => {
    const p = combinaison('DA1', 'DA1-1').patin;
    expect(p.M_Ed).toBeCloseTo(20.6307, 3);
    expect(p.V_Ed).toBeCloseTo(57.5336, 3);
    expect(p.faceTendue).toBe('bas');
  });

  it('talon DA1-1 : flexion et tranchant gouvernent dans des cas differents', () => {
    const t = combinaison('DA1', 'DA1-1').talon;
    expect(t.M_Ed).toBeCloseTo(48.2611, 3);
    expect(t.casFlexion).toBe('DA1-1, verticales inf');
    expect(t.V_Ed).toBeCloseTo(49.2238, 3);
    expect(t.casTranchant).toBe('DA1-1, verticales sup, surcharge sur le talon');
    expect(t.faceTendue).toBe('haut');
  });

  it('resistances : bloc rectangulaire a 2 % pres, V_Rd,c exact', () => {
    const c = combinaison('DA1', 'DA1-1');
    expect(Math.abs(c.voile.M_Rd - 139.913) / 139.913).toBeLessThan(0.02);
    expect(c.voile.V_Rd_c).toBeCloseTo(146.275, 1);
    expect(Math.abs(c.talon.M_Rd - 195.485) / 195.485).toBeLessThan(0.02);
    expect(c.talon.V_Rd_c).toBeCloseTo(166.413, 1);
  });

  it('armature minimale, eq. 9.1N', () => {
    const c = combinaison('DA1', 'DA1-1');
    expect(c.voile.As_min).toBeCloseTo(376.5, 0);
    expect(c.talon.As_min).toBeCloseTo(527.1, 0);
  });

  it('sans armature tendue : taux infini, pas de resistance inventee', () => {
    const d = mur();
    d.armatures.voileArriere = 0;
    const r = verifierMur(d, profil);
    expect(r.combinaisons[0].voile.tauxFlexion).toBe(Infinity);
    expect(r.verdict).toBe('non-conforme');
  });
});

describe('Contrainte sous la base', () => {
  it('trapeze dans le noyau central : l integrale vaut V', () => {
    const p = contrainteSol(100, 0.2, 3);
    expect(p(0)).toBeCloseTo((100 / 3) * 1.4, 8);
    expect(p(3)).toBeCloseTo((100 / 3) * 0.6, 8);
  });

  it('triangle hors noyau, vers le patin : p_max = 2V/(3c), nulle au-dela', () => {
    const p = contrainteSol(100, 0.8, 3);
    const c = 1.5 - 0.8;
    expect(p(0)).toBeCloseTo((2 * 100) / (3 * c), 8);
    expect(p(3 * c + 0.01)).toBe(0);
  });

  it('triangle hors noyau, vers le talon : symetrique', () => {
    const p = contrainteSol(100, -0.8, 3);
    expect(p(3)).toBeCloseTo((2 * 100) / (3 * 0.7), 8);
    expect(p(0)).toBe(0);
  });
});

describe('Verdict et bords', () => {
  it('cas de reference en DA1 : conforme, gouverne par le glissement DA1-2', () => {
    const r = verifierMur(mur(), profil);
    expect(r.verdict).toBe('conforme');
    expect(r.motif).toContain('0,973');
    expect(r.motif).toContain('glissement, DA1-2');
    expect(r.tauxExterne).toBeCloseTo(0.97339, 4);
  });

  it('excentricite caracteristique dans le noyau central', () => {
    const r = verifierMur(mur(), profil);
    // A la main, autour du milieu : 22,5 x 0,45 - 86,4 x 0,5 - 16 x 0,5
    // + 34,68 x 3,4/3 + 11,333 x 1,7 = 17,496 ; N = 150,9.
    expect(r.excentricite.e).toBeCloseTo(0.11594, 3);
    expect(r.excentricite.limite).toBeCloseTo(2.6 / 3, 8);
    expect(r.excentricite.noyauCentral).toBe(true);
  });

  it('voile a fruit : poids et bras de levier', () => {
    const d = mur();
    d.geometrie.eHaut = 0.2;
    const r = verifierMur(d, profil);
    expect(r.poids.voile).toBeCloseTo(25 * 0.25 * 3, 8);
    // Rect 15 kN a x = 0,9 ; triangle 3,75 kN a x = 0,7 + 2/3 x 0,1. Surcharge
    // stabilisante mais de coefficient nul : M_stb,d ne compte que les poids.
    const stb = r.renversement.pivot.M_stb_d;
    expect(stb).toBeCloseTo(0.9 * (15 * 0.9 + 3.75 * (0.7 + 0.2 / 3) + 26 * 1.3 + 86.4 * 1.8), 6);
  });

  it('mur trop court : la resultante sort de la base, refus nomme', () => {
    const d = mur('DA2');
    d.geometrie.talon = 0.05;
    d.geometrie.patin = 0;
    d.remblai.q = 200;
    expect(() => verifierMur(d, profil)).toThrow(/résultante/);
  });

  for (const [champ, modif] of [
    ['hauteur', (d: DonneesMur) => { d.geometrie.h = 0; }],
    ['base du voile', (d: DonneesMur) => { d.geometrie.eBas = 0.1; }],
    ['talon', (d: DonneesMur) => { d.geometrie.talon = -1; }],
    ['poids du remblai', (d: DonneesMur) => { d.remblai.gamma = NaN; }],
    ['qRd', (d: DonneesMur) => { d.fondation.portance = { mode: 'saisie', qRd: 0 }; }],
  ] as const) {
    it(`refuse une saisie invalide : ${champ}`, () => {
      const d = mur();
      modif(d);
      expect(() => verifierMur(d, profil)).toThrow();
    });
  }
});
