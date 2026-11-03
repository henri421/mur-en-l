import { describe, it, expect } from 'vitest';
import { phiCalcul, portanceDrainee } from '../src/sol';
import { profilRecommande } from '../src/profil';
import { deriverProfil } from '../src/coefficients';
import { verifierMur, type DonneesMur } from '../src/mur';

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

  it('poussee des terres : 111,47 kN/m dans Frilo, ecart declare de 2 % (delta nul sur l about du talon)', () => {
    const P_G = verifierMur(murA(), profilEqu).combinaisons[0].poussee.P_G;
    expect(P_G / 111.47).toBeGreaterThan(1);
    expect(P_G / 111.47).toBeLessThan(1.025);
  });
});
