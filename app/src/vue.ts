/**
 * Rendu HTML des resultats et des entrees. PUR : aucun calcul ici,
 * tout vient du resultat du noyau (`src/mur.ts`) ou du calcul (`form.ts`).
 */

import { type BlocResultat, lireNombre, nombreAffiche, notationHtml, tauxAffiche } from 'aedificium-ui';
import type { ResultatCombinaison, ResultatMur } from '../../src/mur';
import { coefficientsDe, type Calcul, type Generation, type Saisie } from './form';
import { phrase, textes } from './textes';

/** Nombre affiche : les valeurs non finies passent par `tauxAffiche`. */
const aff = (v: number, d = 1): string => (Number.isFinite(v) ? nombreAffiche(v, d) : tauxAffiche(v));

const APPROCHES_2E = { 'a+b': '(a) + (b)', c: '(c)', d: '(d)' } as const;

/** Symbole mis en forme (indices, lettres grecques). */
const sym = (s: string): string => notationHtml(s);

/** Largeur de jauge, bornee a 100 ; 100 pour un taux infini, 0 pour NaN. */
function largeur(t: number): string {
  if (Number.isNaN(t)) return '0';
  if (!Number.isFinite(t)) return t > 1 ? '100' : '0';
  return String(Math.min(100, Math.max(0, Math.round(t * 1000) / 10)));
}

type Carte = { nom: string; clause: string; taux: number; detail: string };

function carte(c: Carte): string {
  const depasse = c.taux > 1 ? ' depasse' : '';
  return (
    `<div class="verdict${depasse}">` +
    `<h3>${c.nom} <span class="clause">${c.clause}</span></h3>` +
    `<div class="jauge"><i style="width:${largeur(c.taux)}%"></i></div>` +
    `<span class="taux">${tauxAffiche(c.taux)}</span>` +
    `<p>${c.detail}</p>` +
    `</div>`
  );
}

/** Element de plus fort taux ; le premier en cas d'egalite. */
function pire<T>(l: T[], taux: (x: T) => number): T {
  return l.reduce((a, v) => (taux(v) > taux(a) ? v : a), l[0]);
}

const SECTIONS = ['voile', 'patin', 'talon'] as const;

/** Taux d'armature minimale, sans NaN quand l'armature est nulle. */
function tauxMin(x: { As_min: number; As: number }): number {
  if (x.As > 0) return x.As_min / x.As;
  return x.As_min > 0 ? Infinity : 0;
}

export function verdictsHtml(r: ResultatMur): string {
  const t = textes().vue;
  const g2 = r.generation === '2e';

  const clauseRenv = g2
    ? `${t.clauses.renversement2}, ${r.renversement.cas ?? ''}`.trim()
    : t.clauses.renversement1;
  const cG = pire(r.combinaisons, (c) => c.glissement.taux);
  const cP = pire(r.combinaisons, (c) => c.portance.taux);

  const externe = [
    carte({
      nom: t.noms.renversement,
      clause: clauseRenv,
      taux: r.renversement.taux,
      detail:
        `${sym('M_dst,d')} = ${aff(r.renversement.pivot.M_dst_d, 2)} ${t.unités.kNm} ≤ ` +
        `${sym('M_stb,d')} = ${aff(r.renversement.pivot.M_stb_d, 2)} ${t.unités.kNm}`,
    }),
    carte({
      nom: t.noms.glissement,
      clause: `${g2 ? t.clauses.glissement2 : t.clauses.glissement1} · ${phrase(cG.nom)}`,
      taux: cG.glissement.taux,
      detail:
        `${sym('H_d')} = ${aff(cG.glissement.H_d, 1)} ${t.unités.kN} ≤ ` +
        `${sym('R_d')} = ${aff(cG.glissement.R_d, 1)} ${t.unités.kN}`,
    }),
    carte({
      nom: t.noms.portance,
      clause: `${g2 ? t.clauses.portance2 : t.clauses.portance1} · ${phrase(cP.nom)}`,
      taux: cP.portance.taux,
      detail:
        `${sym('V_d')} = ${aff(cP.portance.V, 1)} ${t.unités.kN} ≤ ` +
        `${sym('R_d')} = ${aff(cP.portance.R_d, 1)} ${t.unités.kN}`,
    }),
    carte({
      nom: t.noms.excentricite,
      clause: g2 ? t.clauses.excentricite2 : t.clauses.excentricite1,
      taux: r.excentricite.taux,
      detail:
        `e = ${aff(r.excentricite.e, 3)} ${t.unités.m} ≤ ` +
        `limite = ${aff(r.excentricite.limite, 3)} ${t.unités.m}`,
    }),
  ].join('');

  const sections = SECTIONS.map((s) => {
    const vf = pire(r.combinaisons, (c) => c[s].tauxFlexion)[s];
    const vt = pire(r.combinaisons, (c) => c[s].tauxTranchant)[s];
    const depasse = vf.tauxFlexion > 1 || vt.tauxTranchant > 1 ? ' depasse' : '';
    return (
      `<div class="verdict${depasse}">` +
      `<h3>${t.noms[s]} <span class="clause">${t.noms.flexion} · ${t.noms.tranchant}</span></h3>` +
      `<div class="deux">` +
      `<div><div class="jauge"><i style="width:${largeur(vf.tauxFlexion)}%"></i></div>` +
      `<span class="taux">${tauxAffiche(vf.tauxFlexion)}</span>` +
      `<p>${sym('M_Ed')} = ${aff(vf.M_Ed, 1)} ${t.unités.kNm} ≤ ${sym('M_Rd')} = ${aff(vf.M_Rd, 1)} ${t.unités.kNm}</p>` +
      `<p class="clause">${t.noms.flexion} · ${phrase(vf.casFlexion)}</p></div>` +
      `<div><div class="jauge"><i style="width:${largeur(vt.tauxTranchant)}%"></i></div>` +
      `<span class="taux">${tauxAffiche(vt.tauxTranchant)}</span>` +
      `<p>${sym('V_Ed')} = ${aff(vt.V_Ed, 1)} ${t.unités.kN} ≤ ${sym('V_Rd,c')} = ${aff(vt.V_Rd_c, 1)} ${t.unités.kN}</p>` +
      `<p class="clause">${t.noms.tranchant} · ${phrase(vt.casTranchant)}</p></div>` +
      `</div></div>`
    );
  }).join('');

  const dispositions = SECTIONS.map((s) => {
    const v = pire(r.combinaisons, (c) => tauxMin(c[s]))[s];
    const taux = tauxMin(v);
    return carte({
      nom: `${t.noms.armatureMinimale} · ${t.noms[s]}`,
      clause: g2 ? t.clauses.armatureMin2 : t.clauses.armatureMin1,
      taux,
      detail:
        `${sym('A_s')} = ${aff(v.As, 0)} ${t.unités.mm2} ≥ ` +
        `${sym('A_s,min')} = ${aff(v.As_min, 0)} ${t.unités.mm2}`,    });
  }).join('');

  const alertes = r.avertissements
    .map((a) => `<p class="alerte">${notationHtml(phrase(a))}</p>`)
    .join('');

  return (
    `<section class="groupe-verdicts" data-groupe="externe">` +
    `<h2>${t.groupes.externe}</h2>${externe}</section>` +
    `<section class="groupe-verdicts" data-groupe="sections">` +
    `<h2>${t.groupes.sections}</h2>${sections}</section>` +
    `<section class="groupe-verdicts" data-groupe="dispositions">` +
    `<h2>${t.groupes.dispositions}</h2>${dispositions}</section>` +
    alertes
  );
}

export function voletsHtml(r: ResultatMur): string {
  const t = textes().vue;

  const glissement = r.combinaisons
    .map((c) => {
      const g = c.glissement;
      const p = c.portance;
      return (
        `<tr><td>${phrase(c.nom)}</td>` +
        `<td class="n">${aff(c.phi_d, 1)}</td>` +
        `<td class="n">${aff(g.H_d, 1)}</td>` +
        `<td class="n">${aff(g.N_d, 1)}</td>` +
        `<td class="n">${aff(c.mu_d, 3)}</td>` +
        `<td class="n">${aff(g.R_d, 1)}</td>` +
        `<td class="n">${tauxAffiche(g.taux)}</td>` +
        `<td class="n">${aff(p.V, 1)}</td>` +
        `<td class="n">${aff(p.M, 1)}</td>` +
        `<td class="n">${aff(p.e, 3)}</td>` +
        `<td class="n">${aff(p.Bp, 3)}</td>` +
        `<td class="n">${aff(p.R_d, 1)}</td>` +
        `<td class="n">${tauxAffiche(p.taux)}</td></tr>`
      );
    })
    .join('');

  const renversement = r.renversement.pivot.lignes
    .map(
      (l) =>
        `<tr><td>${phrase(l.elementaire.origine)}</td>` +
        `<td class="n">${aff(l.F, 2)}</td>` +
        `<td class="n">${l.d === null ? '—' : aff(l.d, 3)}</td>` +
        `<td class="n">${aff(l.Md, 2)}</td>` +
        `<td>${t.roles[l.role]}</td></tr>`,
    )
    .join('');

  const cas = r.combinaisons
    .map((c) => {
      const lignes = c.cas
        .map(
          (x) =>
            `<tr${x === c.portance ? ' class="gouverne"' : ''}>` +
            `<td>${phrase(x.nom)}</td>` +
            `<td class="n">${aff(x.V, 1)}</td>` +
            `<td class="n">${aff(x.H, 1)}</td>` +
            `<td class="n">${aff(x.M, 1)}</td>` +
            `<td class="n">${aff(x.e, 3)}</td>` +
            `<td class="n">${aff(x.Bp, 3)}</td>` +
            `<td class="n">${aff(x.R_d, 1)}</td>` +
            `<td class="n">${tauxAffiche(x.taux)}</td></tr>`,
        )
        .join('');
      return (
        `<p class="sous-titre">${phrase(c.nom)}</p>` +
        `<div class="defile"><table><thead><tr><th>${t.volets.cas}</th>` +
        `<th class="n">V</th><th class="n">H</th><th class="n">M</th>` +
        `<th class="n">e</th><th class="n">${sym("B'")}</th><th class="n">${sym('R_d')}</th>` +
        `<th class="n">${t.colonnes.taux}</th></tr></thead><tbody>${lignes}</tbody></table></div>`
      );
    })
    .join('');

  const sections = r.combinaisons
    .map((c) =>
      SECTIONS.map(
        (s) =>
          `<tr><td>${phrase(c.nom)} · ${t.noms[s]}</td>` +
          `<td class="n">${aff(c[s].M_Ed, 1)}</td>` +
          `<td class="n">${aff(c[s].M_Rd, 1)}</td>` +
          `<td class="n">${aff(c[s].V_Ed, 1)}</td>` +
          `<td class="n">${aff(c[s].V_Rd_c, 1)}</td>` +
          `<td class="n">${aff(c[s].As_min, 0)}</td>` +
          `<td class="n">${aff(c[s].As, 0)}</td></tr>`,
      ).join(''),
    )
    .join('');

  const hypotheses = t.hypotheses.map((h) => `<li>${h}</li>`).join('');

  return (
    `<details class="deriv" open><summary>${t.volets.glissementPortance}</summary>` +
    `<div class="defile"><table><thead><tr><th>${t.colonnes.combinaison}</th>` +
    `<th class="n">${sym('φ_d')}</th><th class="n">${sym('H_d')}</th><th class="n">${sym('N_d')}</th>` +
    `<th class="n">${sym('μ_d')}</th><th class="n">${sym('R_d')}</th><th class="n">${t.colonnes.taux}</th>` +
    `<th class="n">V</th><th class="n">M</th><th class="n">e</th>` +
    `<th class="n">${sym("B'")}</th><th class="n">${sym('R_d')}</th><th class="n">${t.colonnes.taux}</th></tr></thead>` +
    `<tbody>${glissement}</tbody></table></div></details>` +
    `<details class="deriv"><summary>${t.volets.renversement}</summary>` +
    `<div class="defile"><table><thead><tr><th>${t.colonnes.action}</th>` +
    `<th class="n">${t.colonnes.effort}</th><th class="n">${t.colonnes.bras}</th>` +
    `<th class="n">Moment (kN·m)</th><th>${t.colonnes.role}</th></tr></thead>` +
    `<tbody>${renversement}</tbody></table>` +
    `<p>${sym('M_dst,d')} = ${aff(r.renversement.pivot.M_dst_d, 2)} kN·m ; ` +
    `${sym('M_stb,d')} = ${aff(r.renversement.pivot.M_stb_d, 2)} kN·m.</p></div></details>` +
    `<details class="deriv"><summary>${t.volets.cas}</summary>${cas}</details>` +
    `<details class="deriv"><summary>${t.volets.sections}</summary>` +
    `<div class="defile"><table><thead><tr><th>${t.colonnes.section}</th>` +
    `<th class="n">${sym('M_Ed')}</th><th class="n">${sym('M_Rd')}</th><th class="n">${sym('V_Ed')}</th>` +
    `<th class="n">${sym('V_Rd,c')}</th><th class="n">${sym('A_s,min')}</th><th class="n">${sym('A_s')}</th>` +
    `</tr></thead><tbody>${sections}</tbody></table></div></details>` +
    `<details class="deriv"><summary>${t.volets.hypotheses}</summary>` +
    `<div><ul>${hypotheses}</ul></div></details>`
  );
}

/** Symbole d'un coefficient du profil, d'apres sa cle (`R2.gRv` donne `γ_R,v`). */
const SYMBOLES_1RE: Record<string, string> = {
  gG_dst: 'γ_G,dst',
  gG_stb: 'γ_G,stb',
  gQ_dst: 'γ_Q',
  gPhi: "γ_phi'",
  gC: "γ_c'",
  gRv: 'γ_R,v',
  gRh: 'γ_R,h',
};
const SYMBOLES_BETON: Record<string, string> = { gC: 'γ_C', gS: 'γ_S', alphaCc: 'α_cc', cRdc: 'C_Rd,c γ_C', k1: 'k_1', gV: 'γ_V' };
const SYMBOLES_2E: Record<string, string> = {
  gG: 'γ_G',
  gQ: 'γ_Q',
  gG_fav: 'γ_G,fav',
  gG_stb_VC2a: 'γ_G,stb VC2(a)',
  gG_VC3: 'γ_G VC3',
  gQ_VC3: 'γ_Q VC3',
  gM2: 'γ_M2',
  gRN: 'γ_R,N',
  gRT: 'γ_R,T',
};

export function symboleCoefficient(cle: string): string {
  const segments = cle.split('.');
  const feuille = segments[segments.length - 1];
  if (segments[0] === 'beton') return SYMBOLES_BETON[feuille] ?? feuille;
  if (segments.length === 1) return SYMBOLES_2E[feuille] ?? SYMBOLES_BETON[feuille] ?? feuille;
  if (['kF', 'kM', 'kR'].includes(segments[0])) return `k_${segments[0].slice(1)} ${feuille}`;
  return SYMBOLES_1RE[feuille] ?? feuille;
}

/** Jeu auquel appartient un coefficient, dans la langue courante. */
export function groupeCoefficient(cle: string): string {
  const g = textes().vue.coefficients.groupes;
  const segments = cle.split('.');
  if (segments.length > 1) {
    const deux = `${segments[0]}.${segments[1]}` as keyof typeof g;
    return g[deux] ?? g[segments[0] as keyof typeof g] ?? segments[0];
  }
  const f = segments[0];
  if (['gC', 'gS', 'gV'].includes(f)) return g.beton2;
  if (f === 'gM2') return g.materiaux2;
  if (f === 'gRN' || f === 'gRT') return g.resistances2;
  return g.actions2;
}

/** Tous les symboles de coefficients, pour ranger les lignes de la note. */
export function estSymboleCoefficient(symbole: string): boolean {
  return (['1re', '2e'] as const).some((g) => coefficientsDe(g).some((c) => symboleCoefficient(c.cle) === symbole));
}

/** Nombre saisi tel quel, valeur recommandee a la virgule. */
const affCoef = (v: number): string => nombreAffiche(v, v === Math.round(v * 100) / 100 ? 2 : 3);

/**
 * Tableau des coefficients modifiables de la generation courante. Chaque champ
 * porte `data-coef` ; vide, il reprend la valeur recommandee, rappelee a cote.
 */
export function coefficientsHtml(s: Saisie, generation: Generation = s.generation): string {
  const t = textes().vue.coefficients;
  const table = generation === '1re' ? s.coefficients1 : s.coefficients2;
  const liste = coefficientsDe(generation);
  const modifies = liste.filter((c) => {
    const v = lireNombre(table[c.cle] ?? '');
    return v !== null && v !== c.valeur;
  }).length;
  let groupePrecedent = '';
  const lignes = liste
    .map((c) => {
      const brut = table[c.cle] ?? '';
      const titre = c.source.replace(/"/g, '&quot;');
      const groupe = groupeCoefficient(c.cle);
      const entete = groupe === groupePrecedent ? '' : `<tr class="groupe-coef"><th colspan="3">${sym(groupe)}</th></tr>`;
      groupePrecedent = groupe;
      return (
        `${entete}<tr><td>${sym(symboleCoefficient(c.cle))}</td>` +
        `<td><input type="text" inputmode="decimal" data-coef="${c.cle}" value="${brut.replace(/"/g, '&quot;')}" placeholder="${affCoef(c.valeur)}" aria-label="${c.cle}" /></td>` +
        `<td class="n" title="${titre}">${affCoef(c.valeur)}</td></tr>`
      );
    })
    .join('');
  return (
    `<details class="deriv coefficients"><summary>${t.titre} : <span data-role="resume-coefficients">${t.resume(modifies)}</span></summary>` +
    `<p>${t.aide}</p>` +
    `<table class="coefficients"><thead><tr><th>${t.symbole}</th>` +
    `<th>${t.valeur}</th><th class="n">${t.recommandee}</th></tr></thead><tbody>${lignes}</tbody></table>` +
    `<button type="button" data-action="coefficients-recommandes">${t.revenir}</button></details>`
  );
}

export function blocEntrees(calcul: Calcul): BlocResultat {
  const t = textes().vue;
  const e = t.entrees;
  const d = calcul.donnees;
  const lignes: { symbole: string; libelle: string; valeur: string }[] = [];
  const ligne = (symbole: string, libelle: string, valeur: string): void => {
    lignes.push({ symbole, libelle, valeur });
  };

  ligne(e.symboleGeneration, e.generation, t.generations[calcul.generation]);
  if (calcul.generation === '1re') {
    ligne(e.symboleApproche, e.approche, calcul.donnees.approche);
  } else {
    const x = calcul.donnees;
    ligne(e.symboleApproche, e.approche, APPROCHES_2E[x.approche]);
    ligne(e.symboleClasse, e.classe, x.consequences);
    ligne(e.symboleDimensions, e.dimensions, x.dimensionsControlees ? e.oui : e.non);
    ligne(e.symboleProfondeur, e.profondeur, x.profondeurComptee ? e.oui : e.non);
    ligne('D_lower', e.dLower, `${aff(x.Dlower, 0)} mm`);
  }
  ligne(e.symboleSourceUnique, e.sourceUnique, d.sourceUnique ? e.oui : e.non);
  ligne(e.symboleTalonPrisme, e.talonPrisme, d.talonPrisme ? e.oui : e.non);
  ligne(e.symboleFrottementBase, e.frottementBase, d.frottementBase ? e.oui : e.non);
  const modifs = Object.entries(calcul.modifs);
  if (modifs.length === 0) ligne(e.symboleCoefficients, e.coefficients, e.recommandees);
  const reference = new Map(coefficientsDe(calcul.generation).map((c) => [c.cle, c.valeur]));
  for (const [cle, v] of modifs) {
    ligne(symboleCoefficient(cle), e.coefficientModifie(groupeCoefficient(cle)), e.valeurModifiee(affCoef(v), affCoef(reference.get(cle) ?? NaN)));
  }

  const geo = d.geometrie;
  ligne('h', e.h, `${aff(geo.h, 3)} m`);
  ligne('e_haut', e.eHaut, `${aff(geo.eHaut, 3)} m`);
  ligne('e_bas', e.eBas, `${aff(geo.eBas, 3)} m`);
  ligne('e_s', e.es, `${aff(geo.es, 3)} m`);
  ligne('patin', e.patin, `${aff(geo.patin, 3)} m`);
  ligne('talon', e.talon, `${aff(geo.talon, 3)} m`);

  ligne('gamma_c', e.gammaBeton, `${aff(d.gammaBeton, 2)} kN/m³`);

  const remblai = d.remblai;
  ligne('gamma', e.remblaiGamma, `${aff(remblai.gamma, 2)} kN/m³`);
  ligne("phi'", e.remblaiPhi, `${aff(remblai.phi, 1)} °`);
  ligne('q', e.surcharge, `${aff(remblai.q, 1)} kPa`);
  ligne('K_a', e.partKa, `${aff((remblai.partKa ?? 1) * 100, 0)} %`);
  ligne("delta_p/phi'", e.deltaParement, aff(remblai.deltaParement ?? 0, 3));
  (remblai.charges ?? []).forEach((ch, i) => {
    ligne(e.symboleBande(i + 1), e.bande(i + 1), e.valeurBande(ch.nature, aff(ch.q, 1), aff(ch.distance, 2), aff(ch.largeur, 2)));
  });

  const fondation = d.fondation;
  ligne("phi'_b", e.fondationPhi, `${aff(fondation.phi, 1)} °`);
  ligne('delta/phi', e.deltaSurPhi, aff(fondation.deltaSurPhi, 2));
  const portance = fondation.portance;
  if (portance.mode === 'annexeD') {
    ligne("c'", e.portanceC, `${aff(portance.c, 1)} kPa`);
    ligne('gamma_b', e.portanceGamma, `${aff(portance.gamma, 2)} kN/m³`);
    ligne('D', e.portanceD, `${aff(portance.D, 3)} m`);
  } else {
    ligne('q_Rd', e.qRd, `${aff(portance.qRd, 1)} kPa`);
  }

  ligne('f_ck', e.fck, `${aff(d.armatures.fck, 1)} MPa`);
  ligne('f_yk', e.fyk, `${aff(d.armatures.fyk, 1)} MPa`);
  ligne('a', e.axe, `${aff(d.armatures.a, 0)} mm`);

  const cles = ['voileArriere', 'voileAvant', 'semelleHaut', 'semelleBas'] as const;
  cles.forEach((cle, i) => {
    const b = calcul.barres[cle];
    const vide = d.armatures[cle] === 0;
    ligne(`A_s${i + 1}`, e.armatures[cle], vide ? e.aucune : `HA${b.diametre} / ${b.espacement} mm, ${nombreAffiche(d.armatures[cle], 0)} mm²/m`);
  });

  return { titre: e.titre, lignes, note: null };
}

/** Glissement et portance d'une combinaison. */
function blocCombinaison(c: ResultatCombinaison): BlocResultat {
  const n = textes().note;
  const taux = textes().vue.entrees.symboleTaux;
  return {
    titre: `${n.glissementPortance} · ${phrase(c.nom)}`,
    lignes: [
      { symbole: 'H_d', libelle: n.glissement, valeur: `${aff(c.glissement.H_d)} kN` },
      { symbole: 'N_d', libelle: n.glissement, valeur: `${aff(c.glissement.N_d)} kN` },
      { symbole: 'R_d', libelle: n.glissement, valeur: `${aff(c.glissement.R_d)} kN` },
      { symbole: taux, libelle: n.glissement, valeur: tauxAffiche(c.glissement.taux) },
      { symbole: 'V', libelle: n.portance, valeur: `${aff(c.portance.V)} kN` },
      { symbole: 'e', libelle: n.portance, valeur: `${aff(c.portance.e, 3)} m` },
      { symbole: "B'", libelle: n.portance, valeur: `${aff(c.portance.Bp, 3)} m` },
      { symbole: 'R_d', libelle: n.portance, valeur: `${aff(c.portance.R_d)} kN` },
      { symbole: taux, libelle: n.portance, valeur: tauxAffiche(c.portance.taux) },
    ],
    note: null,
  };
}

/** Efforts et resistances des trois sections d'une combinaison. */
function blocSections(c: ResultatCombinaison): BlocResultat {
  const n = textes().note;
  return {
    titre: `${n.sections} · ${phrase(c.nom)}`,
    lignes: ([[n.voile, c.voile], [n.patin, c.patin], [n.talon, c.talon]] as const).flatMap(([nom, s]) => [
      { symbole: 'M_Ed', libelle: nom, valeur: `${aff(s.M_Ed)} kN·m` },
      { symbole: 'M_Rd', libelle: nom, valeur: `${aff(s.M_Rd)} kN·m` },
      { symbole: 'V_Ed', libelle: nom, valeur: `${aff(s.V_Ed)} kN` },
      { symbole: 'V_Rd,c', libelle: nom, valeur: `${aff(s.V_Rd_c)} kN` },
      { symbole: 'A_s,min', libelle: nom, valeur: `${aff(s.As_min, 0)} mm²/m` },
      { symbole: 'A_s', libelle: nom, valeur: `${aff(s.As, 0)} mm²/m` },
    ]),
    note: null,
  };
}

/** Le detail du calcul, pour la note et le CSV : renversement, puis chaque combinaison. */
export function blocsCalcul(r: ResultatMur): BlocResultat[] {
  const n = textes().note;
  const taux = textes().vue.entrees.symboleTaux;
  return [
    {
      titre: n.renversement,
      lignes: [
        { symbole: 'M_dst,d', libelle: n.renversement, valeur: `${aff(r.renversement.pivot.M_dst_d)} kN·m` },
        { symbole: 'M_stb,d', libelle: n.renversement, valeur: `${aff(r.renversement.pivot.M_stb_d)} kN·m` },
        { symbole: taux, libelle: n.renversement, valeur: tauxAffiche(r.renversement.pivot.taux) },
      ],
      note: null,
    },
    ...r.combinaisons.flatMap((c) => [blocCombinaison(c), blocSections(c)]),
  ];
}

export function blocsResultat(r: ResultatMur): BlocResultat[] {
  const t = textes().vue;
  return [
    {
      titre: t.resultats,
      lignes: [
        { symbole: 'externe', libelle: t.groupes.externe, valeur: tauxAffiche(r.tauxExterne) },
        { symbole: 'sections', libelle: t.groupes.sections, valeur: tauxAffiche(r.tauxSections) },
        { symbole: 'dispositions', libelle: t.groupes.dispositions, valeur: tauxAffiche(r.tauxDispositions) },
      ],
      note: null,
    },
    ...blocsCalcul(r),
  ];
}

export function messageDErreur(e: unknown): string {
  return phrase(e instanceof Error ? e.message : String(e));
}
