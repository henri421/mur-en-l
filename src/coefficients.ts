/**
 * Coefficients modifiables d'un profil : liste a plat et profil derive.
 *
 * Un profil (1re ou 2e generation) est un arbre dont les feuilles sont des
 * valeurs sourcees. L'utilisateur peut en changer la valeur ; la source dit
 * alors que la valeur est saisie, et rappelle la valeur recommandee et sa
 * provenance. Rien n'est code pour une annexe nationale : elle se saisit ici.
 *
 * Grandeurs sans dimension.
 */

import type { ValeurSourcee } from 'equilibre-statique';

export interface Coefficient {
  /** Chemin dans le profil, segments separes par des points (`A1.gG_dst`). */
  cle: string;
  valeur: number;
  source: string;
}

/** Feuilles qui ne se modifient pas : une action variable favorable vaut 0 par principe. */
const FIGEES = new Set(['gQ_stb']);

function estFeuille(x: unknown): x is ValeurSourcee {
  return typeof x === 'object' && x !== null && typeof (x as ValeurSourcee).valeur === 'number' && typeof (x as ValeurSourcee).source === 'string';
}

/** Les coefficients modifiables d'un profil, dans l'ordre de ses champs. */
export function listerCoefficients(profil: object): Coefficient[] {
  const out: Coefficient[] = [];
  const parcourir = (noeud: object, chemin: string[]): void => {
    for (const [cle, x] of Object.entries(noeud)) {
      if (estFeuille(x)) {
        if (!FIGEES.has(cle)) out.push({ cle: [...chemin, cle].join('.'), valeur: x.valeur, source: x.source });
      } else if (typeof x === 'object' && x !== null) parcourir(x, [...chemin, cle]);
    }
  };
  parcourir(profil, []);
  return out;
}

function nombreAffiche(v: number): string {
  return String(v).replace('.', ',');
}

/**
 * Profil derive : chaque cle de `modifs` remplace la valeur de la feuille
 * correspondante. Une valeur egale a la recommandee ne change rien. Leve en
 * nommant une cle inconnue ou une valeur qui n'est pas un nombre positif.
 */
export function deriverProfil<T extends object>(profil: T, modifs: Record<string, number>): T {
  const copie = structuredClone(profil);
  const connues = new Map(listerCoefficients(copie).map((c) => [c.cle, c]));
  let modifie = false;
  for (const [cle, valeur] of Object.entries(modifs)) {
    const ref = connues.get(cle);
    if (!ref) throw new Error(`Coefficient inconnu : ${cle}.`);
    if (!(Number.isFinite(valeur) && valeur > 0)) throw new Error(`Le coefficient ${cle} doit être un nombre strictement positif (-).`);
    if (valeur === ref.valeur) continue;
    const segments = cle.split('.');
    let noeud = copie as Record<string, unknown>;
    for (const s of segments.slice(0, -1)) noeud = noeud[s] as Record<string, unknown>;
    noeud[segments[segments.length - 1]] = {
      valeur,
      source: `valeur saisie par l'utilisateur (recommandée : ${nombreAffiche(ref.valeur)}, ${ref.source})`,
    } satisfies ValeurSourcee;
    modifie = true;
  }
  const p = copie as T & { nom?: string };
  if (modifie && typeof p.nom === 'string') p.nom = `${p.nom}, modifiées par l'utilisateur`;
  return p;
}

/** Les coefficients dont la valeur differe du profil de reference. */
export function coefficientsModifies(profil: object, reference: object): { cle: string; valeur: number; recommandee: number }[] {
  const ref = new Map(listerCoefficients(reference).map((c) => [c.cle, c.valeur]));
  return listerCoefficients(profil)
    .filter((c) => ref.has(c.cle) && ref.get(c.cle) !== c.valeur)
    .map((c) => ({ cle: c.cle, valeur: c.valeur, recommandee: ref.get(c.cle) as number }));
}
