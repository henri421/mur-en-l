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

/** Fleches verticales d'une charge repartie, entre la ligne haute et le sol. */
function flechesReparties(x1: number, x2: number, yHaut: number, yBas: number): string {
  const traits: string[] = [];
  for (let i = 0; i < 5; i++) {
    const x = x1 + ((x2 - x1) * i) / 4;
    traits.push(
      `<line class="fleche" x1="${attr(x)}" y1="${attr(yHaut)}" x2="${attr(x)}" y2="${attr(yBas)}"/>`,
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
  const margeD = 170;
  const echelle = (LARGEUR - margeG - margeD) / Math.max(utile, 0.1);

  const lignesPivot = r.renversement.pivot.lignes;
  const nBras = estPremiere ? lignesPivot.length : 0;
  const margeHaut = 54 + Math.max(1, bandes.length) * 18;
  const margeBas = 54 + nBras * 16;
  const hauteur = margeHaut + (g.h + g.es) * echelle + margeBas;

  const x = (metre: number): number => margeG + metre * echelle;
  const y = (metre: number): number => margeHaut + metre * echelle;
  const x0 = margeG;
  const xEcran = x(totale);
  const ySol = y(0);
  const yHautSemelle = y(g.h);
  const yBas = y(g.h + g.es);

  const morceaux: string[] = [];

  morceaux.push(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${LARGEUR} ${attr(hauteur)}" role="img" aria-label="${tx('Coupe du mur en L')}">`,
  );

  // Sol et terrains.
  morceaux.push(
    `<rect class="terrain" x="${attr(x0)}" y="${attr(ySol)}" width="${attr(xEcran - x0)}" height="${attr(g.h * echelle)}"/>`,
    `<line class="surface" x1="${attr(x0)}" y1="${attr(ySol)}" x2="${attr(xEcran)}" y2="${attr(ySol)}"/>`,
  );

  // Voile et semelle.
  morceaux.push(
    `<rect class="semelle" x="${attr(x0)}" y="${attr(yHautSemelle)}" width="${attr(B * echelle)}" height="${attr(g.es * echelle)}"/>`,
    `<polygon class="voile" points="${attr(x(g.patin))},${attr(ySol)} ${attr(x(g.patin + g.eHaut))},${attr(ySol)} ${attr(x(g.patin + g.eBas))},${attr(yHautSemelle)} ${attr(x(g.patin))},${attr(yHautSemelle)}"/>`,
  );

  // Ecran virtuel au droit du talon.
  morceaux.push(
    `<line class="ecran" x1="${attr(xEcran)}" y1="${attr(ySol)}" x2="${attr(xEcran)}" y2="${attr(yBas)}"/>`,
    `<text class="etiquette" x="${attr(xEcran + 6)}" y="${attr(ySol - 6)}">${tx(textes().coupe.ecranVirtuel)}</text>`,
  );

  // Surcharge uniforme, de l'arriere du voile a l'ecran virtuel.
  if (remblai.q > 0) {
    const ySurcharge = ySol - 22;
    morceaux.push(
      chargeRepartie('Q', x(g.patin + g.eBas), xEcran, ySurcharge, ySol),
      `<text class="etiquette" x="${attr((x(g.patin + g.eBas) + xEcran) / 2)}" y="${attr(ySurcharge - 8)}" text-anchor="middle">q = ${nb(remblai.q, 1)} kPa</text>`,
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
  for (const b of bandes) {
    const bx1 = x(g.patin + g.eBas + b.distance);
    const bx2 = bx1 + b.largeur * echelle;
    const rangee = placer(bx1, bx2);
    const yBande = ySol - 34 - rangee * 18;
    morceaux.push(
      chargeRepartie(b.nature, bx1, bx2, yBande, ySol),
      `<text class="etiquette" x="${attr(bx1)}" y="${attr(yBande - 6)}">${nb(b.q, 1)} kPa</text>`,
    );
  }

  // Poussees.
  if (estPremiere) {
    for (const l of lignesPivot) {
      if (!l.elementaire.origine.includes('poussée') || l.d === null) continue;
      const effort = l.gamma * l.F;
      const yP = yBas - l.d * echelle;
      morceaux.push(
        `<line class="poussee" x1="${attr(xEcran + 58)}" y1="${attr(yP)}" x2="${attr(xEcran)}" y2="${attr(yP)}"/>`,
        `<text class="etiquette" x="${attr(xEcran + 30)}" y="${attr(yP - 5)}" text-anchor="middle">${tx(phrase(l.elementaire.origine))} = ${nb(effort, 1)} kN</text>`,
      );
    }
    for (const l of lignesPivot) {
      if (l.role !== 'stabilisant' || l.d === null) continue;
      const effort = l.gamma * l.F;
      const xP = x(l.d);
      morceaux.push(
        `<line class="poids" x1="${attr(xP)}" y1="${attr(yBas - 70)}" x2="${attr(xP)}" y2="${attr(yBas)}"/>`,
        `<text class="etiquette" x="${attr(xP + 4)}" y="${attr(yBas - 74)}">W = ${nb(effort, 1)} kN</text>`,
      );
    }
  } else if (comb) {
    for (const p of comb.pousseesCalcul) {
      const yP = yBas - p.z * echelle;
      morceaux.push(
        `<line class="poussee" x1="${attr(xEcran + 58)}" y1="${attr(yP)}" x2="${attr(xEcran)}" y2="${attr(yP)}"/>`,
        `<text class="etiquette" x="${attr(xEcran + 30)}" y="${attr(yP - 5)}" text-anchor="middle">${tx(phrase(p.origine))} = ${nb(p.F, 1)} kN</text>`,
      );
    }
  }

  // Cotes de geometrie.
  if (options.cotes) {
    const xCote = x0 - 52;
    morceaux.push(
      `<line class="cote" x1="${attr(xCote)}" y1="${attr(ySol)}" x2="${attr(xCote)}" y2="${attr(yHautSemelle)}"/>`,
      `<text class="cote" x="${attr(xCote - 4)}" y="${attr((ySol + yHautSemelle) / 2)}" text-anchor="end">h = ${nb(g.h, 2)} m</text>`,
      `<line class="cote" x1="${attr(xCote)}" y1="${attr(yHautSemelle)}" x2="${attr(xCote)}" y2="${attr(yBas)}"/>`,
      `<text class="cote" x="${attr(xCote - 4)}" y="${attr((yHautSemelle + yBas) / 2)}" text-anchor="end">${nb(g.es, 2)} m</text>`,
    );
    const yCote = yBas + 22;
    morceaux.push(
      `<line class="cote" x1="${attr(x0)}" y1="${attr(yCote)}" x2="${attr(x(g.patin))}" y2="${attr(yCote)}"/>`,
      `<text class="cote" x="${attr(x(g.patin) / 2 + x0 / 2)}" y="${attr(yCote - 4)}" text-anchor="middle">patin ${nb(g.patin, 2)} m</text>`,
      `<line class="cote" x1="${attr(x(g.patin))}" y1="${attr(yCote)}" x2="${attr(x(g.patin + g.eBas))}" y2="${attr(yCote)}"/>`,
      `<text class="cote" x="${attr((x(g.patin) + x(g.patin + g.eBas)) / 2)}" y="${attr(yCote - 4)}" text-anchor="middle">${nb(g.eBas, 2)} m</text>`,
      `<line class="cote" x1="${attr(x(g.patin + g.eBas))}" y1="${attr(yCote)}" x2="${attr(xEcran)}" y2="${attr(yCote)}"/>`,
      `<text class="cote" x="${attr((x(g.patin + g.eBas) + xEcran) / 2)}" y="${attr(yCote - 4)}" text-anchor="middle">talon ${nb(g.talon, 2)} m</text>`,
    );
  }

  // Bras de levier sous la semelle, pour la vue du renversement.
  if (options.bras && estPremiere) {
    lignesPivot.forEach((l, i) => {
      if (l.d === null) return;
      const yBras = yBas + 40 + i * 16;
      morceaux.push(
        `<line class="bras" x1="${attr(x0)}" y1="${attr(yBras)}" x2="${attr(x(l.d))}" y2="${attr(yBras)}"/>`,
        `<text class="bras" x="${attr(x(l.d) + 4)}" y="${attr(yBras - 3)}">${nb(l.d, 2)} m</text>`,
      );
    });
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

  const n = Math.max(2, Math.ceil(B));
  const echantillons: { x: number; q: number }[] = [];
  if (contrainte) {
    for (let i = 0; i < n; i++) {
      const xm = (B * i) / (n - 1);
      const q = contrainte(xm);
      if (Number.isFinite(q)) echantillons.push({ x: xm, q });
    }
  }
  const qs = echantillons.map((p) => p.q);
  const qmin = qs.length ? Math.min(...qs) : 0;
  const qmax = qs.length ? Math.max(...qs) : 0;
  const yContrainte = (q: number): number => {
    if (!Number.isFinite(q)) return 80;
    const etendue = qmax - qmin;
    const part = etendue > 1e-9 ? (q - qmin) / etendue : 0.5;
    return 80 + 70 * Math.min(1, Math.max(0, part));
  };

  const morceaux: string[] = [];
  morceaux.push(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${LARGEUR} 185" role="img" aria-label="${tx('Contrainte sous la semelle et largeur efficace')}">`,
    `<rect class="semelle" x="${attr(x0)}" y="48" width="${attr(B * echelle)}" height="20"/>`,
    `<line class="noyau" x1="${attr(x(B / 2 - B / 6))}" y1="72" x2="${attr(x(B / 2 + B / 6))}" y2="72"/>`,
    `<text class="etiquette" x="${attr(LARGEUR - margeD + 20)}" y="72">${tx(textes().coupe.noyauCentral)}</text>`,
    `<line class="resultante" x1="${attr(x(B / 2 - e))}" y1="16" x2="${attr(x(B / 2 - e))}" y2="46"/>`,
    `<text class="etiquette" x="${attr(LARGEUR - margeD + 20)}" y="20">${tx(phrase(comb.nom))}</text>`,
    `<text class="etiquette" x="${attr(LARGEUR - margeD + 20)}" y="38">${tx(`V = ${nb(V, 1)} kN ; e = ${nb(e, 2)} m`)}</text>`,
    `<text class="etiquette" x="${attr(LARGEUR - margeD + 20)}" y="54">${tx(`B' = ${nb(Bp, 2)} m ; R_d = ${nb(Rd, 1)} kPa`)}</text>`,
  );

  if (echantillons.length >= 2) {
    const points = echantillons.map((p) => `${attr(x(p.x))},${attr(yContrainte(p.q))}`).join(' ');
    morceaux.push(
      `<polygon class="contrainte" points="${attr(x0)},80 ${points} ${attr(x(B))},80"/>`,
      `<text class="etiquette" x="${attr(x0 - 6)}" y="158" text-anchor="end">${nb(qmax, 1)} kPa</text>`,
    );
  }

  if (Bp > 0 && Number.isFinite(V / Bp)) {
    const hauteurRect = Math.max(0, yContrainte(V / Bp) - 80);
    morceaux.push(
      `<rect class="meyer" x="${attr(x0)}" y="80" width="${attr(Bp * echelle)}" height="${attr(hauteurRect)}"/>`,
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
  const retenues = bandesDe(calcul).filter((b) => b.distance + b.largeur - g.talon > 0);
  if (retenues.length === 0) return '';

  const phiRad = (phi * Math.PI) / 180;
  const tanPhi = Math.tan(phiRad);
  const tanB = Math.tan(Math.PI / 4 + phiRad / 2);
  if (!Number.isFinite(tanPhi) || !Number.isFinite(tanB)) return '';

  const maxLoin = Math.max(...retenues.map((b) => b.distance + b.largeur - g.talon));
  const margeG = 200;
  const margeD = 180;
  const haut = 46;
  const echelle = (LARGEUR - margeG - margeD) / Math.max(maxLoin, 0.1);
  const surface = haut;
  const xEcran = margeG;
  const hauteur = Math.max(120, haut + H * echelle + 44);

  const morceaux: string[] = [];
  morceaux.push(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${LARGEUR} ${attr(hauteur)}" role="img" aria-label="${tx('Diffusion d une charge en bande jusqu a l ecran virtuel')}">`,
    `<line class="surface" x1="${attr(xEcran)}" y1="${attr(surface)}" x2="${attr(LARGEUR - margeD)}" y2="${attr(surface)}"/>`,
    `<line class="ecran" x1="${attr(xEcran)}" y1="${attr(surface)}" x2="${attr(xEcran)}" y2="${attr(surface + H * echelle)}"/>`,
    `<text class="etiquette" x="${attr(xEcran - 4)}" y="${attr(surface - 8)}" text-anchor="end">${tx(textes().coupe.ecranVirtuel)}</text>`,
  );

  retenues.forEach((b, i) => {
    const loin = b.distance + b.largeur - g.talon;
    const a = Math.max(0, b.distance - g.talon);
    const largeur = loin - a;
    const xProche = xEcran + a * echelle;
    const xLoin = xEcran + (a + largeur) * echelle;
    const yBande = surface - 24;

    morceaux.push(
      `<line class="haut" x1="${attr(xProche)}" y1="${attr(yBande)}" x2="${attr(xLoin)}" y2="${attr(yBande)}"/>`,
    );
    for (let k = 0; k < 3; k++) {
      const xx = xProche + ((xLoin - xProche) * k) / 2;
      morceaux.push(
        `<line class="fleche" x1="${attr(xx)}" y1="${attr(yBande)}" x2="${attr(xx)}" y2="${attr(surface - 2)}"/>`,
      );
    }

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
        `<line class="fleche-pression" x1="${attr(xEcran + 18)}" y1="${attr(yy)}" x2="${attr(xEcran + 2)}" y2="${attr(yy)}"/>`,
      );
    }

    const yTexte = 24 + i * 30;
    morceaux.push(
      `<text class="etiquette" x="${attr(LARGEUR - margeD - 6)}" y="${attr(yTexte)}">z1 = ${nb(p.z1, 2)} m</text>`,
      `<text class="etiquette" x="${attr(LARGEUR - margeD - 6)}" y="${attr(yTexte + 14)}">z2 = ${nb(p.z2, 2)} m</text>`,
    );
  });

  morceaux.push(
    `<text class="legende" x="20" y="${attr(hauteur - 8)}">${tx(textes().coupe.methodeCourante)}</text>`,
    `</svg>`,
  );
  return morceaux.join('');
}
