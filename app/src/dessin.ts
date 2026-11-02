/**
 * Les dessins de l'interface : coupe du mur, contrainte sous la semelle,
 * projection des bandes. PUR : tout est calcule au moment du rendu, aucun
 * texte n'est lu au chargement du module.
 *
 * Aucun `NaN` ni `Infinity` ne doit atteindre un attribut : tout passe par
 * `attr`, et tout texte de SVG par `notationSvg`.
 */

import { nombreAffiche, notationSvg } from 'aedificium-ui';
import { contrainteSol, projectionBande } from '../../src/index';
import type { ResultatMur } from '../../src/mur';
import { phrase, textes } from './textes';

export interface OptionsDessin {
  cotes: boolean;
  bras: boolean;
}

type Bande = { nature: string; q: number; distance: number; largeur: number };

/**
 * Les donnees du calcul utiles au dessin. Structurelles pour rester
 * compatibles avec le `Calcul` de l'application.
 */
export type Calcul = {
  generation: string;
  donnees: {
    geometrie: {
      h: number;
      eHaut: number;
      eBas: number;
      es: number;
      patin: number;
      talon: number;
    };
    remblai: {
      q: number;
      charges?: readonly Bande[];
    };
    fondation?: { portance?: { mode: string; D?: number } };
  };
  barres: unknown;
};

const LARGEUR = 640;

/** Nombre affiche ; 0 pour une valeur absente ou non finie. */
const nb = (v: number | undefined, decimales: number): string => {
  const n = Number(v);
  return nombreAffiche(Number.isFinite(n) ? n : 0, decimales);
};

/** Attribut numerique, jamais `NaN` ni `Infinity`. */
const attr = (v: number): string => (Number.isFinite(v) ? String(Number(v.toFixed(2))) : '0');

/** Tout texte de SVG. */
const tx = (s: string): string => notationSvg(s);

/** Nom de la premiere vue : celle du renversement. */
const premiereVue = (r: ResultatMur): string => r.renversement.cas ?? 'EQU';

/** Les bandes de charge du remblai, eventuellement vides. */
const bandesDe = (calcul: Calcul): readonly Bande[] => calcul.donnees.remblai.charges ?? [];

/** Les vues offertes : le renversement, puis chaque combinaison. */
export function vuesDisponibles(r: ResultatMur): string[] {
  return [premiereVue(r), ...r.combinaisons.map((c) => c.nom)];
}

/** phi' de calcul de la vue demandee, en degres. */
export function phiDeLaVue(r: ResultatMur, vue: string): number {
  if (vue === premiereVue(r)) return r.renversement.phi_d;
  const c = r.combinaisons.find((x) => x.nom === vue);
  return c ? c.phi_d : r.renversement.phi_d;
}

/** Les pointes de fleches et le sol d'assise, partages par les dessins. */
const DEFS =
  `<defs>` +
  `<pattern id="ml-sol" width="8" height="8" patternUnits="userSpaceOnUse"><path class="hachure" d="M0 8L8 0"/></pattern>` +
  [['tr', 'tete-traction'], ['co', 'tete-compression'], ['ne', 'tete-neutre']]
    .map(([id, c]) => `<marker id="ml-${id}" viewBox="0 0 10 10" refX="9" refY="5" markerUnits="userSpaceOnUse" markerWidth="8" markerHeight="8" orient="auto"><path class="${c}" d="M0 0L10 5L0 10z"/></marker>`)
    .join('') +
  `<marker id="ml-tc" viewBox="0 0 8 8" refX="4" refY="4" markerUnits="userSpaceOnUse" markerWidth="8" markerHeight="8" orient="auto"><path class="tete-cote" d="M1 7L7 1"/></marker>` +
  `</defs>`;

const POINTE_TRACTION = 'marker-end="url(#ml-tr)"';
const POINTE_COMPRESSION = 'marker-end="url(#ml-co)"';
const POINTE_NEUTRE = 'marker-end="url(#ml-ne)"';
const TRAITS = 'marker-start="url(#ml-tc)" marker-end="url(#ml-tc)"';

/** Symbole d'une poussee de calcul, d'apres son origine dans le noyau. */
function symbolePoussee(origine: string): string {
  if (origine.includes('terres')) return 'P_G,d';
  if (origine.includes('surcharge')) return 'P_Q,d';
  const n = /(\d+)/.exec(origine)?.[1];
  return n ? `P_b${n},d` : 'P_d';
}

/** Symbole d'un poids, d'apres son origine dans le noyau. */
function symbolePoids(origine: string): string {
  if (origine.includes('voile') && origine.includes('fruit')) return 'W_f';
  if (origine.includes('voile')) return 'W_v';
  if (origine.includes('semelle')) return 'W_s';
  if (origine.includes('terres')) return 'W_t';
  if (origine.includes('surcharge')) return 'W_q';
  const n = /(\d+)/.exec(origine)?.[1];
  return n ? `W_b${n}` : 'W';
}

/** Une poussee variable est tiretee, comme sa charge. */
function pousseeVariable(origine: string, bandes: readonly Bande[]): boolean {
  if (origine.includes('surcharge')) return true;
  const n = /(\d+)/.exec(origine)?.[1];
  return n ? bandes[Number(n) - 1]?.nature === 'Q' : false;
}

/** Fleches verticales d'une charge repartie, entre la ligne haute et le sol. */
function flechesReparties(x1: number, x2: number, yHaut: number, yBas: number): string {
  const traits: string[] = [];
  for (let i = 0; i < 5; i++) {
    const x = x1 + ((x2 - x1) * i) / 4;
    traits.push(
      `<line class="fleche" x1="${attr(x)}" y1="${attr(yHaut)}" x2="${attr(x)}" y2="${attr(yBas - 1)}" ${POINTE_NEUTRE}/>`,
    );
  }
  return traits.join('');
}

/** Un groupe de charge repartie, ferme par la ligne du haut et ses fleches. */
function chargeRepartie(
  nature: string,
  x1: number,
  x2: number,
  yHaut: number,
  yBas: number,
): string {
  const variante = nature === 'Q' || nature === 'variable' ? 'variable' : 'permanent';
  return (
    `<g class="charge-repartie ${variante}">` +
    `<line class="haut" x1="${attr(x1)}" y1="${attr(yHaut)}" x2="${attr(x2)}" y2="${attr(yHaut)}"/>` +
    flechesReparties(x1, x2, yHaut, yBas) +
    `</g>`
  );
}

/**
 * La coupe du mur, dans la vue demandee.
 *
 * Echelle unique en x et en y. L'arite du patin est a `x0` ; l'ecran virtuel
 * au droit du talon.
 */
export function coupe(calcul: Calcul, r: ResultatMur, vue: string, options: OptionsDessin): string {
  const g = calcul.donnees.geometrie;
  const remblai = calcul.donnees.remblai;
  const bandes = bandesDe(calcul);
  const estPremiere = vue === premiereVue(r);
  const comb = r.combinaisons.find((c) => c.nom === vue);

  const totale = g.patin + g.eBas + g.talon;
  const B = Number.isFinite(r.B) && r.B > 0 ? r.B : totale;

  // Largeur utile : la semelle, plus le bord eloigne de la bande la plus lointaine.
  let utile = Math.max(B, totale);
  for (const b of bandes) {
    utile = Math.max(utile, g.patin + g.eBas + b.distance + b.largeur);
  }
  const margeG = 110;
  const margeD = 190;
  const echelle = (LARGEUR - margeG - margeD) / Math.max(utile, 0.1);

  const pivot = r.renversement.pivot.lignes;
  // Les poids reellement pris en compte : un poids de calcul nul n'a rien a montrer.
  const poids = estPremiere ? pivot.filter((l) => l.role === 'stabilisant' && l.d !== null && l.gamma * l.F > 0) : [];
  const pousseesVue = estPremiere
    ? pivot
        .filter((l) => l.elementaire.origine.includes('poussée') && l.d !== null)
        .map((l) => ({ origine: l.elementaire.origine, F: l.gamma * l.F, z: l.d as number }))
    : (comb?.pousseesCalcul ?? []);

  const margeHaut = 54 + Math.max(1, bandes.length) * 18;
  const margeBas = 26 + (options.cotes ? 28 : 0) + (options.bras && estPremiere ? poids.length * 16 + 8 : 0);
  const hauteur = margeHaut + (g.h + g.es) * echelle + margeBas;

  const x = (metre: number): number => margeG + metre * echelle;
  const y = (metre: number): number => margeHaut + metre * echelle;
  const x0 = margeG;
  const xEcran = x(totale);
  const xDroite = x(utile);
  const ySol = y(0);
  const yHautSemelle = y(g.h);
  const yBas = y(g.h + g.es);
  const Ht = g.h + g.es;

  const morceaux: string[] = [];

  morceaux.push(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${LARGEUR} ${attr(hauteur)}" role="img" aria-label="${tx('Coupe du mur en L')}">`,
    DEFS,
  );

  // Remblai derriere le voile, sol devant le patin sur D, assise sous la base.
  const D = Math.min(Math.max(0, Number(calcul.donnees.fondation?.portance?.D ?? 0)) || 0, Ht);
  morceaux.push(
    `<rect class="terrain" x="${attr(x(g.patin))}" y="${attr(ySol)}" width="${attr(xDroite - x(g.patin))}" height="${attr(yBas - ySol)}"/>`,
    `<line class="surface" x1="${attr(x(g.patin))}" y1="${attr(ySol)}" x2="${attr(xDroite)}" y2="${attr(ySol)}"/>`,
    `<rect fill="url(#ml-sol)" x="${attr(x0 - 40)}" y="${attr(yBas)}" width="${attr(xDroite - x0 + 40)}" height="9"/>`,
  );
  if (D > 0) {
    morceaux.push(
      `<rect class="terrain" x="${attr(x0 - 40)}" y="${attr(yBas - D * echelle)}" width="${attr(x(g.patin) - x0 + 40)}" height="${attr(D * echelle)}"/>`,
      `<line class="surface" x1="${attr(x0 - 40)}" y1="${attr(yBas - D * echelle)}" x2="${attr(x(g.patin))}" y2="${attr(yBas - D * echelle)}"/>`,
    );
  }

  // Voile et semelle.
  morceaux.push(
    `<rect class="semelle" x="${attr(x0)}" y="${attr(yHautSemelle)}" width="${attr(B * echelle)}" height="${attr(g.es * echelle)}"/>`,
    `<polygon class="voile" points="${attr(x(g.patin))},${attr(ySol)} ${attr(x(g.patin + g.eHaut))},${attr(ySol)} ${attr(x(g.patin + g.eBas))},${attr(yHautSemelle)} ${attr(x(g.patin))},${attr(yHautSemelle)}"/>`,
  );

  // Ecran virtuel au droit du talon ; son nom passe sous la surface si une bande le survole.
  const survole = bandes.some((b) => b.distance + b.largeur > g.talon);
  morceaux.push(
    `<line class="ecran" x1="${attr(xEcran)}" y1="${attr(ySol)}" x2="${attr(xEcran)}" y2="${attr(yBas)}"/>`,
    `<text class="etiquette" x="${attr(xEcran + 6)}" y="${attr(survole ? ySol + 14 : ySol - 6)}">${tx(textes().coupe.ecranVirtuel)}</text>`,
  );

  // Surcharge uniforme, de l'arriere du voile a l'ecran virtuel.
  if (remblai.q > 0) {
    const ySurcharge = ySol - 22;
    morceaux.push(
      chargeRepartie('Q', x(g.patin + g.eBas), xEcran, ySurcharge, ySol),
      `<text class="etiquette" x="${attr(x(g.patin + g.eBas) - 6)}" y="${attr(ySurcharge + 4)}" text-anchor="end">q = ${nb(remblai.q, 1)} kPa</text>`,
    );
  }

  // Bandes : decalees en hauteur quand elles se chevauchent.
  const rangees: { x1: number; x2: number }[][] = [];
  const placer = (x1: number, x2: number): number => {
    let i = 0;
    for (;;) {
      const rangee = rangees[i] ?? (rangees[i] = []);
      const chevauche = rangee.some((q) => x1 < q.x2 - 0.5 && x2 > q.x1 + 0.5);
      if (!chevauche) {
        rangee.push({ x1, x2 });
        return i;
      }
      i++;
    }
  };
  bandes.forEach((b, i) => {
    const bx1 = x(g.patin + g.eBas + b.distance);
    const bx2 = bx1 + b.largeur * echelle;
    const rangee = placer(bx1, bx2);
    const yBande = ySol - 34 - rangee * 18;
    morceaux.push(
      chargeRepartie(b.nature, bx1, bx2, yBande, ySol),
      `<text class="etiquette" x="${attr(bx1)}" y="${attr(yBande - 6)}">${tx(`b${i + 1} : ${b.nature === 'Q' ? 'Q' : 'G'} = ${nb(b.q, 1)} kPa`)}</text>`,
    );
  });

  // Diagramme de poussee : surcharge uniforme, puis terres triangulaires a sa suite.
  const pG = pousseesVue.filter((p) => p.origine.includes('terres')).reduce((s, p) => s + (2 * p.F) / Ht, 0);
  const pQ = pousseesVue.filter((p) => p.origine.includes('surcharge')).reduce((s, p) => s + p.F / Ht, 0);
  const largeurDiagramme = 90;
  const kDiagramme = pG + pQ > 0 ? largeurDiagramme / (pG + pQ) : 0;
  const lQ = pQ * kDiagramme;
  const lG = pG * kDiagramme;
  if (lQ > 0) {
    morceaux.push(
      `<rect class="diagramme variable" x="${attr(xEcran)}" y="${attr(ySol)}" width="${attr(lQ)}" height="${attr(yBas - ySol)}"/>`,
    );
  }
  if (lG > 0) {
    morceaux.push(
      `<polygon class="diagramme" points="${attr(xEcran + lQ)},${attr(ySol)} ${attr(xEcran + lQ + lG)},${attr(yBas)} ${attr(xEcran + lQ)},${attr(yBas)}"/>`,
      `<text class="valeur-traction" x="${attr(xEcran + 4)}" y="${attr(yBas + 22)}">${nb(pG + pQ, 1)} kPa</text>`,
    );
  }

  // Poussees : chaque effort a sa hauteur, les etiquettes trop proches s'ecartent.
  const queue = (i: number): number => Math.min(xEcran + 122 + i * 14, LARGEUR - 8);
  const ordre = pousseesVue
    .map((p, i) => ({ ...p, i, yP: yBas - p.z * echelle }))
    .sort((a, b) => a.yP - b.yP);
  let yTexte = -Infinity;
  for (const p of ordre) {
    yTexte = Math.max(yTexte + 15, p.yP - 5);
    const variable = pousseeVariable(p.origine, bandes);
    morceaux.push(
      `<line class="poussee${variable ? ' variable' : ''}" x1="${attr(queue(p.i))}" y1="${attr(p.yP)}" x2="${attr(xEcran + 1)}" y2="${attr(p.yP)}" ${POINTE_TRACTION}/>`,
      `<text class="force-traction" x="${attr(queue(p.i) - 4)}" y="${attr(yTexte)}" text-anchor="end">${tx(`${symbolePoussee(p.origine)} = ${nb(p.F, 1)} kN`)}</text>`,
    );
  }

  // Poids : la fleche part du haut de son bloc ; voile a gauche, le reste a droite.
  let empile = 0;
  for (const l of poids) {
    const nom = symbolePoids(l.elementaire.origine);
    const xP = x(l.d as number);
    const dansVoile = nom === 'W_v' || nom === 'W_f';
    const dansSemelle = nom === 'W_s';
    const yDebut = dansSemelle
      ? yHautSemelle - 34
      : dansVoile
        ? ySol + (yHautSemelle - ySol) * (nom === 'W_v' ? 0.3 : 0.48)
        : ySol + (yHautSemelle - ySol) * 0.28 + empile * 18;
    const yFin = dansSemelle ? yBas - 6 : yDebut + Math.min(70, (yHautSemelle - ySol) * 0.3);
    morceaux.push(
      `<line class="poids" x1="${attr(xP)}" y1="${attr(yDebut)}" x2="${attr(xP)}" y2="${attr(yFin)}" ${POINTE_COMPRESSION}/>`,
      dansVoile
        ? `<text class="force-compression" x="${attr(xP - 26)}" y="${attr(yDebut + 12)}" text-anchor="end">${tx(`${nom} = ${nb(l.gamma * l.F, 1)} kN`)}</text>`
        : `<text class="force-compression" x="${attr(xP + 6)}" y="${attr(yDebut + 12)}">${tx(`${nom} = ${nb(l.gamma * l.F, 1)} kN`)}</text>`,
    );
    if (!dansVoile && !dansSemelle) empile++;
  }

  // Pivot du renversement : l'arete du patin.
  if (estPremiere) {
    morceaux.push(
      `<circle class="pivot" cx="${attr(x0)}" cy="${attr(yBas)}" r="5"/>`,
      `<text class="pivot-nom" x="${attr(x0 - 8)}" y="${attr(yBas + 18)}" text-anchor="end">${tx(`${textes().coupe.pivot} ${vue}`)}</text>`,
    );
  }

  // Cotes de geometrie.
  if (options.cotes) {
    const xCote = x0 - 62;
    morceaux.push(
      `<line class="cote" x1="${attr(xCote)}" y1="${attr(ySol)}" x2="${attr(xCote)}" y2="${attr(yHautSemelle)}" ${TRAITS}/>`,
      `<text class="cote" x="${attr(xCote - 4)}" y="${attr((ySol + yHautSemelle) / 2)}" text-anchor="end">h = ${nb(g.h, 2)} m</text>`,
      `<line class="cote" x1="${attr(xCote)}" y1="${attr(yHautSemelle)}" x2="${attr(xCote)}" y2="${attr(yBas)}" ${TRAITS}/>`,
      `<text class="cote" x="${attr(xCote - 4)}" y="${attr((yHautSemelle + yBas) / 2 + 4)}" text-anchor="end">${nb(g.es, 2)} m</text>`,
    );
    if (D > 0) {
      morceaux.push(
        `<line class="cote" x1="${attr(x0 - 20)}" y1="${attr(yBas - D * echelle)}" x2="${attr(x0 - 20)}" y2="${attr(yBas)}" ${TRAITS}/>`,
        `<text class="cote" x="${attr(x0 - 16)}" y="${attr(yBas - D * echelle - 4)}">D = ${nb(D, 2)} m</text>`,
      );
    }
    const yCote = yBas + 40;
    const cote = (de: number, a: number, texte: string): string =>
      `<line class="cote" x1="${attr(de)}" y1="${attr(yCote)}" x2="${attr(a)}" y2="${attr(yCote)}" ${TRAITS}/>` +
      `<text class="cote" x="${attr((de + a) / 2)}" y="${attr(yCote - 4)}" text-anchor="middle">${texte}</text>`;
    morceaux.push(
      cote(x0, x(g.patin), `patin ${nb(g.patin, 2)} m`),
      cote(x(g.patin), x(g.patin + g.eBas), `${nb(g.eBas, 2)} m`),
      cote(x(g.patin + g.eBas), xEcran, `talon ${nb(g.talon, 2)} m`),
    );
  }

  // Bras de levier, pour la vue du renversement : horizontaux pour les poids,
  // verticaux pour les poussees, a la queue de leur fleche.
  if (options.bras && estPremiere) {
    const yDepart = yBas + (options.cotes ? 58 : 30);
    poids.forEach((l, i) => {
      const xP = x(l.d as number);
      const yBras = yDepart + i * 16;
      morceaux.push(
        `<line class="rappel" x1="${attr(xP)}" y1="${attr(yBas)}" x2="${attr(xP)}" y2="${attr(yBras)}"/>`,
        `<line class="bras" x1="${attr(x0)}" y1="${attr(yBras)}" x2="${attr(xP)}" y2="${attr(yBras)}" ${TRAITS}/>`,
        `<text class="bras" x="${attr(xP + 6)}" y="${attr(yBras + 3)}">${nb(l.d as number, 2)} m</text>`,
      );
    });
    for (const p of ordre) {
      const xQ = queue(p.i);
      morceaux.push(
        `<line class="bras" x1="${attr(xQ)}" y1="${attr(p.yP)}" x2="${attr(xQ)}" y2="${attr(yBas)}" ${TRAITS}/>`,
        `<text class="bras" x="${attr(xQ - 3)}" y="${attr((p.yP + yBas) / 2)}" text-anchor="middle" transform="rotate(-90 ${attr(xQ - 3)} ${attr((p.yP + yBas) / 2)})">${nb(p.z, 2)} m</text>`,
      );
    }
  }

  morceaux.push(`</svg>`);
  return morceaux.join('');
}

/**
 * La semelle et la contrainte du sol, pour la combinaison de la vue : celle
 * de la vue, ou pour le renversement la plus severe en portance.
 */
export function baseSvg(r: ResultatMur, vue: string): string {
  const comb =
    vue === premiereVue(r)
      ? r.combinaisons.reduce((a, c) => (c.portance.taux > a.portance.taux ? c : a), r.combinaisons[0])
      : r.combinaisons.find((c) => c.nom === vue) ?? r.combinaisons[0];
  if (!comb) return '';

  const cas = comb.portance;
  const B = Number.isFinite(r.B) && r.B > 0 ? r.B : 1;
  const V = cas.V;
  const e = cas.e;
  const Bp = Number.isFinite(cas.Bp) ? Math.max(0, cas.Bp) : 0;
  const Rd = cas.R_d;

  const margeG = 120;
  const margeD = 180;
  const x0 = margeG;
  const echelle = (LARGEUR - margeG - margeD) / Math.max(B, 0.1);
  const x = (metre: number): number => x0 + metre * echelle;

  let contrainte: ((x: number) => number) | null = null;
  try {
    contrainte = contrainteSol(V, e, B);
  } catch {
    contrainte = null;
  }

  // Assez d'echantillons pour marquer le point ou le contact cesse.
  const n = 41;
  const echantillons: { x: number; q: number }[] = [];
  if (contrainte) {
    for (let i = 0; i < n; i++) {
      const xm = (B * i) / (n - 1);
      const q = contrainte(xm);
      if (Number.isFinite(q)) echantillons.push({ x: xm, q });
    }
  }
  const qs = echantillons.map((p) => p.q);
  const qmax = qs.length ? Math.max(...qs) : 0;
  const yContrainte = (q: number): number => {
    if (!Number.isFinite(q) || qmax <= 0) return 80;
    return 80 + 70 * Math.min(1, Math.max(0, q / qmax));
  };

  const xTexte = LARGEUR - margeD + 20;
  const pression = Bp > 0 ? V / Bp : Number.NaN;

  const morceaux: string[] = [];
  morceaux.push(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${LARGEUR} 185" role="img" aria-label="${tx('Contrainte sous la semelle et largeur efficace')}">`,
    DEFS,
    `<rect class="semelle" x="${attr(x0)}" y="48" width="${attr(B * echelle)}" height="20"/>`,
    `<line class="noyau" x1="${attr(x(B / 2 - B / 6))}" y1="72" x2="${attr(x(B / 2 + B / 6))}" y2="72"/>`,
    `<line class="resultante" x1="${attr(x(B / 2 - e))}" y1="14" x2="${attr(x(B / 2 - e))}" y2="46" ${POINTE_TRACTION}/>`,
    `<text class="etiquette" x="${attr(xTexte)}" y="20">${tx(phrase(comb.nom))}</text>`,
    `<text class="etiquette" x="${attr(xTexte)}" y="36">${tx(`V = ${nb(V, 1)} kN ; e = ${nb(e, 2)} m`)}</text>`,
    `<text class="etiquette" x="${attr(xTexte)}" y="52">${tx(`B' = ${nb(Bp, 2)} m ; R_d = ${nb(Rd, 1)} kN`)}</text>`,
    `<text class="etiquette" x="${attr(xTexte)}" y="68">${tx(textes().coupe.noyauEpais)}</text>`,
  );

  if (echantillons.length >= 2) {
    const points = echantillons.map((p) => `${attr(x(p.x))},${attr(yContrainte(p.q))}`).join(' ');
    morceaux.push(`<polygon class="contrainte" points="${attr(x0)},80 ${points} ${attr(x(B))},80"/>`);
    for (const xm of [0, B / 2, B]) {
      const q = contrainte ? contrainte(xm) : 0;
      if (Number.isFinite(q) && yContrainte(q) - 80 > 6) {
        morceaux.push(
          `<line class="contrainte-fleche" x1="${attr(x(xm))}" y1="${attr(yContrainte(q) - 1)}" x2="${attr(x(xm))}" y2="81" ${POINTE_COMPRESSION}/>`,
        );
      }
    }
    const qGauche = contrainte ? contrainte(0) : 0;
    const qDroite = contrainte ? contrainte(B) : 0;
    morceaux.push(
      `<text class="valeur-compression" x="${attr(x0 - 6)}" y="${attr(yContrainte(qGauche) + 4)}" text-anchor="end">${nb(qGauche, 1)} kPa</text>`,
      `<text class="valeur-compression" x="${attr(x(B) + 6)}" y="${attr(yContrainte(qDroite) + 4)}">${nb(qDroite, 1)} kPa</text>`,
    );
  }

  if (Bp > 0 && Number.isFinite(pression)) {
    const hauteurRect = Math.max(0, yContrainte(pression) - 80);
    morceaux.push(
      `<rect class="meyer" x="${attr(x0)}" y="80" width="${attr(Bp * echelle)}" height="${attr(hauteurRect)}"/>`,
      `<text class="valeur-traction" x="${attr(x(Bp) + 6)}" y="${attr(Math.max(104, 80 + hauteurRect - 14))}">${tx(`V/B' = ${nb(pression, 1)} kPa`)}</text>`,
      `<text class="valeur-traction" x="${attr(x(Bp) + 6)}" y="${attr(Math.max(118, 80 + hauteurRect))}">${tx(`R_d/B' = ${nb(Rd / Bp, 1)} kPa`)}</text>`,
    );
  }

  morceaux.push(
    `<text class="etiquette" x="${attr(x0)}" y="176">${tx(textes().coupe.linearite)}</text>`,
    `</svg>`,
  );
  return morceaux.join('');
}

/**
 * La projection des bandes sur l'ecran virtuel. `phi` en degres.
 * Chaine vide si aucune bande ne depasse le talon.
 */
export function projectionSvg(calcul: Calcul, phi: number): string {
  const g = calcul.donnees.geometrie;
  const H = g.h + g.es;
  const retenues = bandesDe(calcul)
    .map((b, i) => ({ ...b, numero: i + 1 }))
    .filter((b) => b.distance + b.largeur - g.talon > 0);
  if (retenues.length === 0) return '';

  const phiRad = (phi * Math.PI) / 180;
  const tanPhi = Math.tan(phiRad);
  const tanB = Math.tan(Math.PI / 4 + phiRad / 2);
  if (!Number.isFinite(tanPhi) || !Number.isFinite(tanB)) return '';

  const maxLoin = Math.max(...retenues.map((b) => b.distance + b.largeur - g.talon));
  const margeG = 170;
  const margeD = 190;
  const haut = 62;
  // Une bande proche de l'ecran ne doit pas etirer le dessin en hauteur.
  const echelle = Math.min((LARGEUR - margeG - margeD) / Math.max(maxLoin, 0.1), 300 / Math.max(H, 0.1));
  const surface = haut;
  const xEcran = margeG;
  const xFinSol = xEcran + maxLoin * echelle + 20;
  const hauteur = Math.max(150, haut + H * echelle + 34);
  const yBase = surface + H * echelle;
  const yArase = yBase - g.es * echelle;
  const xPatin = Math.max(30, xEcran - g.talon * echelle);

  const morceaux: string[] = [];
  morceaux.push(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${LARGEUR} ${attr(hauteur)}" role="img" aria-label="${tx('Diffusion d une charge en bande jusqu a l ecran virtuel')}">`,
    DEFS,
    `<rect class="terrain" x="${attr(xPatin)}" y="${attr(surface)}" width="${attr(xFinSol - xPatin)}" height="${attr(yBase - surface)}"/>`,
    `<rect class="semelle" x="${attr(xPatin)}" y="${attr(yArase)}" width="${attr(xEcran - xPatin)}" height="${attr(yBase - yArase)}"/>`,
    `<line class="surface" x1="${attr(xPatin)}" y1="${attr(surface)}" x2="${attr(xFinSol)}" y2="${attr(surface)}"/>`,
    `<line class="ecran" x1="${attr(xEcran)}" y1="${attr(surface)}" x2="${attr(xEcran)}" y2="${attr(yBase)}"/>`,
    `<text class="etiquette" x="${attr(xEcran - 4)}" y="${attr(surface - 6)}" text-anchor="end">${tx(textes().coupe.ecranVirtuel)}</text>`,
  );

  retenues.forEach((b, i) => {
    const loin = b.distance + b.largeur - g.talon;
    const a = Math.max(0, b.distance - g.talon);
    const largeur = loin - a;
    const xProche = xEcran + a * echelle;
    const xLoin = xEcran + (a + largeur) * echelle;
    const yBande = surface - 22;
    const variante = b.nature === 'Q' ? 'variable' : 'permanent';

    morceaux.push(
      `<g class="charge-repartie ${variante}">` +
        `<line class="haut" x1="${attr(xProche)}" y1="${attr(yBande)}" x2="${attr(xLoin)}" y2="${attr(yBande)}"/>`,
    );
    for (let k = 0; k < 3; k++) {
      const xx = xProche + ((xLoin - xProche) * k) / 2;
      morceaux.push(
        `<line class="fleche" x1="${attr(xx)}" y1="${attr(yBande)}" x2="${attr(xx)}" y2="${attr(surface - 1)}" ${POINTE_NEUTRE}/>`,
      );
    }
    morceaux.push(
      `</g>`,
      `<text class="etiquette" x="${attr((xProche + xLoin) / 2)}" y="${attr(yBande - 5)}" text-anchor="middle">b${b.numero}</text>`,
    );

    const p = projectionBande(a, largeur, phiRad, H);
    if (!p || p.z1 > H + 1e-9) return;

    if (a > 1e-9) {
      morceaux.push(
        `<line class="diffusion" data-bord="proche" x1="${attr(xProche)}" y1="${attr(surface)}" x2="${attr(xEcran)}" y2="${attr(surface + p.z1 * echelle)}"/>`,
      );
    }

    const zLoin = (a + largeur) * tanB;
    const borne = zLoin > H;
    const xFin = borne ? xLoin - (H / tanB) * echelle : xEcran;
    const yFin = surface + (borne ? H : zLoin) * echelle;
    if (xFin >= xEcran - 1e-6) {
      morceaux.push(
        `<line class="diffusion" data-bord="eloigne" x1="${attr(xLoin)}" y1="${attr(surface)}" x2="${attr(xFin)}" y2="${attr(yFin)}"/>`,
      );
    }

    const y1 = surface + p.z1 * echelle;
    const y2 = surface + Math.min(p.z2, H) * echelle;
    morceaux.push(
      `<rect class="pression" x="${attr(xEcran)}" y="${attr(Math.min(y1, y2))}" width="18" height="${attr(Math.abs(y2 - y1))}"/>`,
    );
    for (let k = 0; k < 3; k++) {
      const yy = y1 + ((y2 - y1) * k) / 2;
      morceaux.push(
        `<line class="fleche-pression" x1="${attr(xEcran + 18)}" y1="${attr(yy)}" x2="${attr(xEcran + 2)}" y2="${attr(yy)}" ${POINTE_TRACTION}/>`,
      );
    }

    const yTexte = 24 + i * 18;
    morceaux.push(
      `<text class="etiquette" x="${attr(LARGEUR - margeD + 8)}" y="${attr(yTexte)}">${tx(`b${b.numero} : z1 = ${nb(p.z1, 2)} m ; z2 = ${nb(p.z2, 2)} m`)}</text>`,
    );
  });

  morceaux.push(
    `<text class="legende" x="20" y="${attr(hauteur - 8)}">${tx(textes().coupe.methodeCourante)}</text>`,
    `</svg>`,
  );
  return morceaux.join('');
}
