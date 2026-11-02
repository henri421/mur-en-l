/**
 * T3 : les dessins, lus dans le SVG lui-meme.
 *
 * Classes imposees :
 *  - `rect.semelle` : la semelle ;
 *  - `g.charge-repartie` : une charge, avec `line.haut` (la ligne qui la ferme) et
 *    `line.fleche` (ses fleches, dont une a chaque extremite) ;
 *  - `line.diffusion` avec data-bord="proche" ou "eloigne" : droites de la projection ;
 *  - `.cote` et `.bras` : ce que retirent les options du dessin.
 */

import { describe, expect, it } from 'vitest';
import { constatsAffichage, nombreAffiche, tauxAffiche, texteVisible } from 'aedificium-ui';
import { saisieParDefaut, type Saisie } from '../../app/src/form';
import { baseSvg, coupe, phiDeLaVue, projectionSvg, vuesDisponibles } from '../../app/src/dessin';
import { projectionBande } from '../../src/index';
import { avecBandes, calculer, SAISIES } from './_commun';

const OPTIONS = { cotes: true, bras: true };
const attribut = (balise: string, nom: string): number => Number(new RegExp(`\\s${nom}="([^"]*)"`).exec(balise)?.[1]);
const balises = (svg: string, element: string, classe: string): string[] =>
  [...svg.matchAll(new RegExp(`<${element}\\b[^>]*>`, 'g'))].map((m) => m[0]).filter((b) => new RegExp(`class="[^"]*\\b${classe}\\b`).test(b));

/** Les groupes de charges reparties, avec leur contenu. */
function charges(svg: string): { haut: string; fleches: string[] }[] {
  return svg
    .split(/<g\b[^>]*class="[^"]*\bcharge-repartie\b[^"]*"[^>]*>/)
    .slice(1)
    .map((c) => c.slice(0, c.indexOf('</g>')))
    .map((c) => ({ haut: balises(c, 'line', 'haut')[0], fleches: balises(c, 'line', 'fleche') }));
}

const dessin = (s: Saisie, vue?: string, options = OPTIONS): string => {
  const { calcul, r } = calculer(s);
  return coupe(calcul, r, vue ?? vuesDisponibles(r)[0], options);
};

describe('vues', () => {
  it('le renversement puis chaque combinaison', () => {
    expect(vuesDisponibles(calculer(saisieParDefaut()).r)).toEqual(['EQU', 'DA1-1', 'DA1-2']);
    expect(vuesDisponibles(calculer({ ...saisieParDefaut(), generation: '2e' }).r)).toEqual(['VC2(a)', '(a) VC4 + M1', '(b) VC3 + M2']);
  });

  it('phi de la vue : celui du renversement ou de la combinaison', () => {
    const r = calculer(saisieParDefaut()).r;
    expect(phiDeLaVue(r, 'EQU')).toBeCloseTo(r.renversement.phi_d, 10);
    expect(phiDeLaVue(r, 'DA1-2')).toBeCloseTo(r.combinaisons[1].phi_d, 10);
  });
});

describe('coupe', () => {
  for (const [nom, s] of SAISIES) {
    it(`${nom} : toutes les vues, sans NaN, sans faute d affichage`, () => {
      const { calcul, r } = calculer(s);
      for (const v of vuesDisponibles(r)) {
        const svg = coupe(calcul, r, v, OPTIONS);
        expect(svg).toContain('<svg');
        expect(svg).not.toContain('NaN');
        expect(svg).not.toContain('Infinity');
        expect(constatsAffichage(texteVisible(svg))).toEqual([]);
      }
    });
  }

  it('vue du renversement : poussees de calcul du pivot', () => {
    const { calcul, r } = calculer(saisieParDefaut());
    const t = texteVisible(coupe(calcul, r, 'EQU', OPTIONS));
    for (const l of r.renversement.pivot.lignes.filter((x) => x.elementaire.origine.includes('poussée'))) {
      expect(t).toContain(nombreAffiche(l.gamma * l.F, 1));
    }
  });

  it('vue d une combinaison : ses poussees de calcul, bandes comprises', () => {
    const { calcul, r } = calculer(avecBandes());
    const c = r.combinaisons[0];
    const t = texteVisible(coupe(calcul, r, c.nom, OPTIONS));
    expect(c.pousseesCalcul.length).toBeGreaterThan(1);
    for (const p of c.pousseesCalcul) expect(t).toContain(nombreAffiche(p.F, 1));
  });

  it('options : cotes et bras de levier', () => {
    const avec = dessin(saisieParDefaut());
    expect(avec).toContain('class="cote');
    expect(avec).toContain('class="bras');
    const sans = dessin(saisieParDefaut(), undefined, { cotes: false, bras: false });
    expect(sans).not.toContain('class="cote');
    expect(sans).not.toContain('class="bras');
    expect(sans).toContain('class="semelle');
  });
});

describe('charges reparties : fermees par des fleches, a l echelle', () => {
  it('une charge pour la surcharge, une par bande ; rien sans charge', () => {
    expect(charges(dessin(saisieParDefaut()))).toHaveLength(1);
    expect(charges(dessin({ ...saisieParDefaut(), q: '0' }))).toHaveLength(0);
    expect(charges(dessin(avecBandes()))).toHaveLength(3);
    expect(charges(dessin(avecBandes({ q: '10' })))).toHaveLength(4);
  });

  it('une fleche a chaque extremite de la ligne qui ferme la charge', () => {
    for (const c of charges(dessin(avecBandes({ q: '10' })))) {
      const x1 = Math.min(attribut(c.haut, 'x1'), attribut(c.haut, 'x2'));
      const x2 = Math.max(attribut(c.haut, 'x1'), attribut(c.haut, 'x2'));
      expect(c.fleches.length).toBeGreaterThan(1);
      const xs = c.fleches.map((f) => attribut(f, 'x1'));
      expect(Math.min(...xs)).toBeCloseTo(x1, 1);
      expect(Math.max(...xs)).toBeCloseTo(x2, 1);
    }
  });

  it('largeur et position a l echelle de la semelle', () => {
    const svg = dessin(avecBandes());
    const s = balises(svg, 'rect', 'semelle')[0];
    const x0 = attribut(s, 'x');
    const echelle = attribut(s, 'width') / 2.6;
    // Bande 1 : a 2,6 m de l'arriere du voile, large de 1 m ; arriere du voile a 1,0 m du patin.
    const c = charges(svg)[0].haut;
    const g = Math.min(attribut(c, 'x1'), attribut(c, 'x2'));
    const d = Math.max(attribut(c, 'x1'), attribut(c, 'x2'));
    expect(Math.abs(g - (x0 + (1.0 + 2.6) * echelle))).toBeLessThan(1);
    expect(Math.abs(d - g - echelle)).toBeLessThan(1);
  });

  it('une bande lointaine reste dans le dessin', () => {
    const s = { ...avecBandes(), bandes: [{ nature: 'Q' as const, q: '20', distance: '12', largeur: '2' }] };
    const svg = dessin(s);
    const largeur = Number(/viewBox="[\d.-]+ [\d.-]+ ([\d.]+) /.exec(svg)?.[1]);
    const c = charges(svg)[0].haut;
    expect(largeur).toBeGreaterThan(0);
    expect(Math.max(attribut(c, 'x1'), attribut(c, 'x2'))).toBeLessThan(largeur);
  });
});

describe('fleches et symboles', () => {
  const lignes = (svg: string): string[] => [...svg.matchAll(/<line\b[^>]*>/g)].map((m) => m[0]);

  it('toute fleche de charge, de poussee, de poids ou de pression a sa pointe', () => {
    const { calcul, r } = calculer(avecBandes({ q: '10' }));
    const svgs = [
      ...vuesDisponibles(r).map((v) => coupe(calcul, r, v, OPTIONS)),
      ...vuesDisponibles(r).map((v) => baseSvg(r, v)),
      projectionSvg(calcul, 30),
    ];
    let vues = 0;
    for (const svg of svgs) {
      for (const l of lignes(svg).filter((x) => /class="(fleche|fleche-pression|poussee|poids|resultante)\b/.test(x))) {
        expect(l).toContain('marker-end="url(#ml-');
        vues++;
      }
      for (const id of [...svg.matchAll(/url\(#(ml-\w+)\)/g)].map((m) => m[1])) expect(svg).toContain(`id="${id}"`);
    }
    expect(vues).toBeGreaterThan(20);
  });

  it('la poussee d une charge variable est tiretee, celle d une permanente non', () => {
    const { calcul, r } = calculer(avecBandes({ q: '10' }));
    const svg = coupe(calcul, r, r.combinaisons[0].nom, OPTIONS);
    expect(balises(svg, 'line', 'poussee').filter((l) => l.includes('variable')).length).toBeGreaterThan(0);
    expect(balises(svg, 'line', 'poussee').filter((l) => !l.includes('variable')).length).toBeGreaterThan(0);
  });

  it('un poids de calcul nul n est pas dessine ; chaque poids a son symbole', () => {
    const t = texteVisible(dessin(saisieParDefaut()));
    expect(t).not.toMatch(/W\S* = 0 kN/);
    for (const s of ['Wv', 'Ws', 'Wt']) expect(t.replace(/_/g, '')).toContain(s);
  });

  it('le remblai ne passe pas devant le voile', () => {
    const svg = dessin({ ...saisieParDefaut(), D: '0' });
    const semelle = balises(svg, 'rect', 'semelle')[0];
    const terrains = balises(svg, 'rect', 'terrain');
    expect(terrains).toHaveLength(1);
    expect(attribut(terrains[0], 'x')).toBeGreaterThan(attribut(semelle, 'x'));
  });

  it('sans option, pas de marge vide sous le mur', () => {
    const haut = (svg: string): number => Number(/viewBox="0 0 640 ([\d.]+)"/.exec(svg)?.[1]);
    expect(haut(dessin(saisieParDefaut(), undefined, { cotes: false, bras: false }))).toBeLessThan(haut(dessin(saisieParDefaut())) - 40);
  });
});

describe('sous la semelle : valeurs', () => {
  it('R_d en kN, ramenee a B prime en kPa', () => {
    const r = calculer(saisieParDefaut()).r;
    const c = r.combinaisons[1];
    const t = texteVisible(baseSvg(r, c.nom));
    expect(t).toContain(`${nombreAffiche(c.portance.R_d, 1)} kN`);
    expect(t).toContain(`${nombreAffiche(c.portance.R_d / c.portance.Bp, 1)} kPa`);
    expect(t).toContain(`${nombreAffiche(c.portance.V / c.portance.Bp, 1)} kPa`);
  });

  it('la contrainte minimale n est pas dessinee a zero', () => {
    const r = calculer(saisieParDefaut()).r;
    const svg = baseSvg(r, 'DA1-2');
    const points = /class="contrainte" points="([^"]*)"/.exec(svg)?.[1].trim().split(' ') ?? [];
    const yDroite = Number(points[points.length - 2].split(',')[1]);
    expect(yDroite).toBeGreaterThan(80.5);
  });
});

describe('sous la semelle', () => {
  it('une combinaison : V, B prime, resistance', () => {
    const r = calculer(saisieParDefaut()).r;
    const c = r.combinaisons[0];
    const t = texteVisible(baseSvg(r, c.nom));
    expect(t).toContain(nombreAffiche(c.portance.V, 1));
    expect(t).toContain(nombreAffiche(c.portance.Bp, 2));
  });

  it('vue du renversement : la combinaison la plus severe en portance', () => {
    const r = calculer(saisieParDefaut()).r;
    const pire = r.combinaisons.reduce((a, c) => (c.portance.taux > a.portance.taux ? c : a));
    const t = texteVisible(baseSvg(r, 'EQU'));
    expect(t).toContain(pire.nom);
    expect(t).toContain(nombreAffiche(pire.portance.Bp, 2));
    expect(t).not.toContain(tauxAffiche(Number.NaN));
  });

  for (const [nom, s] of SAISIES) {
    it(`${nom} : sans NaN, sans faute d affichage`, () => {
      const r = calculer(s).r;
      for (const v of vuesDisponibles(r)) {
        const svg = baseSvg(r, v);
        expect(svg).not.toContain('NaN');
        expect(constatsAffichage(texteVisible(svg))).toEqual([]);
      }
    });
  }
});

describe('projection des bandes', () => {
  const pente = (l: string): number => Math.abs((attribut(l, 'y2') - attribut(l, 'y1')) / (attribut(l, 'x2') - attribut(l, 'x1')));
  const seule = (distance: string, largeur: string, reste: Partial<Saisie> = {}): Saisie => ({
    ...avecBandes(reste),
    bandes: [{ nature: 'Q', q: '20', distance, largeur }],
  });

  it('rien sans bande, ni pour une bande posee sur le talon', () => {
    const a = calculer(saisieParDefaut());
    expect(projectionSvg(a.calcul, 30)).toBe('');
    expect(projectionSvg(calculer(seule('0,4', '0,8')).calcul, 30)).toBe('');
  });

  it('les deux droites suivent phi et 45 + phi/2 du phi demande', () => {
    const { calcul } = calculer(seule('2,6', '1'));
    for (const phi of [30, 24.79]) {
      const svg = projectionSvg(calcul, phi);
      const r = (phi * Math.PI) / 180;
      expect(pente(balises(svg, 'line', 'diffusion').find((l) => l.includes('data-bord="proche"')) as string) / Math.tan(r)).toBeCloseTo(1, 1);
      expect(pente(balises(svg, 'line', 'diffusion').find((l) => l.includes('data-bord="eloigne"')) as string) / Math.tan(Math.PI / 4 + r / 2)).toBeCloseTo(1, 1);
    }
  });

  it('une droite eloignee par bande depassant le talon ; z1, z2 affiches ; methode annoncee', () => {
    const { calcul, r } = calculer(avecBandes());
    const phi = phiDeLaVue(r, 'DA1-1');
    const svg = projectionSvg(calcul, phi);
    // Bande 1 au-dela, bande 2 sur le talon, bande 3 a cheval (son bord proche part de l'ecran).
    expect(balises(svg, 'line', 'diffusion').filter((l) => l.includes('data-bord="eloigne"'))).toHaveLength(2);
    const p = projectionBande(1, 1, (phi * Math.PI) / 180, r.Ht);
    const t = texteVisible(svg);
    expect(t).toContain(nombreAffiche(p?.z1 as number, 2));
    expect(t).toContain(nombreAffiche(p?.z2 as number, 2));
    expect(t).toContain("EN 1997");
  });

  it('une bande proche de l ecran n etire pas le dessin', () => {
    const svg = projectionSvg(calculer(seule('1,6', '0,1')).calcul, 30);
    expect(Number(/viewBox="0 0 640 ([\d.]+)"/.exec(svg)?.[1])).toBeLessThan(420);
  });

  it('une diffusion qui passe sous l ecran ne casse rien', () => {
    const { calcul } = calculer(seule('30', '2'));
    const svg = projectionSvg(calcul, 30);
    expect(svg).not.toContain('NaN');
    expect(balises(svg, 'line', 'diffusion')).toHaveLength(0);
  });

  for (const [nom, s] of SAISIES) {
    it(`${nom} : sans NaN, sans faute d affichage`, () => {
      const { calcul, r } = calculer(s);
      const svg = projectionSvg(calcul, phiDeLaVue(r, vuesDisponibles(r)[0]));
      expect(svg).not.toContain('NaN');
      expect(constatsAffichage(texteVisible(svg))).toEqual([]);
    });
  }
});
