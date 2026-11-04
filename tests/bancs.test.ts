import { describe, it, expect } from 'vitest';
import { coefficientCohesion, kaCoulomb, phiCalcul, PHI_MINIMUM, portanceDrainee, pressionTerres } from '../src/sol';
import { profilRecommande } from '../src/profil';
import { deriverProfil } from '../src/coefficients';
import { angleRupture, pousseeBande, verifierMur, type DonneesMur } from '../src/mur';

/**
 * Banc externe : mur A calcule dans Frilo WSM+ 2026-0-7 (DIN EN 1997-1/NA), voir
 * docs/validation/frilo-mur-a.md. Seules les grandeurs dont les hypotheses
 * coincident sont comparees ; les ecarts de methode y sont expliques. Valeurs
 * relevees dans le rapport Frilo, ecrites en dur.
 */
function murA(approche: DonneesMur['approche'] = 'DA2*'): DonneesMur {
  return {
    geometrie: { h: 6.08, eHaut: 0.45, eBas: 0.45, es: 0.4, patin: 0.6, talon: 2.4 },
    gammaBeton: 25,
    remblai: {
      gamma: 18,
      phi: 32.5,
      q: 0,
      charges: [
        { nature: 'Q', q: 2, distance: 0, largeur: 2.3 },
        { nature: 'Q', q: 5, distance: 2.3, largeur: 1.95 },
        { nature: 'Q', q: 20, distance: 4.25, largeur: 3.0 },
        { nature: 'Q', q: 9, distance: 7.25, largeur: 3.5 },
      ],
    },
    fondation: { phi: 30, deltaSurPhi: 1, portance: { mode: 'annexeD', phi: 32.5, c: 0, gamma: 18, D: 0.6 } },
    armatures: { fck: 30, fyk: 500, a: 55, voileArriere: 1643, voileAvant: 0, semelleHaut: 1546, semelleBas: 498 },
    approche,
  };
}

/** Le profil EQU de l'annexe allemande : phi' caracteristique. */
const profilEqu = deriverProfil(profilRecommande(), { 'EQU.sol.gPhi': 1.0 });

describe('Banc Frilo, mur A', () => {
  it('moment stabilisant EQU : 636,81 kN.m/m moins la terre sur le patin (0,9 x 0,65)', () => {
    expect(verifierMur(murA(), profilEqu).renversement.pivot.M_stb_d).toBeCloseTo(636.81 - 0.9 * 0.65, 0);
  });

  it('poussee de la bande 2, qui commence a l ecran : 5,07 kN/m', () => {
    const c = verifierMur(murA(), profilEqu).combinaisons[0];
    const b2 = c.pousseesCalcul.find((p) => p.origine === 'poussée de la bande 2');
    expect((b2?.F ?? 0) / 1.5).toBeCloseTo(5.07, 2);
  });

  it('portance avec les donnees de Frilo : R_n,k = 416,8 kN/m (DIN 4017 et annexe D concordent)', () => {
    const r = portanceDrainee({ Bp: 1.9556, V: 373.51, H: 148.02, phi: phiCalcul(32.5, 1), c: 0, gamma: 18, q: 18 * 0.6 });
    expect(r.q_u * 1.9556).toBeCloseTo(416.8, 0);
  });

  it('voile, terres seules, delta = 2/3 phi : M_Ed = 1,35 x 161,54 et V_Ed = 1,35 x 83,39 (Frilo, K_agh = 0,251)', () => {
    const m = murA();
    const c = verifierMur({ ...m, remblai: { ...m.remblai, charges: [], deltaParement: 2 / 3 } }, profilEqu).combinaisons[0];
    expect(c.voile.M_Ed).toBeCloseTo(1.35 * 161.54, 0);
    expect(c.voile.V_Ed).toBeCloseTo(1.35 * 83.39, 0);
  });

  it('poussee des terres : 111,47 kN/m dans Frilo, ecart declare de 2 % (delta nul sur l about du talon)', () => {
    const P_G = verifierMur(murA(), profilEqu).combinaisons[0].poussee.P_G;
    expect(P_G / 111.47).toBeGreaterThan(1);
    expect(P_G / 111.47).toBeLessThan(1.025);
  });
});

/**
 * Banc externe : mb BauStatik S530.de 2026.009, mur dit « coupe type 1 », poussee des
 * bandes selon la DIN 4085:2017-08 (rapport du 04/11/2026). Remblai phi' = 30 degres.
 * MB prend sur l'ecran virtuel un frottement moyen delta = 2,36 degres (E_av / E_ah de
 * la bande 2 : 0,21 / 5,10) : theta = 59,42 degres et K_aVh = 0,551 dans le rapport.
 */
describe('Banc MB, bandes selon la DIN 4085', () => {
  const phi = phiCalcul(30, 1);
  const delta = phiCalcul(2.36, 1);
  const Kah = kaCoulomb(phi, delta).Kah;

  it('angle de rupture : 60 degres sans frottement, 59,42 avec delta = 2,36 degres', () => {
    expect((angleRupture(phi) * 180) / Math.PI).toBeCloseTo(60, 6);
    expect((angleRupture(phi, delta) * 180) / Math.PI).toBeCloseTo(59.42, 1);
  });

  it('K_aVh = K_ah tan(theta) = 0,551', () => {
    expect(Kah * Math.tan(angleRupture(phi, delta))).toBeCloseTo(0.551, 3);
  });

  it('bande 2, 5 kPa, de 0 a 1,85 m de l ecran : E_ah = 5,10 kN/m sur [0 ; 3,13 m]', () => {
    const p = pousseeBande(0, 1.85, phi, 6.48, Kah, 'din4085', delta);
    expect((p?.P ?? 0) * 5).toBeCloseTo(5.1, 2);
    expect(p?.z2).toBeCloseTo(3.13, 2);
  });

  it('bande 3, 20 kPa, a 1,85 m, large de 3 m : seule la part dans le coin pousse, E_ah = 21,81 kN/m sur [1,07 ; 6,48 m]', () => {
    const p = pousseeBande(1.85, 3, phi, 6.48, Kah, 'din4085', delta);
    expect((p?.P ?? 0) * 20).toBeCloseTo(21.81, 1);
    expect(p?.z1).toBeCloseTo(1.07, 2);
    expect(p?.z2).toBeCloseTo(6.48, 2);
  });

  it('voile au repos, terres seules : M_Ed = 1,35 x 365,23 et V_Ed = 1,35 x 180,21 (MB, K_0 = 0,5)', () => {
    const m = murA();
    const d: DonneesMur = { ...m, remblai: { ...m.remblai, gamma: 19.5, phi: 30, charges: [], partKa: 1, partKaVoile: 0 } };
    const c = verifierMur(d, profilEqu).combinaisons[0];
    expect(c.voile.M_Ed).toBeCloseTo(1.35 * 365.23, 0);
    expect(c.voile.V_Ed).toBeCloseTo(1.35 * 180.21, 0);
    // La stabilite externe reste en poussee active.
    expect(c.poussee.P_G).toBeCloseTo(0.5 * (1 / 3) * 19.5 * 6.48 ** 2, 6);
  });

  it('bande 4, a 4,85 m de l ecran : hors du coin, aucune poussee', () => {
    expect(pousseeBande(4.85, 7, phi, 6.48, Kah, 'din4085', delta)).toBeNull();
  });

  it('la diffusion de l outil donne la meme poussee pour une bande au droit de l ecran, plus pour une bande eloignee', () => {
    const K = 1 / 3;
    const d0 = pousseeBande(0, 1.85, phi, 6.48, K, 'diffusion');
    const n0 = pousseeBande(0, 1.85, phi, 6.48, K, 'din4085');
    expect(d0?.P).toBeCloseTo(n0?.P ?? 0, 6);
    expect(pousseeBande(1.85, 3, phi, 6.48, K, 'diffusion')?.P ?? 0).toBeGreaterThan(pousseeBande(1.85, 3, phi, 6.48, K, 'din4085')?.P ?? 0);
  });
});

describe('Banc MB, poussee des terres avec cohesion (DIN 4085)', () => {
  // Remblai gamma = 19,5, phi' = 30, c' = 2,5 kPa ; sol sur 6,08 m (delta = 0), about de
  // 0,40 m avec delta = 20 degres. MB : K_ach = 1,155 et 0,922, K_min = 0,217 et 0,179,
  // E_ah = 117,20 kN/m a 4,39 m sous la tete, E_av = 4,65 kN/m.
  const phi = phiCalcul(30, 1);

  it('coefficients : K_ch = 1,155 et 0,922 ; K_min = 0,217 et 0,179', () => {
    expect(coefficientCohesion(phi)).toBeCloseTo(1.155, 3);
    expect(coefficientCohesion(phi, phiCalcul(20, 1))).toBeCloseTo(0.922, 3);
    expect(kaCoulomb(PHI_MINIMUM, 0).Kah).toBeCloseTo(0.217, 3);
    expect(kaCoulomb(PHI_MINIMUM, (2 / 3) * PHI_MINIMUM).Kah).toBeCloseTo(0.179, 3);
  });

  it('E_ah = 117,20 kN/m, z = 4,39 m, E_av = 4,65 kN/m', () => {
    const r = pressionTerres(19.5, phi, 2.5, 1, [
      { z0: 0, z1: 6.08, rapportDelta: 0 },
      { z0: 6.08, z1: 6.48, rapportDelta: 2 / 3 },
    ]);
    expect(r.E).toBeCloseTo(117.2, 1);
    expect(r.z).toBeCloseTo(4.39, 2);
    expect(r.Ev).toBeCloseTo(4.65, 2);
  });

  it('mur complet : la poussee de l outil est celle de MB', () => {
    const m = murA();
    const d: DonneesMur = { ...m, remblai: { ...m.remblai, gamma: 19.5, phi: 30, c: 2.5, deltaAbout: 2 / 3, charges: [] } };
    const c = verifierMur(d, profilEqu).combinaisons[0];
    expect(c.poussee.P_G).toBeCloseTo(117.2, 1);
    expect(c.poussee.Pv).toBeCloseTo(4.65, 2);
  });
});
