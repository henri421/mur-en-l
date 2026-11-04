import { describe, it, expect } from 'vitest';
import { kaCoulomb, kaRankine, phiCalcul, portanceDrainee } from '../src/sol';
import { combinaisons, profilRecommande, verifierProfil } from '../src/profil';
import { contrainteSol, verifierMur, type DonneesMur } from '../src/mur';
import { deriverProfil } from '../src/coefficients';

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

describe('DA2* : portance avec les effets caracteristiques', () => {
  // Calcul a la main : H_k = 34,68 + 11,333 = 46,013 kN ; M_k = 25,496 kN.m ; e = 0,18900 m ;
  // B' = 2,22201 m ; 1 - H/V = 0,65891 ; R_d = 385,31 kN ; V_d = 1,35 x 134,9 = 182,115 kN.
  const r = verifierMur(mur('DA2*'), profil).combinaisons[0];

  it('une seule combinaison, nommee DA2*', () => {
    expect(verifierMur(mur('DA2*'), profil).combinaisons.map((c) => c.nom)).toEqual(['DA2*']);
  });

  it('e, B\' et R_d viennent des actions caracteristiques', () => {
    const c = r.cas.find((x) => x.nom === 'DA2*, verticales sup');
    expect(c?.caracteristique?.e).toBeCloseTo(0.189, 4);
    expect(c?.Bp).toBeCloseTo(2.22201, 4);
    expect(c?.R_d).toBeCloseTo(385.31, 1);
    expect(c?.V).toBeCloseTo(182.115, 3);
  });

  it('le cas gouvernant est celui des verticales majorees : taux 0,4726', () => {
    expect(r.portance.nom).toBe('DA2*, verticales sup');
    expect(r.portance.taux).toBeCloseTo(0.4726, 3);
  });

  it('glissement identique a DA2', () => {
    expect(r.glissement.taux).toBeCloseTo(0.901, 3);
  });
});

describe('principe de source unique', () => {
  it('DA2, verticales inf : terres a 1,35 avec la poussee, taux 0,5226 au lieu de 0,775', () => {
    // V = 48,5 + 1,35 x 86,4 = 165,14 kN ; M = 33,765 kN.m ; e = 0,20447 m ; R_d = 315,97 kN.
    const sans = verifierMur(mur('DA2'), profil).combinaisons[0];
    const avec = verifierMur({ ...mur('DA2'), sourceUnique: true }, profil).combinaisons[0];
    const cas = avec.cas.find((x) => x.nom === 'DA2, verticales inf');
    expect(cas?.V).toBeCloseTo(165.14, 2);
    expect(cas?.R_d).toBeCloseTo(315.97, 1);
    expect(avec.portance.taux).toBeCloseTo(0.5226, 3);
    expect(sans.portance.taux).toBeCloseTo(0.775, 3);
  });

  it('ne touche ni le glissement ni le renversement', () => {
    const sans = verifierMur(mur('DA2'), profil);
    const avec = verifierMur({ ...mur('DA2'), sourceUnique: true }, profil);
    expect(avec.combinaisons[0].glissement.taux).toBeCloseTo(sans.combinaisons[0].glissement.taux, 10);
    expect(avec.renversement.taux).toBeCloseTo(sans.renversement.taux, 10);
  });
});

describe('profil modifie par l utilisateur', () => {
  it('gamma_Rv = 1,0 : R_d de portance DA2 multiplie par 1,4', () => {
    const p = deriverProfil(profil, { 'R2.gRv': 1.0 });
    expect(verifierMur(mur('DA2'), p).combinaisons[0].portance.R_d).toBeCloseTo(174.16 * 1.4, 0);
  });

  it('gamma_phi = 1,0 en EQU : K_a = 1/3 dans le renversement', () => {
    const p = deriverProfil(profil, { 'EQU.sol.gPhi': 1.0 });
    expect(verifierMur(mur(), p).renversement.Ka).toBeCloseTo(1 / 3, 10);
  });

  it('C_Rd,c = 0,15 / gamma_C et k_1 = 0,12 : V_Rd,c du voile 127,21 kN au lieu de 146,28', () => {
    // k = 1,8944 ; (100 rho f_ck)^(1/3) = 2,5236 ; v_min = 0,49985 MPa gouverne ; sigma_cp = 0,075 MPa.
    const p = deriverProfil(profil, { 'beton.cRdc': 0.15, 'beton.k1': 0.12 });
    expect(verifierMur(mur(), p).combinaisons[0].voile.V_Rd_c).toBeCloseTo(127.21, 1);
    expect(verifierMur(mur(), profil).combinaisons[0].voile.V_Rd_c).toBeCloseTo(146.28, 1);
  });
});

describe('delta sur le parement, bloc du talon, frottement de base (DA1-1)', () => {
  // Calcul a part : K_ah(30, 20) = 0,279384 ; voile G 1,35 x 0,279384 x 18 x 9 / 2 = 30,551 kN a 1,0 m,
  // Q 1,5 x 0,279384 x 10 x 3 = 12,572 kN a 1,5 m ; E_av = 43,123 x tan 20 = 15,695 kN.
  const avec = (x: Partial<DonneesMur>, delta = 0) => {
    const m = mur('DA1');
    return verifierMur({ ...m, ...x, remblai: { ...m.remblai, deltaParement: delta } }, profil).combinaisons[0];
  };

  it('Coulomb, phi = 30, delta = 20 : K_a = 0,297314, K_ah = 0,279384', () => {
    const k = kaCoulomb(phiCalcul(30, 1), phiCalcul(20, 1));
    expect(k.Ka).toBeCloseTo(0.297314, 5);
    expect(k.Kah).toBeCloseTo(0.279384, 5);
  });

  it('delta = 2/3 phi : V_Ed = 43,123 kN, M_Ed = 47,055 kN.m, N compte E_av', () => {
    const c = avec({}, 2 / 3);
    expect(c.voile.V_Ed).toBeCloseTo(43.123, 2);
    expect(c.voile.M_Ed).toBeCloseTo(47.055, 2);
    expect(c.talon.M_Ed).toBeCloseTo(48.261, 2);
  });

  it('frottement de base seul : patin 16,483 kN.m au lieu de 20,631, talon 42,933 au lieu de 48,261', () => {
    const c = avec({ frottementBase: true });
    expect(c.patin.M_Ed).toBeCloseTo(16.483, 2);
    expect(c.talon.M_Ed).toBeCloseTo(42.933, 2);
    expect(c.talon.V_Ed).toBeCloseTo(49.224, 2);
  });

  it('bloc du talon, delta = 2/3 phi et frottement : talon M_Ed = 31,77 kN.m, V_Ed = 33,528 kN', () => {
    const c = avec({ talonPrisme: true, frottementBase: true }, 2 / 3);
    expect(c.talon.M_Ed).toBeCloseTo(31.77, 2);
    expect(c.talon.V_Ed).toBeCloseTo(33.528, 2);
  });

  it('refuse un rapport delta/phi superieur a 1', () => {
    expect(() => avec({}, 1.2)).toThrow(/parement/);
  });

  it('sans option, rien ne change : stabilite externe identique', () => {
    const a = verifierMur(mur('DA1'), profil);
    const m = mur('DA1');
    const b = verifierMur({ ...m, talonPrisme: true, frottementBase: true, remblai: { ...m.remblai, deltaParement: 2 / 3 } }, profil);
    expect(b.renversement.taux).toBeCloseTo(a.renversement.taux, 10);
    expect(b.combinaisons[0].glissement.taux).toBeCloseTo(a.combinaisons[0].glissement.taux, 10);
    expect(b.combinaisons[0].portance.taux).toBeCloseTo(a.combinaisons[0].portance.taux, 10);
  });
});

describe('charges en bande, DIN 4085 (DA1-1, Q 20 kPa a 2,6 m, large de 1 m)', () => {
  // Ecran H_t = 3,4 m, phi = 30 : theta = 60, H cot(theta) = 1,96299 m. Bord proche a 1,0 m
  // de l'ecran : b' = 0,96299 m. Delta E = 1/3 x tan 60 x 20 x 0,96299 = 11,1197 kN, entre
  // z1 = 0,57735 et z2 = 3,4 m. H_d = 1,35 x 34,68 + 1,5 x 11,1197 = 63,498 kN.
  // Voile, h = 3 : cot 60 x 3 = 1,73205 < 2,6 : la bande ne pousse pas le voile.
  const m = mur('DA1');
  const d: DonneesMur = { ...m, remblai: { ...m.remblai, q: 0, methodeBandes: 'din4085', charges: [{ nature: 'Q', q: 20, distance: 2.6, largeur: 1 }] } };
  const c = verifierMur(d, profil).combinaisons[0];

  it('poussee de la bande sur l ecran virtuel : 1,5 x 11,1197 kN', () => {
    const b = c.pousseesCalcul.find((x) => x.origine === 'poussée de la bande 1');
    expect(b?.F).toBeCloseTo(1.5 * 11.1197, 3);
    expect(b?.z).toBeCloseTo(3.4 - (0.57735 + 3.4) / 2, 4);
    expect(c.glissement.H_d).toBeCloseTo(63.498, 2);
  });

  it('hors du coin du voile : M_Ed du voile = terres seules, 1,35 x 27 = 36,45 kN.m', () => {
    expect(c.voile.M_Ed).toBeCloseTo(36.45, 2);
  });

  it('refuse une methode inconnue', () => {
    expect(() => verifierMur({ ...d, remblai: { ...d.remblai, methodeBandes: 'autre' as 'din4085' } }, profil)).toThrow(/Méthode/);
  });
});

describe('cohesion du remblai, terres sur le patin, charges en tete, sigma_R,d (DA1-1 sauf mention)', () => {
  const m = mur('DA1');
  const premier = (x: DonneesMur) => verifierMur(x, profil).combinaisons[0];

  it('c = 5 kPa : pression minimale jusqu a 2,7677 m, E = 23,040 kN a 1,1166 m de la base, H_d = 48,104 kN', () => {
    // K_a = 1/3, K_ch = 1,1547, K_min = tan2(25) = 0,21744 ; z* = K_ch c / ((K_a - K_min) gamma).
    const c = premier({ ...m, remblai: { ...m.remblai, c: 5 } });
    expect(c.poussee.P_G).toBeCloseTo(23.04, 2);
    expect(c.poussee.zG).toBeCloseTo(1.1166, 3);
    expect(c.glissement.H_d).toBeCloseTo(48.104, 2);
    expect(c.glissement.taux).toBeCloseTo(0.6176, 3);
  });

  it('terres devant le mur sur 0,8 m : 18 x 0,7 x 0,4 = 5,04 kN sur le patin', () => {
    const r = verifierMur({ ...m, hAval: 0.8 }, profil);
    expect(r.poids.terresPatin).toBeCloseTo(5.04, 6);
    expect(r.renversement.pivot.M_stb_d).toBeCloseTo(187.6 + 0.9 * 5.04 * 0.35, 2);
    // N_d = 134,9 + 5,04 ; R_d = 139,94 x tan 30.
    expect(r.combinaisons[0].glissement.taux).toBeCloseTo(63.818 / (139.94 * Math.tan(Math.PI / 6)), 3);
  });

  it('charge Q en tete, H = 2 kN, M = 1 kN.m : H_d + 3, voile + 10,5 kN.m, M_dst + 11,7 kN.m', () => {
    const d = { ...m, chargesTete: [{ nature: 'Q' as const, H: 2, V: 0, M: 1 }] };
    const r = verifierMur(d, profil);
    expect(r.combinaisons[0].glissement.H_d).toBeCloseTo(66.818, 2);
    expect(r.combinaisons[0].voile.M_Ed).toBeCloseTo(58.95 + 10.5, 2);
    expect(r.combinaisons[0].voile.V_Ed).toBeCloseTo(51.45 + 3, 2);
    expect(r.renversement.pivot.M_dst_d).toBeCloseTo(88.537 + 11.7, 2);
  });

  it('charge G verticale en tete : favorable pour le glissement, a 1,0', () => {
    const r = verifierMur({ ...m, chargesTete: [{ nature: 'G', H: 0, V: 10, M: 0 }] }, profil);
    expect(r.combinaisons[0].glissement.N_d).toBeCloseTo(144.9, 6);
  });

  it('sigma_R,d : contrainte V / B prime de chaque cas, la plus forte retenue', () => {
    const c = verifierMur({ ...mur('DA2'), fondation: { ...m.fondation, sigmaRd: 100 } }, profil).combinaisons[0];
    const inf = c.cas.find((x) => x.nom === 'DA2, verticales inf');
    expect(inf?.sigmaEd).toBeCloseTo(134.9 / 1.875, 0);
    const max = Math.max(...c.cas.map((x) => x.sigmaEd ?? 0));
    expect(c.contrainte?.sigmaEd).toBeCloseTo(max, 10);
    expect(c.contrainte?.taux).toBeCloseTo(max / 100, 10);
  });

  it('refuse sigma_R,d nul et un rapport delta/phi sur l about superieur a 1', () => {
    expect(() => verifierMur({ ...m, fondation: { ...m.fondation, sigmaRd: 0 } }, profil)).toThrow(/sigma_R,d/);
    expect(() => verifierMur({ ...m, remblai: { ...m.remblai, deltaAbout: 1.5 } }, profil)).toThrow(/about/);
  });
});

describe('E_av de l about sur le talon', () => {
  it('le tranchant et le moment du talon prennent 1,35 E_av, au bras de la longueur du talon', () => {
    // Remblai c = 5 kPa, delta about = 2/3 : E_av > 0 ; comparaison avec E_av rendu nul a la main.
    const m = mur('DA1');
    const avec = verifierMur({ ...m, remblai: { ...m.remblai, deltaAbout: 2 / 3 } }, profil).combinaisons[0];
    const Pv = avec.poussee.Pv ?? 0;
    expect(Pv).toBeGreaterThan(0);
    const cas = avec.cas.find((x) => x.nom === 'DA1-1, verticales sup');
    // V de la base compte 1,35 E_av.
    const sans = verifierMur(m, profil).combinaisons[0].cas.find((x) => x.nom === 'DA1-1, verticales sup');
    expect((cas?.V ?? 0) - (sans?.V ?? 0)).toBeCloseTo(1.35 * Pv, 6);
  });
});
