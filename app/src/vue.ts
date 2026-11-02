/**
 * Rendu HTML des resultats et des entrees. PUR : aucun calcul ici,
 * tout vient du resultat du noyau (`src/mur.ts`) ou du calcul (`form.ts`).
 */

import { type BlocResultat, nombreAffiche, notationHtml, tauxAffiche } from 'aedificium-ui';
import type { ResultatMur } from '../../src/mur';
import type { Calcul } from './form';
import { phrase, textes } from './textes';

/** Nombre affiche : les valeurs non finies passent par `tauxAffiche`. */
const aff = (v: number, d = 1): string => (Number.isFinite(v) ? nombreAffiche(v, d) : tauxAffiche(v));

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
      clause: `${g2 ? t.clauses.glissement2 : t.clauses.glissement1} · ${cG.nom}`,
      taux: cG.glissement.taux,
      detail:
        `${sym('H_d')} = ${aff(cG.glissement.H_d, 1)} ${t.unités.kN} ≤ ` +
        `${sym('R_d')} = ${aff(cG.glissement.R_d, 1)} ${t.unités.kN}`,
    }),
    carte({
      nom: t.noms.portance,
      clause: `${g2 ? t.clauses.portance2 : t.clauses.portance1} · ${cP.nom}`,
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
      `<p>${t.noms.flexion} · ${vf.casFlexion}</p></div>` +
      `<div><div class="jauge"><i style="width:${largeur(vt.tauxTranchant)}%"></i></div>` +
      `<span class="taux">${tauxAffiche(vt.tauxTranchant)}</span>` +
      `<p>${t.noms.tranchant} · ${vt.casTranchant}</p></div>` +
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
        `<tr><td>${c.nom}</td>` +
        `<td class="n">${aff(c.phi_d, 3)}</td>` +
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
        `<tr><td>${l.elementaire.origine}</td>` +
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
            `<td>${x.nom}</td>` +
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
        `<p class="sous-titre">${c.nom}</p>` +
        `<div class="defile"><table><thead><tr><th>${t.volets.cas}</th>` +
        `<th class="n">V</th><th class="n">H</th><th class="n">M</th>` +
        `<th class="n">e</th><th class="n">${sym("B'")}</th><th class="n">${sym('R_d')}</th>` +
        `<th class="n">Taux</th></tr></thead><tbody>${lignes}</tbody></table></div>`
      );
    })
    .join('');

  const sections = r.combinaisons
    .map((c) =>
      SECTIONS.map(
        (s) =>
          `<tr><td>${c.nom} · ${t.noms[s]}</td>` +
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
    `<div class="defile"><table><thead><tr><th>Combinaison</th>` +
    `<th class="n">${sym('φ_d')}</th><th class="n">${sym('H_d')}</th><th class="n">${sym('N_d')}</th>` +
    `<th class="n">${sym('μ_d')}</th><th class="n">${sym('R_d')}</th><th class="n">Taux</th>` +
    `<th class="n">V</th><th class="n">M</th><th class="n">e</th>` +
    `<th class="n">${sym("B'")}</th><th class="n">${sym('R_d')}</th><th class="n">Taux</th></tr></thead>` +
    `<tbody>${glissement}</tbody></table></div></details>` +
    `<details class="deriv"><summary>${t.volets.renversement}</summary>` +
    `<div class="defile"><table><thead><tr><th>Action</th>` +
    `<th class="n">Effort (kN)</th><th class="n">Bras (m)</th>` +
    `<th class="n">Moment (kN·m)</th><th>Rôle</th></tr></thead>` +
    `<tbody>${renversement}</tbody></table>` +
    `<p>${sym('M_dst,d')} = ${aff(r.renversement.pivot.M_dst_d, 2)} kN·m ; ` +
    `${sym('M_stb,d')} = ${aff(r.renversement.pivot.M_stb_d, 2)} kN·m.</p></div></details>` +
    `<details class="deriv"><summary>${t.volets.cas}</summary>${cas}</details>` +
    `<details class="deriv"><summary>${t.volets.sections}</summary>` +
    `<div class="defile"><table><thead><tr><th>Section</th>` +
    `<th class="n">${sym('M_Ed')}</th><th class="n">${sym('M_Rd')}</th><th class="n">${sym('V_Ed')}</th>` +
    `<th class="n">${sym('V_Rd,c')}</th><th class="n">${sym('A_s,min')}</th><th class="n">${sym('A_s')}</th>` +
    `</tr></thead><tbody>${sections}</tbody></table></div></details>` +
    `<details class="deriv"><summary>${t.volets.hypotheses}</summary>` +
    `<div><ul>${hypotheses}</ul></div></details>`
  );
}

export function blocEntrees(calcul: Calcul): BlocResultat {
  const t = textes().vue;
  const d = calcul.donnees;
  const lignes: { symbole: string; libelle: string; valeur: string }[] = [];
  const ligne = (symbole: string, libelle: string, valeur: string): void => {
    lignes.push({ symbole, libelle, valeur });
  };

  const approche =
    calcul.generation === '1re' ? calcul.donnees.approche : `CC2 ${calcul.donnees.approche}`;

  ligne(t.entrees.symboleGeneration, t.entrees.generation, calcul.generation);
  ligne('approche', t.entrees.approche, approche);

  const geo = d.geometrie;
  ligne('h', t.entrees.h, aff(geo.h, 3));
  ligne('e_haut', t.entrees.eHaut, aff(geo.eHaut, 3));
  ligne('e_bas', t.entrees.eBas, aff(geo.eBas, 3));
  ligne('es', t.entrees.es, aff(geo.es, 3));
  ligne('patin', t.entrees.patin, aff(geo.patin, 3));
  ligne('talon', t.entrees.talon, aff(geo.talon, 3));

  ligne('gamma_beton', t.entrees.gammaBeton, aff(d.gammaBeton, 2));

  const remblai = d.remblai;
  ligne('gamma_remblai', t.entrees.remblaiGamma, aff(remblai.gamma, 2));
  ligne('phi_remblai', t.entrees.remblaiPhi, aff(remblai.phi, 1));
  ligne('q', t.entrees.surcharge, aff(remblai.q, 1));
  const partKa = Number(remblai.partKa);
  ligne('K_a', t.entrees.partKa, `${aff(partKa <= 1 ? partKa * 100 : partKa, 0)} %`);
  (remblai.charges ?? []).forEach((ch, i) => {
    ligne(
      `bande ${i + 1}`,
      t.entrees.bande(i + 1),
      `${ch.nature} ${aff(ch.q, 0)} kPa, à ${aff(ch.distance, 1)} m, ` +
        `largeur ${aff(ch.largeur, 1)} m`,
    );
  });

  const fondation = d.fondation;
  ligne('phi_fondation', t.entrees.fondationPhi, aff(fondation.phi, 1));
  ligne('delta_sur_phi', t.entrees.deltaSurPhi, aff(fondation.deltaSurPhi, 2));
  const portance = fondation.portance;
  if (portance.mode === 'annexeD') {
    ligne('portance_phi', t.entrees.portancePhi, aff(portance.phi, 1));
    ligne('portance_c', t.entrees.portanceC, aff(portance.c, 1));
    ligne('portance_gamma', t.entrees.portanceGamma, aff(portance.gamma, 2));
    ligne('portance_D', t.entrees.portanceD, aff(portance.D, 3));
  } else {
    ligne('q_Rd', t.entrees.qRd, aff(portance.qRd, 3));
  }

  ligne('f_ck', t.entrees.fck, aff(d.armatures.fck, 1));
  ligne('f_yk', t.entrees.fyk, aff(d.armatures.fyk, 1));

  const cles = ['voileArriere', 'voileAvant', 'semelleHaut', 'semelleBas'] as const;
  for (const cle of cles) {
    const b = calcul.barres[cle];
    const a = d.armatures[cle];
    const vide = Number(b.diametre) === 0;
    ligne(
      `a_${cle}`,
      t.entrees.armatures[cle],
      vide ? t.entrees.aucune : `HA${b.diametre} / ${b.espacement} mm, ${nombreAffiche(a, 0)} mm²/m`,
    );
  }

  return { titre: t.entrees.titre, lignes, note: null };
}

export function blocsResultat(r: ResultatMur): BlocResultat[] {
  const t = textes().vue;
  return [
    {
      titre: t.resultats,
      lignes: [
        { symbole: 'taux_externe', libelle: t.groupes.externe, valeur: tauxAffiche(r.tauxExterne) },
        { symbole: 'taux_sections', libelle: t.groupes.sections, valeur: tauxAffiche(r.tauxSections) },
        {
          symbole: 'taux_dispositions',
          libelle: t.groupes.dispositions,
          valeur: tauxAffiche(r.tauxDispositions),
        },
      ],
      note: null,
    },
  ];
}

export function messageDErreur(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}
