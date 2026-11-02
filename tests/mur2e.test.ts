import { describe, it, expect } from 'vitest';
import { coefficientPoussee, portanceDrainee2e, phiCalcul } from '../src/sol';
import { combinaisons2e, profil2eRecommande, verifierProfil2e, type Approche2e } from '../src/profil2e';
import { projectionBande, verifierMur, verifierMur2e, type ChargeBande, type DonneesMur, type DonneesMur2e } from '../src/mur';
import { profilRecommande } from '../src/profil';

const profil = profil2eRecommande();

/**
 * Cas de reference de docs/validation/cas-reference.md, en 2e generation. Les
 * valeurs attendues viennent d'un calcul independant du code, ecrit en dur ici.
 */
function mur(approche: Approche2e = 'a+b', autre: Partial<DonneesMur2e> = {}): DonneesMur2e {
  return {
    geometrie: { h: 3.0, eHaut: 0.3, eBas: 0.3, es: 0.4, patin: 0.7, talon: 1.6 },
    gammaBeton: 25,
    remblai: { gamma: 18, phi: 30, q: 10 },
    fondation: { phi: 30, deltaSurPhi: 1, portance: { mode: 'annexeD', phi: 30, c: 0, gamma: 19, D: 0.8 } },
    armatures: { fck: 30, fyk: 500, a: 50, voileArriere: 1340.41, voileAvant: 0, semelleHaut: 1340.41, semelleBas: 1340.41 },
    approche,
    consequences: 'CC2',
    dimensionsControlees: false,
    profondeurComptee: false,
    Dlower: 20,
    ...autre,
  };
}

function combinaison(approche: Approche2e, indice = 0, autre: Partial<DonneesMur2e> = {}) {
  return verifierMur2e(mur(approche, autre), profil).combinaisons[indice];
}

describe('profil', () => {
  it('une valeur sans source bloque', () => {
    const p = profil2eRecommande();
    p.gRN.source = ' ';
    expect(() => verifierProfil2e(p)).toThrow(/source/);
  });

  it('(a) + (b) a deux combinaisons, (c) et (d) une', () => {
    expect(combinaisons2e('a+b', 'CC2', profil).map((c) => c.nom)).toEqual(['(a) VC4 + M1', '(b) VC3 + M2']);
    expect(combinaisons2e('c', 'CC2', profil)).toHaveLength(1);
    expect(combinaisons2e('d', 'CC2', profil)).toHaveLength(1);
  });

  it('CC3 : k_F sur VC1, pas sur VC3 ; k_M sur M2 ; k_R sur les resistances ; (c) sans k_M', () => {
    const [a, b] = combinaisons2e('a+b', 'CC3', profil);
    expect(a.geotechnique.gG_dst.valeur).toBeCloseTo(1.485, 10);
    expect(a.geotechnique.gQ_dst.valeur).toBeCloseTo(1.65, 10);
    expect(b.geotechnique.gG_dst.valeur).toBe(1);
    expect(b.geotechnique.gQ_dst.valeur).toBe(1.3);
    expect(b.sol.gPhi.valeur).toBeCloseTo(1.375, 10);
    const [c] = combinaisons2e('c', 'CC3', profil);
    expect(c.sol.gPhi.valeur).toBe(1.25);
    const [d] = combinaisons2e('d', 'CC3', profil);
    expect(d.resistance.gRv.valeur).toBeCloseTo(1.54, 10);
    expect(d.resistance.gRh.valeur).toBeCloseTo(1.21, 10);
  });
});

describe('portance annexe B.4', () => {
  it('N_gamma = 2 (N_q + 1) tan phi, sans cohesion dans i_q', () => {
    const r = portanceDrainee2e({ Bp: 1.7752, V: 134.9, H: 63.818, phi: phiCalcul(30, 1), c: 0, gamma: 19, q: 15.2 });
    expect(r.Nq).toBeCloseTo(18.4011, 3);
    expect(r.Ngamma).toBeCloseTo(22.4025, 3);
    expect(r.q_u).toBeCloseTo(132.931, 1);
  });

  it('le facteur de profondeur majore le seul terme en q', () => {
    const base = { Bp: 2, V: 200, H: 40, phi: phiCalcul(30, 1), c: 0, gamma: 19, q: 15.2 };
    const sans = portanceDrainee2e(base);
    const avec = portanceDrainee2e({ ...base, Df: 0.8 });
    const dq = 1 + 2 * Math.tan(base.phi) * (1 - 0.5) ** 2 * 0.4;
    expect(avec.q_u - sans.q_u).toBeCloseTo(15.2 * sans.Nq * sans.iq * (dq - 1), 6);
  });
});

describe('Cas de reference : basculement et excentricite', () => {
  const r = verifierMur2e(mur(), profil);

  it('VC2(a) gouverne : 1,35 sur la poussee, 1,15 sur les terres, 1,0 sur le beton', () => {
    expect(r.generation).toBe('2e');
    expect(r.renversement.cas).toBe('VC2(a)');
    expect(r.renversement.Ka).toBeCloseTo(1 / 3, 10);
    expect(r.renversement.pivot.M_dst_d).toBeCloseTo(81.9604, 3);
    expect(r.renversement.pivot.M_stb_d).toBeCloseTo(231.773, 3);
    expect(r.renversement.taux).toBeCloseTo(0.35362, 4);
  });

  it('tableau 5.3 : permanentes e <= B/6, avec la variable e <= B/3', () => {
    const x = r.excentricite;
    expect(x.detail?.eG).toBeCloseTo(0.046175, 5);
    expect(x.detail?.tauxG).toBeCloseTo(0.10656, 4);
    expect(x.detail?.eGQ).toBeCloseTo(0.188997, 5);
    expect(x.detail?.tauxGQ).toBeCloseTo(0.21807, 4);
    expect(x.taux).toBeCloseTo(0.21807, 4);
    expect(x.limite).toBeCloseTo(2.6 / 3, 10);
  });
});

describe('Cas de reference : glissement', () => {
  it('(a) : M1, comme VC1', () => {
    const c = combinaison('a+b', 0);
    expect(c.glissement.H_d).toBeCloseTo(63.818, 2);
    expect(c.mu_d).toBeCloseTo(0.57735, 4);
    expect(c.glissement.taux).toBeCloseTo(0.8194, 3);
  });

  it('(b) : M2', () => {
    const c = combinaison('a+b', 1);
    expect(c.glissement.H_d).toBeCloseTo(60.65, 2);
    expect(c.mu_d).toBeCloseTo(0.46188, 4);
    expect(c.glissement.taux).toBeCloseTo(0.9734, 3);
  });

  it('(c) : VC1 avec M2, refuse sur ce mur', () => {
    const c = combinaison('c');
    expect(c.glissement.H_d).toBeCloseTo(78.33, 2);
    expect(c.glissement.taux).toBeCloseTo(1.2571, 3);
  });

  it('(d) : gamma_RT = 1,1', () => {
    const c = combinaison('d');
    expect(c.mu_d).toBeCloseTo(0.52486, 4);
    expect(c.glissement.taux).toBeCloseTo(0.9013, 3);
  });

  it('k_interface porte sur la tangente', () => {
    const c = combinaison('a+b', 0, { fondation: { phi: 30, deltaSurPhi: 2 / 3, portance: { mode: 'saisie', qRd: 300 } } });
    expect(c.mu_d).toBeCloseTo((2 / 3) * Math.tan(Math.PI / 6), 10);
  });
});

describe('Cas de reference : portance', () => {
  it('(a) : B_d = 2,5 m, le cas le plus severe sans surcharge ni majoration', () => {
    const p = combinaison('a+b', 0).portance;
    expect(p.nom).toBe('(a) VC4 + M1, verticales inf');
    expect(p.V).toBeCloseTo(134.9, 2);
    expect(p.e).toBeCloseTo(0.3624, 3);
    expect(p.Bp).toBeCloseTo(1.7752, 3);
    expect(p.R_d).toBeCloseTo(235.984, 1);
    expect(p.taux).toBeCloseTo(0.5716, 3);
  });

  it('(b)', () => {
    const p = combinaison('a+b', 1).portance;
    expect(p.Bp).toBeCloseTo(1.8194, 3);
    expect(p.R_d).toBeCloseTo(142.756, 1);
    expect(p.taux).toBeCloseTo(0.945, 3);
  });

  it('(c)', () => {
    expect(combinaison('c').portance.taux).toBeCloseTo(2.3095, 2);
  });

  it('(d) : gamma_RN = 1,4', () => {
    const p = combinaison('d').portance;
    expect(p.R_d).toBeCloseTo(168.56, 1);
    expect(p.taux).toBeCloseTo(0.8003, 3);
  });

  it('dimensions controlees : pas de reduction de B', () => {
    const p = combinaison('a+b', 0, { dimensionsControlees: true }).portance;
    expect(p.Bp).toBeCloseTo(2.6 - 2 * 0.36238, 3);
    const r = verifierMur2e(mur('a+b', { dimensionsControlees: true }), profil);
    expect(r.avertissements).toHaveLength(0);
  });

  it('reduction de B annoncee', () => {
    expect(verifierMur2e(mur(), profil).avertissements.join(' ')).toMatch(/0,1 m/);
  });

  it('q_Rd saisi : R_d = q_Rd B_d-2e', () => {
    const p = combinaison('a+b', 0, { fondation: { phi: 30, deltaSurPhi: 1, portance: { mode: 'saisie', qRd: 300 } } }).portance;
    expect(p.R_d).toBeCloseTo(300 * p.Bp, 8);
    expect(p.sol).toBeNull();
  });
});

describe('Cas de reference : sections', () => {
  const a = combinaison('a+b', 0);

  it('efforts, identiques a la 1re generation en (a)', () => {
    expect(a.voile.M_Ed).toBeCloseTo(58.95, 2);
    expect(a.voile.V_Ed).toBeCloseTo(51.45, 2);
    expect(a.patin.M_Ed).toBeCloseTo(20.631, 2);
    expect(a.patin.V_Ed).toBeCloseTo(57.534, 2);
    expect(a.talon.M_Ed).toBeCloseTo(48.261, 2);
    expect(a.talon.V_Ed).toBeCloseTo(49.224, 2);
  });

  it('M_Rd sur f_cd = 17 MPa : bloc rectangulaire a 2 % pres', () => {
    expect(Math.abs(a.voile.M_Rd / 138.296 - 1)).toBeLessThan(0.02);
    expect(Math.abs(a.talon.M_Rd / 193.986 - 1)).toBeLessThan(0.02);
  });

  it('V_Rd,c, EN 1992-1-1:2023 : tau_Rdc,min gouverne ici', () => {
    expect(a.voile.V_Rd_c).toBeCloseTo(176.219, 2);
    expect(a.talon.V_Rd_c).toBeCloseTo(208.505, 2);
  });

  it('armature minimale, (12.1)', () => {
    expect(a.voile.As_min).toBeCloseTo(386.196, 2);
    expect(a.talon.As_min).toBeCloseTo(490.407, 2);
  });

  it('(b) : efforts sous VC3 et M2', () => {
    const b = combinaison('a+b', 1);
    expect(b.voile.M_Ed).toBeCloseTo(57.074, 2);
    expect(b.patin.V_Ed).toBeCloseTo(51.041, 2);
    expect(b.talon.M_Ed).toBeCloseTo(46.267, 2);
  });
});

describe('Garde-fous', () => {
  it('D_lower < 8 mm refuse', () => {
    expect(() => verifierMur2e(mur('a+b', { Dlower: 4 }), profil)).toThrow(/D_lower/);
  });

  it('k_interface > 1 refuse', () => {
    expect(() => verifierMur2e(mur('a+b', { fondation: { phi: 30, deltaSurPhi: 1.2, portance: { mode: 'saisie', qRd: 300 } } }), profil)).toThrow(/k_interface/);
  });

  it('(c) depasse : verdict non conforme, resultat rendu', () => {
    const r = verifierMur2e(mur('c'), profil);
    expect(r.verdict).toBe('non-conforme');
    expect(r.tauxExterne).toBeCloseTo(2.3095, 2);
  });

  it('la 1re generation se declare comme telle', () => {
    const { approche: _a, consequences: _c, dimensionsControlees: _d, profondeurComptee: _p, Dlower: _l, ...reste } = mur();
    expect(verifierMur({ ...reste, approche: 'DA1' }, profilRecommande()).generation).toBe('1re');
  });
});

describe('Charges en bande', () => {
  const sansQ = (charges: ChargeBande[], approche: Approche2e = 'a+b') => mur(approche, { remblai: { gamma: 18, phi: 30, q: 0, charges } });
  const en1re = (x: DonneesMur2e): DonneesMur => {
    const { approche: _a, consequences: _c, dimensionsControlees: _d, profondeurComptee: _p, Dlower: _l, ...reste } = x;
    return { ...reste, approche: 'DA1' };
  };

  it('projection : phi au bord proche, 45 + phi/2 au bord eloigne, bornee a H', () => {
    const p = projectionBande(1, 1, Math.PI / 6, 3.4);
    expect(p?.z1).toBeCloseTo(0.57735, 5);
    expect(p?.z2).toBe(3.4);
    expect(projectionBande(10, 1, Math.PI / 6, 3.4)).toBeNull();
  });

  it('une bande sans fin depuis le voile redonne la surcharge uniforme, dans les deux generations', () => {
    const bande: ChargeBande[] = [{ nature: 'Q', q: 10, distance: 0, largeur: 1000 }];
    const r = verifierMur2e(sansQ(bande), profil);
    const ref = verifierMur2e(mur(), profil);
    expect(r.tauxExterne).toBeCloseTo(ref.tauxExterne, 8);
    expect(r.tauxSections).toBeCloseTo(ref.tauxSections, 8);
    expect(r.combinaisons[1].talon.M_Ed).toBeCloseTo(ref.combinaisons[1].talon.M_Ed, 8);
    expect(r.renversement.taux).toBeCloseTo(ref.renversement.taux, 8);
    const r1 = verifierMur(en1re(sansQ(bande)), profilRecommande());
    const ref1 = verifierMur(en1re(mur()), profilRecommande());
    expect(r1.tauxExterne).toBeCloseTo(ref1.tauxExterne, 8);
    expect(r1.renversement.taux).toBeCloseTo(ref1.renversement.taux, 8);
    expect(r1.combinaisons[0].voile.M_Ed).toBeCloseTo(ref1.combinaisons[0].voile.M_Ed, 8);
  });

  // Bande Q de 20 kPa, a 1,0 m derriere le talon, large de 1,0 m. Calcul a la main.
  const loin: ChargeBande[] = [{ nature: 'Q', q: 20, distance: 2.6, largeur: 1 }];

  it('hors du talon, (a) : poussee sur l ecran, phi = 30', () => {
    const c = verifierMur2e(sansQ(loin), profil).combinaisons[0];
    // 1,35 x 34,68 + 1,5 x 20/3 x (3,4 - 0,57735)
    expect(c.glissement.H_d).toBeCloseTo(75.045, 2);
    // Rien sur le talon : N inchange.
    expect(c.glissement.N_d).toBeCloseTo(134.9, 6);
    // 1,35 x 27 + 1,5 x 20/3 x (3 - 1,50111) x (3 - (1,50111 + 3)/2)
    expect(c.voile.M_Ed).toBeCloseTo(47.682, 2);
  });

  it('hors du talon, (b) : la diffusion suit phi de calcul', () => {
    const c = verifierMur2e(sansQ(loin), profil).combinaisons[1];
    // z1 = 0,46188 ; z2 = 2 x 1,56339 ; 42,566 + 1,3 x 0,40913 x 20 x 2,6649
    expect(c.glissement.H_d).toBeCloseTo(70.914, 2);
  });

  it('sur le talon : le poids compte, en G sur les quatre cas, en Q sur deux', () => {
    const g = verifierMur2e(sansQ([{ nature: 'G', q: 10, distance: 0.4, largeur: 0.8 }]), profil).combinaisons[0];
    expect(g.cas.find((x) => x.verticales === 'inf' && !x.surchargeSurTalon)?.V).toBeCloseTo(142.9, 6);
    expect(g.glissement.N_d).toBeCloseTo(142.9, 6);
    const q = verifierMur2e(sansQ([{ nature: 'Q', q: 10, distance: 0.4, largeur: 0.8 }]), profil).combinaisons[0];
    expect(q.cas.find((x) => x.verticales === 'inf' && !x.surchargeSurTalon)?.V).toBeCloseTo(134.9, 6);
    expect(q.cas.find((x) => x.verticales === 'inf' && x.surchargeSurTalon)?.V).toBeCloseTo(146.9, 6);
  });

  it('a cheval : la part du talon pese, celle au-dela pousse', () => {
    const c = verifierMur2e(sansQ([{ nature: 'G', q: 10, distance: 1.1, largeur: 1 }]), profil).combinaisons[0];
    expect(c.glissement.N_d).toBeCloseTo(139.9, 6);
    // 1,35 x (34,68 + 10/3 x (0,5 x tan 60))
    expect(c.glissement.H_d).toBeCloseTo(50.715, 2);
  });

  it('plusieurs bandes s additionnent', () => {
    const a: ChargeBande = { nature: 'Q', q: 20, distance: 2.6, largeur: 1 };
    const b: ChargeBande = { nature: 'G', q: 10, distance: 0.4, largeur: 0.8 };
    const r = verifierMur2e(sansQ([a, b]), profil).combinaisons[0];
    const ra = verifierMur2e(sansQ([a]), profil).combinaisons[0];
    const rb = verifierMur2e(sansQ([b]), profil).combinaisons[0];
    expect(r.glissement.H_d).toBeCloseTo(ra.glissement.H_d + rb.glissement.H_d - 1.35 * 34.68, 6);
  });

  it('les bandes gardent le numero de la saisie, meme si la precedente reste sur le talon', () => {
    const r = verifierMur2e(sansQ([{ nature: 'G', q: 10, distance: 0.4, largeur: 0.8 }, ...loin]), profil);
    expect(r.combinaisons[0].pousseesCalcul.map((p) => p.origine)).toEqual(['poussée des terres', 'poussée de la bande 2']);
    expect(r.renversement.pivot.lignes.some((l) => l.elementaire.origine.includes('poussée de la bande 2'))).toBe(true);
    expect(r.renversement.pivot.lignes.some((l) => l.elementaire.origine.includes('bande 1 sur le talon'))).toBe(true);
  });

  it('les poussees de calcul somment a H_d', () => {
    for (const c of verifierMur2e(sansQ(loin), profil).combinaisons) {
      expect(c.pousseesCalcul.reduce((s, p) => s + p.F, 0)).toBeCloseTo(c.glissement.H_d, 6);
    }
    const r = verifierMur(en1re(mur()), profilRecommande());
    expect(r.combinaisons[0].pousseesCalcul).toHaveLength(2);
    expect(r.combinaisons[0].pousseesCalcul[0].F).toBeCloseTo(1.35 * 34.68, 2);
  });

  it('phi de calcul du renversement, pour la projection', () => {
    expect(verifierMur2e(mur(), profil).renversement.phi_d).toBe(30);
    const phi = (Math.atan(Math.tan(Math.PI / 6) / 1.25) * 180) / Math.PI;
    expect(verifierMur(en1re(mur()), profilRecommande()).renversement.phi_d).toBeCloseTo(phi, 8);
  });

  it('toute bande fait annoncer que la methode est hors Eurocode, dans les deux generations', () => {
    const sans = verifierMur2e(mur(), profil).avertissements;
    expect(sans.some((a) => a.includes('EN 1997.'))).toBe(false);
    expect(verifierMur2e(sansQ(loin), profil).avertissements.some((a) => a.includes('absente de l'))).toBe(true);
    expect(verifierMur(en1re(sansQ(loin)), profilRecommande()).avertissements.some((a) => a.includes('absente de l'))).toBe(true);
  });

  it('largeur nulle refusee', () => {
    expect(() => verifierMur2e(sansQ([{ nature: 'G', q: 10, distance: 0, largeur: 0 }]), profil)).toThrow(/largeur/);
  });
});

describe('Part de K_a', () => {
  const remblai = (partKa: number) => ({ remblai: { gamma: 18, phi: 30, q: 10, partKa } });
  const r1 = (partKa: number) => verifierMur({ ...mur(), ...remblai(partKa), approche: 'DA1' } as unknown as DonneesMur, profilRecommande());

  it('coefficient : K_a, K_0, et le milieu', () => {
    expect(coefficientPoussee(Math.PI / 6, 1)).toBeCloseTo(1 / 3, 10);
    expect(coefficientPoussee(Math.PI / 6, 0)).toBeCloseTo(0.5, 10);
    expect(coefficientPoussee(Math.PI / 6, 0.5)).toBeCloseTo(5 / 12, 10);
    expect(coefficientPoussee(Math.PI / 6)).toBeCloseTo(1 / 3, 10);
  });

  it('100 % redonne le calcul sans le champ', () => {
    const a = verifierMur2e(mur('a+b', remblai(1)), profil);
    const b = verifierMur2e(mur(), profil);
    expect(a.tauxExterne).toBe(b.tauxExterne);
    expect(a.combinaisons[0].voile.M_Ed).toBe(b.combinaisons[0].voile.M_Ed);
  });

  it('1re generation, DA1-1 : 0 % et 50 %, a la main', () => {
    // 1,35 x K x 18 x 3,4^2 / 2 + 1,5 x K x 10 x 3,4
    expect(r1(0).combinaisons[0].glissement.H_d).toBeCloseTo(95.727, 2);
    expect(r1(0.5).combinaisons[0].glissement.H_d).toBeCloseTo(79.772, 2);
  });

  it('K suit le phi de chaque combinaison', () => {
    // (b) : phi_d = 24,791 degres, K_0 = 0,58069 ; 60,415 + 1,3 x 19,743
    const c = verifierMur2e(mur('a+b', remblai(0)), profil).combinaisons[1];
    expect(c.poussee.Ka).toBeCloseTo(0.58069, 4);
    expect(c.glissement.H_d).toBeCloseTo(86.081, 2);
  });

  it('renversement et voile suivent', () => {
    const r = verifierMur2e(mur('a+b', remblai(0)), profil);
    expect(r.renversement.Ka).toBeCloseTo(0.5, 10);
    // VC2(a) : 1,35 x 52,02 x 3,4/3 + 1,5 x 17 x 1,7
    expect(r.renversement.pivot.M_dst_d).toBeCloseTo(122.943, 2);
    // (a) : 1,35 x 0,5 x 18 x 27/6 + 1,5 x 0,5 x 10 x 9/2
    expect(r.combinaisons[0].voile.M_Ed).toBeCloseTo(88.425, 2);
  });

  it('les bandes prennent K, la diffusion reste celle de phi', () => {
    const avec = (partKa: number) => verifierMur2e(mur('a+b', { remblai: { gamma: 18, phi: 30, q: 0, partKa, charges: [{ nature: 'Q', q: 20, distance: 2.6, largeur: 1 }] } }), profil).combinaisons[0];
    // 1,5 x 0,5 x 20 x (3,4 - 0,57735)
    expect(avec(0).pousseesCalcul[1].F).toBeCloseTo(42.34, 2);
    expect(avec(1).pousseesCalcul[1].F / avec(0).pousseesCalcul[1].F).toBeCloseTo(2 / 3, 6);
  });

  it('hors de 0 a 100 % refuse', () => {
    expect(() => r1(1.2)).toThrow(/part de K_a/);
    expect(() => r1(-0.1)).toThrow(/part de K_a/);
  });
});
