/**
 * Contenu de la note de calcul commune (`noteDeCalculHtml` d'aedificium-ui).
 *
 * Module PUR. Les lignes viennent des memes fonctions que l'ecran
 * (`blocEntrees`) et du resultat du noyau ; elles ne sont ici que rangees.
 */

import type { ElementNote, LigneResultat, NoteDeCalcul, VerificationNote } from 'aedificium-ui';
import { nombreAffiche, tauxAffiche } from 'aedificium-ui';
import type { ResultatCombinaison, ResultatMur, VerifSection } from '../../src/mur';
import type { Calcul } from './form';
import { coupe, projectionSvg, vuesDisponibles } from './dessin';
import { textes } from './textes';
import { blocEntrees, messageDErreur } from './vue';

const NORMES: Record<ResultatMur['generation'], string> = {
  '1re': 'EN 1997-1:2004, EN 1992-1-1:2004',
  '2e': 'EN 1997-1:2024, EN 1997-3:2025, EN 1990:2023, EN 1992-1-1:2023',
};

/** Nombre affiche : les valeurs non finies passent par `tauxAffiche` (jamais « NaN »). */
const aff = (v: number, d = 1): string => (Number.isFinite(v) ? nombreAffiche(v, d) : tauxAffiche(v));

type Section = 'geometrie' | 'materiaux' | 'hypotheses' | 'charges';

/** Rangement des lignes d'entree par symbole ; un symbole inconnu va en geometrie. */
function sectionDe(symbole: string): Section {
  if (symbole === 'f_ck' || symbole === 'f_yk' || symbole === 'gamma_beton') return 'materiaux';
  if (symbole === 'génération' || symbole === 'generation' || symbole === 'approche') return 'hypotheses';
  if (symbole.startsWith('bande ') || symbole === 'q' || symbole === 'K_a') return 'charges';
  return 'geometrie';
}

const ok = (taux: number): boolean => Number.isFinite(taux) && taux <= 1;

function verif(nom: string, clause: string, taux: number): VerificationNote {
  return { nom, clause, taux, ok: ok(taux) };
}

function tauxArmatureMin(s: VerifSection): number {
  return s.As > 0 ? s.As_min / s.As : Infinity;
}

function verificationsDe(r: ResultatMur): VerificationNote[] {
  const t = textes();
  const clauses = t.vue.clauses;
  const g2 = r.generation === '2e';
  const out: VerificationNote[] = [
    verif(
      t.note.renversement,
      g2 ? `${clauses.renversement2}, ${r.renversement.cas ?? ''}`.trim() : clauses.renversement1,
      r.renversement.taux
    ),
    verif(
      t.note.excentricite,
      g2 ? clauses.excentricite2 : clauses.excentricite1,
      r.excentricite.taux
    ),
  ];

  for (const c of r.combinaisons) {
    out.push(
      verif(`${c.nom} · ${t.note.glissement}`, `${g2 ? clauses.glissement2 : clauses.glissement1} · ${c.nom}`, c.glissement.taux),
      verif(`${c.nom} · ${t.note.portance}`, `${g2 ? clauses.portance2 : clauses.portance1} · ${c.nom}`, c.portance.taux)
    );
  }

  const flexion = g2 ? '§8.1' : '§6.1';
  const tranchant = g2 ? '(8.20)' : '§6.2.2';
  const armatureMin = g2 ? clauses.armatureMin2 : clauses.armatureMin1;
  const sections: [string, VerifSection][] = [];

  for (const c of r.combinaisons) {
    sections.length = 0;
    sections.push([t.note.voile, c.voile], [t.note.patin, c.patin], [t.note.talon, c.talon]);
    for (const [nom, s] of sections) {
      out.push(
        verif(`${c.nom} · ${nom} · ${t.note.flexion}`, flexion, s.tauxFlexion),
        verif(`${c.nom} · ${nom} · ${t.note.tranchant}`, tranchant, s.tauxTranchant),
        verif(`${c.nom} · ${nom} · ${t.note.armatureMin}`, armatureMin, tauxArmatureMin(s))
      );
    }
  }

  return out;
}

interface TextesNote {
  renversement: string;
  glissement: string;
  portance: string;
  sections: string;
  glissementPortance: string;
  excentricite: string;
  flexion: string;
  tranchant: string;
  armatureMin: string;
  voile: string;
  patin: string;
  talon: string;
  hd: string;
  mDst: string;
  mStb: string;
  rdGlissement: string;
  v: string;
  bp: string;
  rdPortance: string;
  mEd: string;
  mRd: string;
  vEd: string;
  vRdc: string;
  asMin: string;
  as: string;
  legendeCoupe: string;
  legendeCharges: string;
  hypotheses: string[];
  mention: string;
  element: string;
}

function bloc(titre: string, lignes: LigneResultat[]): ElementNote {
  return { type: 'bloc', bloc: { titre, lignes, note: null } };
}

function blocCombinaison(c: ResultatCombinaison, n: TextesNote): ElementNote {
  const lignes: LigneResultat[] = [
    { symbole: 'H_d', libelle: n.hd, valeur: aff(c.glissement.H_d) },
    { symbole: 'R_d', libelle: n.rdGlissement, valeur: aff(c.glissement.R_d) },
    { symbole: 'taux_glissement', libelle: `taux ${n.glissement}`, valeur: tauxAffiche(c.glissement.taux) },
    { symbole: 'V', libelle: n.v, valeur: aff(c.portance.V) },
    { symbole: "B'", libelle: n.bp, valeur: aff(c.portance.Bp, 3) },
    { symbole: 'R_d_portance', libelle: n.rdPortance, valeur: aff(c.portance.R_d) },
    { symbole: 'taux_portance', libelle: `taux ${n.portance}`, valeur: tauxAffiche(c.portance.taux) },
  ];
  return bloc(`${n.glissementPortance} · ${c.nom}`, lignes);
}

function blocSections(c: ResultatCombinaison, n: TextesNote): ElementNote {
  const sections: [string, VerifSection][] = [
    [n.voile, c.voile],
    [n.patin, c.patin],
    [n.talon, c.talon],
  ];
  const lignes: LigneResultat[] = [];
  for (const [nom, s] of sections) {
    lignes.push(
      { symbole: 'M_Ed', libelle: `${nom} · ${n.mEd}`, valeur: aff(s.M_Ed) },
      { symbole: 'M_Rd', libelle: `${nom} · ${n.mRd}`, valeur: aff(s.M_Rd) },
      { symbole: 'V_Ed', libelle: `${nom} · ${n.vEd}`, valeur: aff(s.V_Ed) },
      { symbole: 'V_Rd_c', libelle: `${nom} · ${n.vRdc}`, valeur: aff(s.V_Rd_c) },
      { symbole: 'A_s_min', libelle: `${nom} · ${n.asMin}`, valeur: aff(s.As_min, 0) },
      { symbole: 'A_s', libelle: `${nom} · ${n.as}`, valeur: aff(s.As, 0) }
    );
  }
  return bloc(`${n.sections} · ${c.nom}`, lignes);
}

/** Note du calcul courant, sans verdict global. */
export function noteDuCalcul(
  calcul: Calcul,
  r: ResultatMur,
  cartouche: { projet: string; element: string; date: string }
): NoteDeCalcul {
  const t = textes();
  const n = t.note as TextesNote;

  const entrees = blocEntrees(calcul);
  const lignes = (s: Section): LigneResultat[] => entrees.lignes.filter((l) => sectionDe(l.symbole) === s);

  const renversement: ElementNote = {
    type: 'bloc',
    bloc: {
      titre: n.renversement,
      lignes: [
        { symbole: 'M_dst', libelle: n.mDst, valeur: aff(r.renversement.pivot.M_dst_d) },
        { symbole: 'M_stb', libelle: n.mStb, valeur: aff(r.renversement.pivot.M_stb_d) },
        { symbole: 'taux_renversement', libelle: `taux ${n.renversement}`, valeur: tauxAffiche(r.renversement.pivot.taux) },
      ],
      note: null,
    },
  };

  const calculs: ElementNote[] = [renversement];
  for (const c of r.combinaisons) {
    calculs.push(blocCombinaison(c, n), blocSections(c, n));
  }

  const projection = projectionSvg(calcul, r.combinaisons[0].phi_d);
  const charges: ElementNote[] = [bloc(t.vue.entrees.titre, lignes('charges'))];
  if (projection !== '') charges.push({ type: 'figure', svg: projection, legende: n.legendeCharges });

  return {
    cartouche: {
      projet: cartouche.projet,
      element: cartouche.element.trim() === '' ? n.element : cartouche.element,
      date: cartouche.date,
      norme: NORMES[r.generation],
      outil: 'mur-en-l',
    },
    sections: {
      geometrie: [
        bloc(t.vue.entrees.titre, lignes('geometrie')),
        { type: 'figure', svg: coupe(calcul, r, vuesDisponibles(r)[0], { cotes: true, bras: true }), legende: n.legendeCoupe },
      ],
      materiaux: [bloc(t.vue.entrees.titre, lignes('materiaux'))],
      hypotheses: [bloc(t.vue.entrees.titre, lignes('hypotheses')), { type: 'liste', items: n.hypotheses }, { type: 'texte', texte: n.mention }],
      charges,
      calculs,
    },
    verifications: verificationsDe(r),
    avertissements: r.avertissements.map(messageDErreur),
  };
}
