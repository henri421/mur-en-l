/** T1 : la saisie, sa lecture, son enregistrement. */

import { describe, expect, it } from 'vitest';
import { aireParMetre, lireSaisie, relire, saisieParDefaut, serialiser, verifier, type Saisie } from '../../app/src/form';
import { avecBandes } from './_commun';

function refus(s: Saisie): string {
  const l = lireSaisie(s);
  if (l.ok) throw new Error('un refus etait attendu');
  return l.message;
}

function lue(s: Saisie) {
  const l = lireSaisie(s);
  if (!l.ok) throw new Error(l.message);
  return l.calcul;
}

describe('valeurs par defaut', () => {
  it('le cas de reference de docs/validation/cas-reference.md, en 1re generation, DA1', () => {
    const c = lue(saisieParDefaut());
    expect(c.generation).toBe('1re');
    expect(c.donnees.approche).toBe('DA1');
    expect(c.donnees.geometrie).toEqual({ h: 3, eHaut: 0.3, eBas: 0.3, es: 0.4, patin: 0.7, talon: 1.6 });
    expect(c.donnees.gammaBeton).toBe(25);
    expect(c.donnees.remblai).toEqual({ gamma: 18, phi: 30, q: 10, partKa: 1, charges: [] });
    expect(c.donnees.fondation).toEqual({ phi: 30, deltaSurPhi: 1, portance: { mode: 'annexeD', phi: 30, c: 0, gamma: 19, D: 0.8 } });
    expect(c.donnees.armatures.fck).toBe(30);
    expect(c.donnees.armatures.fyk).toBe(500);
    expect(c.donnees.armatures.a).toBe(50);
    expect(c.donnees.armatures.voileArriere).toBeCloseTo(1340.41, 2);
    expect(c.donnees.armatures.voileAvant).toBe(0);
    expect(c.donnees.armatures.semelleHaut).toBeCloseTo(1340.41, 2);
    expect(c.donnees.armatures.semelleBas).toBeCloseTo(1340.41, 2);
  });

  it('verifier rend le resultat de reference, dans les deux generations', () => {
    const r1 = verifier(lue(saisieParDefaut()));
    expect(r1.generation).toBe('1re');
    expect(r1.tauxExterne).toBeCloseTo(0.973, 2);
    const r2 = verifier(lue({ ...saisieParDefaut(), generation: '2e' }));
    expect(r2.generation).toBe('2e');
    expect(r2.combinaisons.map((c) => c.nom)).toEqual(['(a) VC4 + M1', '(b) VC3 + M2']);
    expect(r2.tauxExterne).toBeCloseTo(0.9734, 3);
  });

  it('2e generation : (a) + (b), CC2, dimensions non controlees, profondeur non comptee, D_lower 20 mm', () => {
    const c = lue({ ...saisieParDefaut(), generation: '2e' });
    if (c.generation !== '2e') throw new Error('2e generation attendue');
    expect(c.donnees.approche).toBe('a+b');
    expect(c.donnees.consequences).toBe('CC2');
    expect(c.donnees.dimensionsControlees).toBe(false);
    expect(c.donnees.profondeurComptee).toBe(false);
    expect(c.donnees.Dlower).toBe(20);
  });
});

describe('armatures saisies en barres', () => {
  it('section par metre : pi d2 / 4 x 1000 / e', () => {
    expect(aireParMetre(16, 150)).toBeCloseTo(1340.413, 2);
    expect(aireParMetre(12, 200)).toBeCloseTo(565.487, 2);
  });

  it('diametre nul : pas de barres, l espacement n importe pas', () => {
    expect(aireParMetre(0, 150)).toBe(0);
    const c = lue({ ...saisieParDefaut(), voileAvant: { diametre: '0', espacement: 'abc' } });
    expect(c.donnees.armatures.voileAvant).toBe(0);
  });

  it('espacement nul ou illisible refuse, en le nommant', () => {
    expect(refus({ ...saisieParDefaut(), voileArriere: { diametre: '16', espacement: '0' } })).toMatch(/espacement/);
    expect(refus({ ...saisieParDefaut(), semelleBas: { diametre: '16', espacement: 'x' } })).toMatch(/espacement/);
  });
});

describe('lecture', () => {
  it('virgule decimale acceptee', () => {
    expect(lue({ ...saisieParDefaut(), h: '3,5' }).donnees.geometrie.h).toBe(3.5);
  });

  it('un champ illisible est refuse en le nommant', () => {
    expect(refus({ ...saisieParDefaut(), h: 'abc' })).toMatch(/^h : nombre attendu/);
    expect(refus({ ...saisieParDefaut(), phi: '' })).toMatch(/nombre attendu/);
  });

  it('les champs d un mode inactif ne bloquent pas', () => {
    expect(lue({ ...saisieParDefaut(), qRd: 'abc' }).donnees.fondation.portance.mode).toBe('annexeD');
    const c = lue({ ...saisieParDefaut(), modePortance: 'saisie', qRd: '250', c: 'abc', gammaBase: 'abc', D: 'abc' });
    expect(c.donnees.fondation.portance).toEqual({ mode: 'saisie', qRd: 250 });
    expect(lue({ ...saisieParDefaut(), Dlower: 'abc' }).generation).toBe('1re');
    expect(refus({ ...saisieParDefaut(), generation: '2e', Dlower: 'abc' })).toMatch(/nombre attendu/);
  });

  it('le phi de la portance est celui du sol d assise', () => {
    const c = lue({ ...saisieParDefaut(), phiBase: '28' });
    expect(c.donnees.fondation.phi).toBe(28);
    expect(c.donnees.fondation.portance).toEqual({ mode: 'annexeD', phi: 28, c: 0, gamma: 19, D: 0.8 });
  });
});

describe('part de K_a', () => {
  it('saisie en %, lue en fraction, dans les deux generations', () => {
    for (const generation of ['1re', '2e'] as const) {
      expect(lue({ ...saisieParDefaut(), generation, partKa: '50' }).donnees.remblai.partKa).toBe(0.5);
      expect(lue({ ...saisieParDefaut(), generation, partKa: '0' }).donnees.remblai.partKa).toBe(0);
    }
  });

  it('illisible refuse ; hors de 0 a 100 refuse par le noyau', () => {
    expect(refus({ ...saisieParDefaut(), partKa: 'abc' })).toMatch(/nombre attendu/);
    expect(() => verifier(lue({ ...saisieParDefaut(), partKa: '120' }))).toThrow(/part de K_a/);
  });

  it('le calcul suit : 0 % pousse plus que 100 %', () => {
    const r0 = verifier(lue({ ...saisieParDefaut(), partKa: '0' }));
    const r1 = verifier(lue(saisieParDefaut()));
    expect(r0.combinaisons[0].glissement.H_d).toBeCloseTo(95.727, 2);
    expect(r1.combinaisons[0].glissement.H_d).toBeCloseTo(63.818, 2);
  });
});

describe('charges en bande', () => {
  it('lues dans l ordre de la saisie', () => {
    const c = lue(avecBandes());
    expect(c.donnees.remblai.q).toBe(0);
    expect(c.donnees.remblai.charges).toEqual([
      { nature: 'Q', q: 20, distance: 2.6, largeur: 1 },
      { nature: 'G', q: 10, distance: 0.4, largeur: 0.8 },
      { nature: 'G', q: 10, distance: 1.1, largeur: 1 },
    ]);
  });

  it('une valeur illisible nomme la bande', () => {
    const b = avecBandes();
    b.bandes[1] = { ...b.bandes[1], largeur: 'abc' };
    expect(refus(b)).toMatch(/bande 2/);
  });

  it('elles passent dans le calcul des deux generations', () => {
    for (const generation of ['1re', '2e'] as const) {
      const r = verifier(lue(avecBandes({ generation })));
      expect(r.combinaisons[0].pousseesCalcul.some((p) => p.origine.includes('bande 1'))).toBe(true);
    }
  });
});

describe('une seule saisie pour les deux generations', () => {
  it('basculer de generation ne change aucune valeur saisie', () => {
    const s = avecBandes({ approche1: 'DA3', approche2: 'c', consequences: 'CC3', Dlower: '16', dimensionsControlees: true });
    const a = lue({ ...s, generation: '1re' });
    const b = lue({ ...s, generation: '2e' });
    expect(a.donnees.geometrie).toEqual(b.donnees.geometrie);
    expect(a.donnees.remblai).toEqual(b.donnees.remblai);
    expect(a.donnees.fondation).toEqual(b.donnees.fondation);
    expect(a.donnees.armatures).toEqual(b.donnees.armatures);
    expect(a.donnees.approche).toBe('DA3');
    expect(b.donnees.approche).toBe('c');
  });
});

describe('enregistrement', () => {
  it('enregistrer puis relire rend la meme saisie', () => {
    const s = avecBandes({
      generation: '2e',
      approche1: 'DA2',
      approche2: 'd',
      consequences: 'CC1',
      dimensionsControlees: true,
      profondeurComptee: true,
      partKa: '50',
      modePortance: 'saisie',
      voileAvant: { diametre: '12', espacement: '200' },
    });
    expect(relire(serialiser(s))).toEqual(s);
  });

  it('format inconnu refuse', () => {
    expect(() => relire('{"format":"autre"}')).toThrow(/format/i);
  });

  it('champs absents : valeur par defaut ; bande malformee ecartee', () => {
    const s = relire(JSON.stringify({ format: 'mur-en-l/1', h: '4', bandes: [{ nature: 'X', q: '1', distance: '0', largeur: '1' }, { nature: 'G', q: '1', distance: '0', largeur: '1' }] }));
    expect(s.h).toBe('4');
    expect(s.talon).toBe(saisieParDefaut().talon);
    expect(s.generation).toBe('1re');
    expect(s.bandes).toEqual([{ nature: 'G', q: '1', distance: '0', largeur: '1' }]);
    expect(s.voileArriere).toEqual(saisieParDefaut().voileArriere);
  });
});

describe('coefficients partiels et options de methode', () => {
  it('par defaut : aucun coefficient modifie, source unique non', () => {
    const c = lue(saisieParDefaut());
    expect(c.modifs).toEqual({});
    expect(c.donnees.sourceUnique).toBe(false);
  });

  it('un coefficient saisi a la virgule est lu ; egal au recommande, il est ignore', () => {
    const c = lue({ ...saisieParDefaut(), coefficients1: { 'R2.gRv': '1,5', 'A1.gG_dst': '1,35', 'M2.gPhi': '' } });
    expect(c.modifs).toEqual({ 'R2.gRv': 1.5 });
  });

  it('la table suit la generation : celle de l autre generation est ignoree', () => {
    const c = lue({ ...saisieParDefaut(), generation: '2e', coefficients1: { 'R2.gRv': '1,5' }, coefficients2: { 'kF.CC2': '1,1' } });
    expect(c.modifs).toEqual({ 'kF.CC2': 1.1 });
  });

  it('refuse un coefficient illisible ou nul en nommant sa cle', () => {
    expect(refus({ ...saisieParDefaut(), coefficients1: { 'R2.gRv': 'abc' } })).toMatch(/R2\.gRv/);
    expect(refus({ ...saisieParDefaut(), coefficients1: { 'R2.gRv': '0' } })).toMatch(/R2\.gRv/);
  });

  it('verifier applique les coefficients : gamma_Rv = 1,0 multiplie R_d de portance par 1,4', () => {
    const base = verifier(lue({ ...saisieParDefaut(), approche1: 'DA2' })).combinaisons[0].portance.R_d;
    const mod = verifier(lue({ ...saisieParDefaut(), approche1: 'DA2', coefficients1: { 'R2.gRv': '1' } })).combinaisons[0].portance.R_d;
    expect(mod / base).toBeCloseTo(1.4, 6);
  });

  it('DA2* et la source unique passent au noyau', () => {
    const c = lue({ ...saisieParDefaut(), approche1: 'DA2*', sourceUnique: true });
    expect(c.generation === '1re' && c.donnees.approche).toBe('DA2*');
    expect(c.donnees.sourceUnique).toBe(true);
    expect(verifier(c).combinaisons[0].nom).toBe('DA2*');
  });

  it('enregistrement relu a l identique ; cles inconnues ecartees', () => {
    const s: Saisie = { ...saisieParDefaut(), approche1: 'DA2*', sourceUnique: true, coefficients1: { 'EQU.sol.gPhi': '1' }, coefficients2: { gV: '1,5' } };
    expect(relire(serialiser(s))).toEqual(s);
    const brut = JSON.parse(serialiser(s));
    brut.coefficients1 = { 'EQU.sol.gPhi': '1', inconnu: '2', 'R2.gRv': 3 };
    expect(relire(JSON.stringify(brut)).coefficients1).toEqual({ 'EQU.sol.gPhi': '1' });
  });
});
