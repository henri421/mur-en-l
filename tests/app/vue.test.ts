/** T2 : verdicts, volets, blocs du CSV. Tout vient du resultat du noyau. */

import { describe, expect, it } from 'vitest';
import { NOMS_GRECS, blocsEnTexte, constatsAffichage, notationHtml, nombreAffiche, resultatsEnCsv, tauxAffiche, texteVisible } from 'aedificium-ui';
import { saisieParDefaut } from '../../app/src/form';
import { blocEntrees, blocsResultat, coefficientsHtml, messageDErreur, verdictsHtml, voletsHtml } from '../../app/src/vue';
import { avecBandes, calculer, SAISIES } from './_commun';

const GROUPES = ['externe', 'sections', 'dispositions'];
const max = (l: number[]): number => l.reduce((a, v) => (v > a ? v : a));

/** Contenu d'un groupe de verdicts : `<section class="groupe-verdicts" data-groupe="...">`. */
function groupe(html: string, nom: string): string {
  const i = html.indexOf(`data-groupe="${nom}"`);
  expect(i).toBeGreaterThan(-1);
  const fin = html.indexOf('</section>', i);
  return html.slice(i, fin < 0 ? undefined : fin);
}

describe('verdicts', () => {
  const def = calculer(saisieParDefaut()).r;
  const html = verdictsHtml(def);

  it('trois groupes distincts, dans l ordre', () => {
    const ordre = [...html.matchAll(/data-groupe="([a-z]+)"/g)].map((m) => m[1]);
    expect(ordre).toEqual(GROUPES);
  });

  it('aucun verdict global', () => {
    const t = texteVisible(html);
    expect(t).not.toMatch(/\bConforme\b/);
    expect(t).not.toMatch(/Non conforme/);
    expect(t).not.toContain(def.motif);
  });

  it('stabilite externe : renversement, glissement, portance, excentricite, le pire de chaque', () => {
    const t = texteVisible(groupe(html, 'externe'));
    expect(t).toContain('Renversement');
    expect(t).toContain('Glissement');
    expect(t).toContain('Portance');
    expect(t).toContain('Excentricité');
    expect(t).toContain(tauxAffiche(def.renversement.taux));
    expect(t).toContain(tauxAffiche(def.excentricite.taux));
    expect(t).toContain(tauxAffiche(max(def.combinaisons.map((c) => c.glissement.taux))));
    expect(t).toContain(tauxAffiche(max(def.combinaisons.map((c) => c.portance.taux))));
    // La combinaison qui gouverne le glissement du cas de reference.
    expect(t).toContain('DA1-2');
  });

  it('sections : flexion et tranchant du voile, du patin, du talon, le pire des combinaisons', () => {
    const t = texteVisible(groupe(html, 'sections'));
    for (const s of ['voile', 'patin', 'talon'] as const) {
      expect(t.toLowerCase()).toContain(s);
      expect(t).toContain(tauxAffiche(max(def.combinaisons.map((c) => c[s].tauxFlexion))));
      expect(t).toContain(tauxAffiche(max(def.combinaisons.map((c) => c[s].tauxTranchant))));
    }
  });

  it('dispositions : armature minimale, A_s et A_s,min', () => {
    const t = texteVisible(groupe(html, 'dispositions'));
    expect(t.toLowerCase()).toContain('armature minimale');
    expect(t).toContain(nombreAffiche(def.combinaisons[0].voile.As_min, 0));
    expect(t).toContain(nombreAffiche(def.combinaisons[0].voile.As, 0));
  });

  it('clauses de la generation', () => {
    const t1 = texteVisible(html);
    expect(t1).toContain('§6.5.3');
    expect(t1).toContain('annexe D');
    expect(t1).toContain('EQU');
    const t2 = texteVisible(verdictsHtml(calculer({ ...saisieParDefaut(), generation: '2e' }).r));
    expect(t2).toContain('§5.6.4');
    expect(t2).toContain('annexe B.4');
    expect(t2).toContain('VC2(a)');
    expect(t2).not.toContain('EQU');
    expect(t2).not.toContain('annexe D');
  });

  it('un taux depasse est marque, dans son groupe seulement', () => {
    const r = calculer({ ...saisieParDefaut(), generation: '2e', approche2: 'c' }).r;
    expect(r.tauxExterne).toBeGreaterThan(1);
    const h = verdictsHtml(r);
    expect(groupe(h, 'externe')).toContain('depasse');
    expect(groupe(h, 'sections')).not.toContain('depasse');
  });

  it('jauges bornees : jamais de NaN ni de largeur au-dela de 100 %', () => {
    for (const [, s] of SAISIES) {
      const h = verdictsHtml(calculer(s).r);
      expect(h).not.toContain('NaN');
      expect(h).not.toContain('Infinity');
      for (const m of h.matchAll(/width:\s*([\d.]+)%/g)) expect(Number(m[1])).toBeLessThan(100.01);
    }
  });

  it('avertissements du noyau repris, celui des bandes compris', () => {
    const r = calculer(avecBandes()).r;
    expect(r.avertissements.length).toBeGreaterThan(0);
    const t = texteVisible(verdictsHtml(r));
    for (const a of r.avertissements) expect(t).toContain(texteVisible(notationHtml(a)));
    expect(t).toContain("absente de l'EN 1997");
  });
});

describe('volets', () => {
  for (const [nom, s] of SAISIES) {
    it(`${nom} : combinaisons, quatre cas, sections, sans NaN`, () => {
      const r = calculer(s).r;
      const h = voletsHtml(r);
      expect(h).not.toContain('NaN');
      expect((h.match(/<details/g) ?? []).length).toBeGreaterThan(3);
      const t = texteVisible(h);
      for (const c of r.combinaisons) {
        expect(t).toContain(c.nom);
        for (const x of c.cas) expect(t).toContain(x.nom);
      }
    });
  }

  it('renversement : une ligne par action, bras et moment', () => {
    const r = calculer(avecBandes()).r;
    const t = texteVisible(voletsHtml(r));
    for (const l of r.renversement.pivot.lignes) {
      expect(t).toContain(l.elementaire.origine);
      expect(t).toContain(nombreAffiche(l.Md, 2));
    }
  });

  it('le cas qui gouverne est surligne dans chaque combinaison', () => {
    const r = calculer(saisieParDefaut()).r;
    expect((voletsHtml(r).match(/class="gouverne"/g) ?? []).length).toBeGreaterThan(r.combinaisons.length - 1);
  });

  it('sections : efforts et resistances', () => {
    const r = calculer(saisieParDefaut()).r;
    const t = texteVisible(voletsHtml(r));
    const v = r.combinaisons[0].voile;
    expect(t).toContain(nombreAffiche(v.M_Ed, 1));
    expect(t).toContain(nombreAffiche(v.M_Rd, 1));
    expect(t).toContain(nombreAffiche(v.V_Rd_c, 1));
  });
});

describe('blocs : donnees et resultats', () => {
  it('entrees : generation, approche, bandes numerotees', () => {
    const { calcul } = calculer(avecBandes());
    const b = blocEntrees(calcul);
    const symboles = b.lignes.map((l) => l.symbole);
    expect(new Set(symboles).size).toBe(symboles.length);
    for (const s of ['h', 'patin', 'talon', 'f_ck', 'f_yk', 'bande 1', 'bande 2', 'bande 3']) expect(symboles).toContain(s);
    const bande = b.lignes.find((l) => l.symbole === 'bande 1');
    expect(bande?.valeur).toContain('Q');
    expect(bande?.valeur).toContain('20 kPa');
    expect(bande?.valeur).toContain('2,6 m');
  });

  it('entrees : champs propres a la generation seulement', () => {
    const t1 = JSON.stringify(blocEntrees(calculer(saisieParDefaut()).calcul));
    expect(t1).toContain('DA1');
    expect(t1).not.toContain('CC2');
    const t2 = JSON.stringify(blocEntrees(calculer({ ...saisieParDefaut(), generation: '2e' }).calcul));
    expect(t2).toContain('CC2');
    expect(t2).not.toContain('DA1');
  });

  it('entrees : la part de K_a figure', () => {
    const t = JSON.stringify(blocEntrees(calculer({ ...saisieParDefaut(), partKa: '50' }).calcul));
    expect(t).toContain('K_a');
    expect(t).toContain('50 %');
  });

  it('armatures : la saisie en barres figure avec sa section', () => {
    const t = JSON.stringify(blocEntrees(calculer(saisieParDefaut()).calcul));
    expect(t).toContain('16');
    expect(t).toContain('150');
    expect(t).toContain(nombreAffiche(1340.41, 0));
  });

  it('resultats : les taux des trois groupes', () => {
    const r = calculer(saisieParDefaut()).r;
    const t = JSON.stringify(blocsResultat(r));
    expect(t).toContain(tauxAffiche(r.tauxExterne));
    expect(t).toContain(tauxAffiche(r.tauxSections));
    expect(t).toContain(tauxAffiche(r.tauxDispositions));
  });

  for (const [nom, s] of SAISIES) {
    it(`CSV ${nom} : texte brut`, () => {
      const { calcul, r } = calculer(s);
      const c = resultatsEnCsv(blocsEnTexte([blocEntrees(calcul), ...blocsResultat(r)]));
      expect(c).not.toContain('_');
      expect(c).not.toMatch(NOMS_GRECS);
      expect(c).not.toContain('<');
      expect(c).not.toContain('NaN');
    });
  }
});

describe('texte visible : notations, arrondis, accents', () => {
  for (const [nom, s] of SAISIES) {
    it(nom, () => {
      const { calcul, r } = calculer(s);
      const html = [verdictsHtml(r), voletsHtml(r)].join('');
      expect(constatsAffichage(texteVisible(html))).toEqual([]);
      expect(constatsAffichage(texteVisible(notationHtml(blocEntrees(calcul).titre)))).toEqual([]);
    });
  }

  it('message d erreur : celui du noyau', () => {
    expect(messageDErreur(new Error('La hauteur du voile doit être un nombre strictement positif (m).'))).toContain('hauteur du voile');
    expect(messageDErreur('texte')).toBe('texte');
  });
});

describe('coefficients partiels', () => {
  it('un champ par coefficient modifiable, valeur recommandee rappelee', () => {
    const html = coefficientsHtml(saisieParDefaut());
    expect(html).toContain('data-coef="EQU.sol.gPhi"');
    expect(html).toContain('data-coef="beton.cRdc"');
    expect(html).not.toContain('gQ_stb');
    expect(html).toContain('placeholder="1,25"');
    expect(html).toContain('data-action="coefficients-recommandes"');
    expect(html).toContain('valeurs recommandées');
  });

  it('2e generation : facteurs par classe et gamma_V', () => {
    const html = coefficientsHtml({ ...saisieParDefaut(), generation: '2e' });
    expect(html).toContain('data-coef="kF.CC2"');
    expect(html).toContain('data-coef="gV"');
  });

  it('le resume compte les valeurs differentes de la recommandee', () => {
    expect(coefficientsHtml({ ...saisieParDefaut(), coefficients1: { 'R2.gRv': '1,5', 'R2.gRh': '1,1' } })).toContain('1 modifié');
  });

  it('les entrees listent chaque coefficient modifie avec sa valeur recommandee', () => {
    const { calcul } = calculer({ ...saisieParDefaut(), coefficients1: { 'EQU.sol.gPhi': '1' } });
    const l = blocEntrees(calcul).lignes.find((x) => x.symbole === "γ_phi'");
    expect(l?.libelle).toContain('EQU, sol');
    expect(l?.valeur).toBe('1 (recommandée : 1,25)');
    const r = blocEntrees(calculer(saisieParDefaut()).calcul).lignes.find((x) => x.symbole === 'coefficients');
    expect(r?.valeur).toBe('valeurs recommandées');
  });
});
