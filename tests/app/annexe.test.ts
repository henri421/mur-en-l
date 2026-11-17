// Lot E (audit R4) : annexe luxembourgeoise de la 1re generation (EC7 presume, alpha_cc = 0,85).
import { describe, expect, it } from 'vitest';
import { noteDeCalculHtml, texteVisible } from 'aedificium-ui';
import { profilRecommande } from '../../src/index';
import { alphaCcDe, normeEc2De, profilMurDe } from '../../app/src/annexe';
import { relire, saisieParDefaut, serialiser } from '../../app/src/form';
import { noteDuCalcul } from '../../app/src/note';
import { calculer } from './_commun';

const CARTOUCHE = { projet: 'P', element: 'E', date: '2026-11-17' };

describe('annexe nationale du mur en L', () => {
  it('profil EC7 luxembourgeois : valeurs recommandees, sources AN-LU ; alpha_cc = 0,85', () => {
    const lu = profilMurDe('lu');
    const rec = profilRecommande();
    expect(lu.M2.gPhi.valeur).toBe(rec.M2.gPhi.valeur);
    expect(lu.R2.gRv.valeur).toBe(rec.R2.gRv.valeur);
    expect(lu.A1.gG_dst.source).toMatch(/^ILNAS-EN 1997-1\/AN-LU:2020, tableau A\.3 : valeur recommandée présumée retenue/);
    expect(lu.EQU.sol.gPhi.source).toMatch(/tableau A\.2/);
    expect(profilMurDe('recommande')).toEqual(rec);
    expect(alphaCcDe('lu').valeur).toBe(0.85);
    expect(normeEc2De('lu').alphaCc).toBe(0.85);
    expect(normeEc2De('recommande').alphaCc).toBe(1);
  });

  it('choix enregistre et relu, recommande par defaut', () => {
    expect(saisieParDefaut().annexe).toBe('recommande');
    expect(relire(serialiser({ ...saisieParDefaut(), annexe: 'lu' })).annexe).toBe('lu');
    expect(relire(serialiser({ ...saisieParDefaut(), annexe: 'xx' as never })).annexe).toBe('recommande');
  });

  it('Luxembourg : calcul different (alpha_cc), note qui le dit et avertit', () => {
    const rec = calculer({ ...saisieParDefaut(), generation: '1re' });
    const lu = calculer({ ...saisieParDefaut(), generation: '1re', annexe: 'lu' });
    expect(JSON.stringify(lu.r)).not.toBe(JSON.stringify(rec.r));
    const note = noteDuCalcul(lu.calcul, lu.r, CARTOUCHE);
    expect(note.cartouche.norme).toContain('AN-LU:2020');
    expect(note.avertissements?.some((a) => /^Annexe nationale luxembourgeoise/.test(a))).toBe(true);
    const texte = texteVisible(noteDeCalculHtml(note, ''));
    expect(texte).toContain('ILNAS-EN 1992-1-1/AN-LU:2020, 3.1.6(1)P');
    expect(texte).toMatch(/0,85/);
    const noteRec = noteDuCalcul(rec.calcul, rec.r, CARTOUCHE);
    expect(noteRec.avertissements?.some((a) => /luxembourgeoise/.test(a))).toBe(false);
  });
});
