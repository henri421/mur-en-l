import { describe, it, expect } from 'vitest';
import { coefficientsModifies, deriverProfil, listerCoefficients } from '../src/coefficients';
import { profilRecommande } from '../src/profil';
import { profil2eRecommande } from '../src/profil2e';

describe('coefficients modifiables', () => {
  it('liste les feuilles du profil 1re generation, sans gamma_Q favorable', () => {
    const l = listerCoefficients(profilRecommande());
    const cles = l.map((c) => c.cle);
    expect(cles).toContain('EQU.sol.gPhi');
    expect(cles).toContain('R2.gRv');
    expect(cles).toContain('beton.cRdc');
    expect(cles.some((c) => c.endsWith('gQ_stb'))).toBe(false);
    // EQU 3 + 2, A1 et A2 3 + 3, M1 et M2 2 + 2, R1 a R3 6, beton 5.
    expect(l).toHaveLength(26);
  });

  it('liste les facteurs par classe de la 2e generation', () => {
    const cles = listerCoefficients(profil2eRecommande()).map((c) => c.cle);
    expect(cles).toContain('kF.CC2');
    expect(cles).toContain('gV');
  });

  it('derive un profil : valeur saisie, source qui rappelle la recommandee', () => {
    const p = deriverProfil(profilRecommande(), { 'EQU.sol.gPhi': 1.0, 'beton.cRdc': 0.15 });
    expect(p.EQU.sol.gPhi.valeur).toBe(1.0);
    expect(p.EQU.sol.gPhi.source).toMatch(/saisie par l'utilisateur \(recommandée : 1,25, EN 1997-1:2004, tableau A.2/);
    expect(p.beton.cRdc.valeur).toBe(0.15);
    expect(p.nom).toMatch(/modifiées/);
    expect(profilRecommande().EQU.sol.gPhi.valeur).toBe(1.25);
  });

  it('une valeur egale a la recommandee ne change ni la source ni le nom', () => {
    const p = deriverProfil(profilRecommande(), { 'R2.gRv': 1.4 });
    expect(p.R2.gRv.source).not.toMatch(/saisie/);
    expect(p.nom).toBe(profilRecommande().nom);
  });

  it('refuse une cle inconnue, une valeur nulle et un gamma_Q favorable', () => {
    expect(() => deriverProfil(profilRecommande(), { 'A9.gG_dst': 1 })).toThrow(/inconnu.*A9/);
    expect(() => deriverProfil(profilRecommande(), { 'A1.gG_dst': 0 })).toThrow(/strictement positif/);
    expect(() => deriverProfil(profilRecommande(), { 'A1.gQ_stb': 1 })).toThrow(/inconnu/);
  });

  it('rend les coefficients modifies et leur valeur recommandee', () => {
    const p = deriverProfil(profil2eRecommande(), { 'kF.CC2': 1.1 });
    expect(coefficientsModifies(p, profil2eRecommande())).toEqual([{ cle: 'kF.CC2', valeur: 1.1, recommandee: 1.0 }]);
  });
});
