/** T4 : la note commune d'aedificium-ui, sans verdict global ; la coupe exportee. */

import { describe, expect, it } from 'vitest';
import { constatsAffichage, noteDeCalculHtml, texteVisible, type ElementNote } from 'aedificium-ui';
import { saisieParDefaut, type Saisie } from '../../app/src/form';
import { blocEntrees, messageDErreur } from '../../app/src/vue';
import { coupe, projectionSvg, vuesDisponibles } from '../../app/src/dessin';
import { noteDuCalcul } from '../../app/src/note';
import { STYLES_TRACE } from '../../app/src/export';
import { avecBandes, calculer, lire, SAISIES } from './_commun';

const CARTOUCHE = { projet: 'Quai', element: 'Mur M1', date: '2026-11-03' };

function preparer(s: Saisie) {
  const { calcul, r } = calculer(s);
  return { calcul, r, note: noteDuCalcul(calcul, r, CARTOUCHE) };
}

const symboles = (els: ElementNote[] | undefined): string[] => (els ?? []).flatMap((e) => (e.type === 'bloc' ? e.bloc.lignes.map((l) => l.symbole) : []));
const titres = (els: ElementNote[] | undefined): string[] => (els ?? []).flatMap((e) => (e.type === 'bloc' ? [e.bloc.titre] : []));
const figures = (els: ElementNote[] | undefined) => (els ?? []).filter((e) => e.type === 'figure');

describe('cartouche', () => {
  it('projet, element, date, outil', () => {
    const { cartouche } = preparer(saisieParDefaut()).note;
    expect(cartouche.projet).toBe('Quai');
    expect(cartouche.element).toBe('Mur M1');
    expect(cartouche.date).toBe('2026-11-03');
    expect(cartouche.outil).toBe('mur-en-l');
  });

  it('normes de la generation', () => {
    expect(preparer(saisieParDefaut()).note.cartouche.norme).toBe('EN 1997-1:2004, EN 1992-1-1:2004');
    expect(preparer({ ...saisieParDefaut(), generation: '2e' }).note.cartouche.norme).toBe('EN 1997-1:2024, EN 1997-3:2025, EN 1990:2023, EN 1992-1-1:2023');
  });

  it('element vide : Mur en L', () => {
    const { calcul, r } = calculer(saisieParDefaut());
    expect(noteDuCalcul(calcul, r, { ...CARTOUCHE, element: ' ' }).cartouche.element).toBe('Mur en L');
  });

  it('le texte est echappe', () => {
    const { calcul, r } = calculer(saisieParDefaut());
    const h = noteDeCalculHtml(noteDuCalcul(calcul, r, { ...CARTOUCHE, projet: 'Quai <test>' }), STYLES_TRACE);
    expect(h).toContain('Quai &lt;test&gt;');
    expect(h).not.toContain('Quai <test>');
  });
});

describe('sections', () => {
  for (const generation of ['1re', '2e'] as const) {
    it(`ordre fixe, generation ${generation}`, () => {
      const html = noteDeCalculHtml(preparer({ ...saisieParDefaut(), generation }).note, STYLES_TRACE);
      expect([...html.matchAll(/<h2>([^<]*)<\/h2>/g)].map((x) => x[1])).toEqual([
        '1. Géométrie',
        '2. Matériaux',
        '3. Hypothèses',
        '4. Cas de charges',
        '5. Calculs et vérifications',
        '6. Conclusions',
      ]);
    });

    it(`toutes les lignes d entree rangees une fois, generation ${generation}`, () => {
      const { calcul, note } = preparer(avecBandes({ generation }));
      const s = note.sections;
      const ranges = [...symboles(s.geometrie), ...symboles(s.materiaux), ...symboles(s.hypotheses), ...symboles(s.charges)];
      expect([...ranges].sort()).toEqual(blocEntrees(calcul).lignes.map((l) => l.symbole).sort());
    });
  }

  it('chaque ligne a sa place', () => {
    const s = preparer(avecBandes({ q: '10' })).note.sections;
    for (const x of ['h', 'patin', 'talon']) expect(symboles(s.geometrie)).toContain(x);
    for (const x of ['f_ck', 'f_yk']) expect(symboles(s.materiaux)).toContain(x);
    for (const x of ['q', 'bande 1', 'bande 3']) expect(symboles(s.charges)).toContain(x);
  });

  it('geometrie : la coupe de la premiere vue, cotee, et rien de plus sans bande', () => {
    const { calcul, r, note } = preparer(saisieParDefaut());
    const f = figures(note.sections.geometrie);
    expect(f).toHaveLength(1);
    if (f[0].type === 'figure') expect(f[0].svg).toBe(coupe(calcul, r, vuesDisponibles(r)[0], { cotes: true, bras: true }));
  });

  it('charges : la projection dans la section des charges, si une bande depasse le talon', () => {
    const { calcul, r, note } = preparer(avecBandes());
    const f = figures(note.sections.charges);
    expect(f).toHaveLength(1);
    if (f[0].type === 'figure') expect(f[0].svg).toBe(projectionSvg(calcul, r.combinaisons[0].phi_d));
    expect(figures(preparer(saisieParDefaut()).note.sections.charges)).toHaveLength(0);
  });

  it('hypotheses : valeurs recommandees et absence d annexe nationale belge annoncees', () => {
    for (const generation of ['1re', '2e'] as const) {
      const h = preparer({ ...saisieParDefaut(), generation }).note.sections.hypotheses ?? [];
      expect(h.some((e) => e.type === 'liste')).toBe(true);
      expect(h.some((e) => e.type === 'texte' && e.texte.includes('annexe nationale'))).toBe(true);
    }
    const h2 = noteDeCalculHtml(preparer({ ...saisieParDefaut(), generation: '2e' }).note, STYLES_TRACE);
    expect(texteVisible(h2)).toContain('CC2');
  });

  it('calculs : renversement, puis un bloc par combinaison, puis les sections', () => {
    const { r, note } = preparer(saisieParDefaut());
    const t = titres(note.sections.calculs);
    expect(t[0]).toContain('Renversement');
    for (const c of r.combinaisons) expect(t.some((x) => x.includes(c.nom))).toBe(true);
    expect(t.some((x) => x.toLowerCase().includes('sections'))).toBe(true);
  });
});

describe('conclusions', () => {
  for (const [nom, s] of SAISIES) {
    it(`${nom} : une ligne par verification, taux du noyau`, () => {
      const { r, note } = preparer(s);
      const n = r.combinaisons.length;
      // Renversement, excentricite ; glissement et portance ; flexion, tranchant, armature minimale des trois sections.
      expect(note.verifications).toHaveLength(2 + n * (2 + 9));
      for (const v of note.verifications) {
        expect(v.nom).not.toMatch(/EN \d/);
        expect((v.clause ?? '').trim().length).toBeGreaterThan(0);
        expect(v.ok).toBe(typeof v.taux === 'number' && Number.isFinite(v.taux) && v.taux <= 1);
      }
      const taux = note.verifications.map((v) => v.taux);
      expect(taux).toContain(r.renversement.taux);
      expect(taux).toContain(r.excentricite.taux);
      for (const c of r.combinaisons) {
        expect(taux).toContain(c.glissement.taux);
        expect(taux).toContain(c.portance.taux);
        expect(taux).toContain(c.talon.tauxFlexion);
      }
    });
  }

  it('la combinaison figure dans le nom', () => {
    const { note } = preparer(saisieParDefaut());
    expect(note.verifications.some((v) => v.nom.includes('DA1-2'))).toBe(true);
  });

  it('aucun verdict global', () => {
    const t = texteVisible(noteDeCalculHtml(preparer(saisieParDefaut()).note, STYLES_TRACE));
    expect(t).not.toContain('Conforme');
    expect(t).not.toContain('Non conforme');
    expect(t).toContain('Vérification déterminante');
  });

  it('avertissements du noyau repris, celui des bandes compris', () => {
    const { r, note } = preparer(avecBandes());
    expect(note.avertissements).toEqual(r.avertissements.map(messageDErreur));
    expect((note.avertissements ?? []).some((a) => a.includes("absente de l'EN 1997"))).toBe(true);
  });
});

describe('texte visible de la note', () => {
  for (const [nom, s] of SAISIES) {
    it(nom, () => {
      const h = noteDeCalculHtml(preparer(s).note, STYLES_TRACE);
      expect(h).not.toContain('NaN');
      expect(constatsAffichage(texteVisible(h))).toEqual([]);
    });
  }
});

describe('export', () => {
  it('STYLES_TRACE porte les traits du dessin', () => {
    expect(STYLES_TRACE).toContain('.semelle');
    expect(STYLES_TRACE).toContain('.fleche');
    expect(STYLES_TRACE).toContain('.diffusion');
  });

  it('main.ts exporte note, coupe et CSV', () => {
    const main = lire('../../app/src/main.ts');
    expect(main).toContain('svgAutonome(');
    expect(main).toContain('resultatsEnCsv(');
    expect(main).toContain('ouvrirOuTelecharger(');
  });
});
