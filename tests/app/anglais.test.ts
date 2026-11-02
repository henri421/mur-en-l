/** T5 : page `en/index.html` de meme squelette, et aucun reste de francais en anglais. */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { blocsEnTexte, constatsAffichage, contenuBalise, definirLangue, noteDeCalculHtml, notationHtml, resultatsEnCsv, texteVisible } from 'aedificium-ui';
import { lireSaisie, relire, saisieParDefaut } from '../../app/src/form';
import { blocEntrees, blocsResultat, messageDErreur, verdictsHtml, voletsHtml } from '../../app/src/vue';
import { baseSvg, coupe, phiDeLaVue, projectionSvg, vuesDisponibles } from '../../app/src/dessin';
import { noteDuCalcul } from '../../app/src/note';
import { STYLES_TRACE } from '../../app/src/export';
import { textes } from '../../app/src/textes';
import { verifierMur, verifierMur2e, profil2eRecommande, profilRecommande, type DonneesMur, type DonneesMur2e } from '../../src/index';
import { avecBandes, calculer, lire, SAISIES } from './_commun';

const controler = (nom: string, html: string): string[] => constatsAffichage(texteVisible(html), { langue: 'en' }).map((c) => `${nom} : ${c}`);

function squelette(html: string): string[] {
  return [...html.matchAll(/\s(id|data-[a-z-]+|type|inputmode|accept)="([^"]*)"/g)].map((m) => `${m[1]}=${m[2]}`);
}

function erreur(f: () => unknown): string {
  try {
    f();
  } catch (e) {
    return messageDErreur(e);
  }
  throw new Error('une erreur etait attendue');
}

describe('page anglaise', () => {
  const fr = lire('../../app/index.html');
  const en = lire('../../app/en/index.html');

  it('meme squelette que la page francaise', () => {
    expect(squelette(en)).toEqual(squelette(fr));
  });

  it('langue, script commun, liens entre les deux versions', () => {
    expect(en).toContain('<html lang="en">');
    expect(en).toContain('src="../src/main.ts"');
    expect(en).toMatch(/class="barre-langue" href="\.\.\/"/);
    expect(fr).toMatch(/class="barre-langue" href="en\/"/);
  });

  it('titre anglais, aucun reste de francais', () => {
    expect(contenuBalise(en, 'h1')).toBe('L-shaped retaining wall');
    expect(controler('page', en.replace(/lang="fr"[^>]*>FR</, '>'))).toEqual([]);
  });
});

describe('affichage en anglais', () => {
  beforeEach(() => definirLangue('en'));
  afterEach(() => definirLangue('fr'));

  for (const [nom, s] of SAISIES) {
    it(`${nom} : ecran, dessins, note, CSV`, () => {
      const { calcul, r } = calculer(s);
      const constats: string[] = [];
      constats.push(...controler('verdicts', verdictsHtml(r)));
      constats.push(...controler('volets', voletsHtml(r)));
      for (const v of vuesDisponibles(r)) {
        constats.push(...controler(`coupe ${v}`, coupe(calcul, r, v, { cotes: true, bras: true })));
        constats.push(...controler(`base ${v}`, baseSvg(r, v)));
        constats.push(...controler(`projection ${v}`, projectionSvg(calcul, phiDeLaVue(r, v))));
      }
      constats.push(...controler('note', noteDeCalculHtml(noteDuCalcul(calcul, r, { projet: 'Quay', element: '', date: '2026-11-03' }), STYLES_TRACE)));
      const csv = resultatsEnCsv(blocsEnTexte([blocEntrees(calcul), ...blocsResultat(r)]));
      constats.push(...constatsAffichage(csv, { langue: 'en' }).map((c) => `csv : ${c}`));
      expect(constats).toEqual([]);
    });
  }

  it('titre de la note, normes inchangees', () => {
    const { calcul, r } = calculer(saisieParDefaut());
    const n = noteDuCalcul(calcul, r, { projet: '', element: ' ', date: '2026-11-03' });
    expect(n.cartouche.element).toBe('L-shaped wall');
    expect(n.cartouche.norme).toBe('EN 1997-1:2004, EN 1992-1-1:2004');
  });

  it('nombres a point decimal', () => {
    const { r } = calculer(saisieParDefaut());
    expect(texteVisible(verdictsHtml(r))).toMatch(/0\.973/);
    expect(resultatsEnCsv(blocsEnTexte(blocsResultat(r)))).toContain('Block,Symbol,Quantity,Value');
  });

  it('messages et erreurs du noyau traduits', () => {
    const lue = lireSaisie(saisieParDefaut());
    if (!lue.ok) throw new Error(lue.message);
    const d = lue.calcul.donnees as DonneesMur;
    const P1 = profilRecommande();
    const v1 = (x: Partial<DonneesMur>) => () => verifierMur({ ...d, ...x }, P1);
    const d2 = { ...d, approche: 'a+b', consequences: 'CC2', dimensionsControlees: false, profondeurComptee: false, Dlower: 20 } as DonneesMur2e;
    const v2 = (x: Partial<DonneesMur2e>) => () => verifierMur2e({ ...d2, ...x }, profil2eRecommande());
    const g = d.geometrie;
    const r = d.remblai;
    const lectures = [
      lireSaisie({ ...saisieParDefaut(), h: 'abc' }),
      lireSaisie({ ...saisieParDefaut(), voileArriere: { diametre: '16', espacement: '0' } }),
      lireSaisie({ ...avecBandes(), bandes: [{ nature: 'Q', q: 'x', distance: '0', largeur: '1' }] }),
    ];
    const messages = [
      ...lectures.flatMap((l) => (l.ok ? [] : [l.message])),
      erreur(() => relire('{"format":"autre"}')),
      erreur(v1({ geometrie: { ...g, h: 0 } })),
      erreur(v1({ geometrie: { ...g, es: 0 } })),
      erreur(v1({ geometrie: { ...g, eHaut: 0 } })),
      erreur(v1({ geometrie: { ...g, eBas: 0.2 } })),
      erreur(v1({ geometrie: { ...g, patin: -1 } })),
      erreur(v1({ geometrie: { ...g, talon: 0 } })),
      erreur(v1({ geometrie: { ...g, talon: 0.5 } })),
      erreur(v1({ gammaBeton: 0 })),
      erreur(v1({ remblai: { ...r, gamma: 0 } })),
      erreur(v1({ remblai: { ...r, phi: 95 } })),
      erreur(v1({ remblai: { ...r, q: -1 } })),
      erreur(v1({ remblai: { ...r, charges: [{ nature: 'Q', q: -1, distance: 0, largeur: 1 }] } })),
      erreur(v1({ remblai: { ...r, charges: [{ nature: 'Q', q: 1, distance: -1, largeur: 1 }] } })),
      erreur(v1({ remblai: { ...r, charges: [{ nature: 'Q', q: 1, distance: 0, largeur: 0 }] } })),
      erreur(v1({ fondation: { ...d.fondation, deltaSurPhi: 0 } })),
      erreur(v1({ fondation: { ...d.fondation, portance: { mode: 'saisie', qRd: 0 } } })),
      erreur(v1({ fondation: { ...d.fondation, portance: { mode: 'annexeD', phi: 30, c: -1, gamma: 19, D: 0.8 } } })),
      erreur(v1({ fondation: { ...d.fondation, portance: { mode: 'annexeD', phi: 30, c: 0, gamma: 0, D: 0.8 } } })),
      erreur(v1({ fondation: { ...d.fondation, portance: { mode: 'annexeD', phi: 30, c: 0, gamma: 19, D: -1 } } })),
      erreur(v1({ armatures: { ...d.armatures, fck: 0 } })),
      erreur(v2({ Dlower: 4 })),
      erreur(v2({ fondation: { ...d.fondation, deltaSurPhi: 1.2 } })),
      erreur(v2({ fondation: { ...d.fondation, deltaSurPhi: 0.2 } })),
      textes().messages.rienAExporter,
      textes().messages.nouvelleVersion,
    ];
    expect(messages.flatMap((m, i) => controler(`message ${i} « ${m} »`, notationHtml(m)))).toEqual([]);
  });

  it('avertissements du noyau traduits', () => {
    const { r } = calculer(avecBandes({ generation: '2e' }));
    const h = verdictsHtml(r);
    expect(texteVisible(h)).toContain('EN 1997');
    expect(controler('alertes', h)).toEqual([]);
  });
});
