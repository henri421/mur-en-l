/**
 * Contenu de la note de calcul commune (`noteDeCalculHtml` d'aedificium-ui).
 *
 * Module PUR. Les lignes viennent des memes fonctions que l'ecran
 * (`blocEntrees`) et du resultat du noyau ; elles ne sont ici que rangees.
 */

import type { ElementNote, LigneResultat, NoteDeCalcul, VerificationNote } from 'aedificium-ui';
import type { ResultatMur, VerifSection } from '../../src/mur';
import type { Calcul } from './form';
import { coupe, projectionSvg, vuesDisponibles } from './dessin';
import { phrase, textes } from './textes';
import { blocEntrees, blocsCalcul, estSymboleCoefficient, messageDErreur } from './vue';

const NORMES: Record<ResultatMur['generation'], string> = {
  '1re': 'EN 1997-1:2004, EN 1992-1-1:2004',
  '2e': 'EN 1997-1:2024, EN 1997-3:2025, EN 1990:2023, EN 1992-1-1:2023',
};

const MATERIAUX = new Set(['f_ck', 'f_yk', 'gamma_c', 'D_lower', 'gamma', "phi'", "phi'_b", 'delta/phi', "c'", 'gamma_b', 'q_Rd']);
const HYPOTHESES = new Set([
  'génération', 'generation', 'approche', 'approach', 'classe', 'class', 'dimensions', 'profondeur', 'depth',
  'source unique', 'single source', 'coefficients', 'factors',
  'bloc du talon', 'heel block', 'frottement de base', 'base friction', "delta_p/phi'",
]);

type Section = 'geometrie' | 'materiaux' | 'hypotheses' | 'charges';

/** Rangement des lignes d'entree par symbole ; un symbole inconnu va en geometrie. */
function sectionDe(symbole: string): Section {
  if (MATERIAUX.has(symbole)) return 'materiaux';
  if (HYPOTHESES.has(symbole) || estSymboleCoefficient(symbole)) return 'hypotheses';
  if (/^(bande|strip) /.test(symbole) || symbole === 'q' || symbole === 'K_a') return 'charges';
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
      verif(`${phrase(c.nom)} · ${t.note.glissement}`, `${g2 ? clauses.glissement2 : clauses.glissement1} · ${phrase(c.nom)}`, c.glissement.taux),
      verif(`${phrase(c.nom)} · ${t.note.portance}`, `${g2 ? clauses.portance2 : clauses.portance1} · ${phrase(c.nom)}`, c.portance.taux)
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
        verif(`${phrase(c.nom)} · ${nom} · ${t.note.flexion}`, flexion, s.tauxFlexion),
        verif(`${phrase(c.nom)} · ${nom} · ${t.note.tranchant}`, tranchant, s.tauxTranchant),
        verif(`${phrase(c.nom)} · ${nom} · ${t.note.armatureMin}`, armatureMin, tauxArmatureMin(s))
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

  const calculs: ElementNote[] = blocsCalcul(r).map((b) => ({ type: 'bloc', bloc: b }));

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
