/**
 * La saisie, en chaines, et sa conversion en donnees du noyau. PUR.
 *
 * UNE SEULE saisie pour les deux generations : basculer de l'une a l'autre ne
 * change que la generation, jamais les valeurs saisies. Les champs propres a
 * une generation (approche en 1re, consequences et D_lower en 2e) sont
 * conserves quand l'autre est active, simplement ignores.
 */

import { langueCourante, lireNombre } from 'aedificium-ui';
import {
  deriverProfil,
  listerCoefficients,
  profil2eRecommande,
  profilRecommande,
  verifierMur,
  verifierMur2e,
} from '../../src/index';
import type { ResultatMur } from '../../src/index';
import { textes } from './textes';

export type Generation = '1re' | '2e';
export type Approche1 = 'DA1' | 'DA2' | 'DA2*' | 'DA3';
export type Approche2 = 'a+b' | 'c' | 'd';
export type ClasseConsequences = 'CC1' | 'CC2' | 'CC3';
export type ModePortance = 'annexeD' | 'saisie';
export type MethodeBandes = 'diffusion' | 'din4085';

/** Armature saisie en barres : diametre et espacement, convertis par `aireParMetre`. */
export interface ArmatureSaisie {
  diametre: string;
  espacement: string;
}

/** Une action variable telle que saisie ; gamma vide : celui du profil. */
export interface ActionSaisie {
  nom: string;
  psi0: string;
  gammaA1: string;
  gammaA2: string;
}

/** Action variable implicite des charges Q sans action choisie. */
export const ACTION_PAR_DEFAUT = 'Q';

/** Les actions du LM1 de l'EN 1991-2 : tandem TS et charge repartie UDL (EN 1990 A2, tableaux A2.1 et A2.4). */
export function actionsLM1(): ActionSaisie[] {
  return [
    { nom: 'TS', psi0: '0,75', gammaA1: '1,35', gammaA2: '1,15' },
    { nom: 'UDL', psi0: '0,4', gammaA1: '1,35', gammaA2: '1,15' },
  ];
}

/** Une charge repartie de largeur finie, telle que saisie. */
export interface BandeSaisie {
  nature: 'G' | 'Q';
  /** Action variable d'une bande Q ; absente : `ACTION_PAR_DEFAUT`. */
  action?: string;
  q: string;
  distance: string;
  largeur: string;
}

export interface Saisie {
  generation: Generation;
  approche1: Approche1;
  approche2: Approche2;
  consequences: ClasseConsequences;
  /** Principe de source unique pour les terres sur le talon. */
  sourceUnique: boolean;
  /** Bloc du talon avec ses terres, frottement de base dans les sections. */
  talonPrisme: boolean;
  frottementBase: boolean;
  /**
   * Coefficients partiels saisis, par cle du profil (`R2.gRv`), une table par
   * generation. Une cle absente ou vide garde la valeur recommandee.
   */
  coefficients1: Record<string, string>;
  coefficients2: Record<string, string>;
  dimensionsControlees: boolean;
  profondeurComptee: boolean;
  Dlower: string;
  h: string;
  eHaut: string;
  eBas: string;
  es: string;
  patin: string;
  talon: string;
  gammaBeton: string;
  gamma: string;
  phi: string;
  q: string;
  /** Part de K_a en %, le reste en K_0. */
  partKa: string;
  /** Cohesion du remblai (kPa) et delta / phi' sur l'about du talon. */
  cRemblai: string;
  deltaAbout: string;
  /** Hauteur des terres devant le mur, au-dessus de la base (m). */
  hAval: string;
  /** sigma_R,d sous la base (kPa) ; vide : pas de verification. */
  sigmaRd: string;
  /** Charges en tete du voile, permanente et variable : H, V, M. */
  teteGH: string;
  teteGV: string;
  teteGM: string;
  teteQH: string;
  teteQV: string;
  teteQM: string;
  /** Part de K_a pour le voile, en % ; vide : la meme que `partKa`. */
  partKaVoile: string;
  /** delta / phi' sur le parement du voile. */
  deltaParement: string;
  /** Methode de poussee des charges en bande. */
  methodeBandes: MethodeBandes;
  bandes: BandeSaisie[];
  /** Actions variables decrites ; vide : une seule action « Q ». */
  actions: ActionSaisie[];
  /** Action de la surcharge q et de la charge Q en tete. */
  actionQ: string;
  actionTeteQ: string;
  phiBase: string;
  deltaSurPhi: string;
  modePortance: ModePortance;
  qRd: string;
  c: string;
  gammaBase: string;
  D: string;
  fck: string;
  fyk: string;
  a: string;
  voileArriere: ArmatureSaisie;
  voileAvant: ArmatureSaisie;
  semelleHaut: ArmatureSaisie;
  semelleBas: ArmatureSaisie;
}

export function saisieParDefaut(): Saisie {
  return {
    generation: '1re',
    approche1: 'DA1',
    approche2: 'a+b',
    consequences: 'CC2',
    sourceUnique: false,
    talonPrisme: false,
    frottementBase: false,
    coefficients1: {},
    coefficients2: {},
    dimensionsControlees: false,
    profondeurComptee: false,
    Dlower: '20',
    h: '3',
    eHaut: '0,3',
    eBas: '0,3',
    es: '0,4',
    patin: '0,7',
    talon: '1,6',
    gammaBeton: '25',
    gamma: '18',
    phi: '30',
    q: '10',
    partKa: '100',
    partKaVoile: '',
    cRemblai: '0',
    deltaAbout: '0',
    hAval: '0',
    sigmaRd: '',
    teteGH: '0',
    teteGV: '0',
    teteGM: '0',
    teteQH: '0',
    teteQV: '0',
    teteQM: '0',
    deltaParement: '0',
    methodeBandes: 'diffusion',
    bandes: [],
    actions: [],
    actionQ: ACTION_PAR_DEFAUT,
    actionTeteQ: ACTION_PAR_DEFAUT,
    phiBase: '30',
    deltaSurPhi: '1',
    modePortance: 'annexeD',
    qRd: '250',
    c: '0',
    gammaBase: '19',
    D: '0,8',
    fck: '30',
    fyk: '500',
    a: '50',
    voileArriere: { diametre: '16', espacement: '150' },
    voileAvant: { diametre: '0', espacement: '150' },
    semelleHaut: { diametre: '16', espacement: '150' },
    semelleBas: { diametre: '16', espacement: '150' },
  };
}

type Donnees1re = Parameters<typeof verifierMur>[0];
type Donnees2e = Parameters<typeof verifierMur2e>[0];

/** La saisie en barres, pour l'affichage : le noyau ne connait que les aires. */
export type Barres = Record<'voileArriere' | 'voileAvant' | 'semelleHaut' | 'semelleBas', ArmatureSaisie>;

/** Coefficients saisis, deja lus : seuls ceux qui different de la valeur recommandee. */
export type Modifs = Record<string, number>;

export type Calcul =
  | { generation: '1re'; donnees: Donnees1re; barres: Barres; modifs: Modifs }
  | { generation: '2e'; donnees: Donnees2e; barres: Barres; modifs: Modifs };

/** Le profil de reference d'une generation : valeurs recommandees. */
export function profilDeReference(generation: Generation) {
  return generation === '1re' ? profilRecommande() : profil2eRecommande();
}

/** Les coefficients modifiables d'une generation, valeurs recommandees. */
export function coefficientsDe(generation: Generation) {
  return listerCoefficients(profilDeReference(generation));
}

export type Lecture = { ok: true; calcul: Calcul } | { ok: false; message: string };

/** Longueur d'acier par metre : pi d2 / 4 x 1000 / e. */
export function aireParMetre(diametre: number, espacement: number): number {
  return (Math.PI * diametre * diametre * 1000) / (4 * espacement);
}

class Refus extends Error {}

/** Libelle de champ dans la langue courante. */
function champ(fr: string, en: string): string {
  return langueCourante() === 'en' ? en : fr;
}

/** Lit un nombre, ou refuse en nommant le champ. */
function nb(brut: string, libelle: string): number {
  const v = lireNombre(brut);
  if (v === null) throw new Refus(textes().messages.nombreAttendu(libelle, brut));
  return v;
}

function aireDe(a: ArmatureSaisie, libelle: string): number {
  const nomDiametre = `${libelle}${champ('.diametre', '.diameter')}`;
  const nomEspacement = `${libelle}${champ('.espacement', '.spacing')}`;
  const diametre = nb(a.diametre, nomDiametre);
  if (diametre === 0) return 0;
  const espacement = nb(a.espacement, nomEspacement);
  if (espacement <= 0) throw new Refus(textes().messages.positifAttendu(nomEspacement, a.espacement));
  return aireParMetre(diametre, espacement);
}

/** Convertit la saisie ; refuse en nommant le premier champ illisible. */
export function lireSaisie(s: Saisie): Lecture {
  try {
    const generation: Generation = s.generation === '2e' ? '2e' : '1re';

    const geometrie = {
      h: nb(s.h, 'h'),
      eHaut: nb(s.eHaut, 'e_haut'),
      eBas: nb(s.eBas, 'e_bas'),
      es: nb(s.es, 'e_s'),
      patin: nb(s.patin, champ('patin', 'toe')),
      talon: nb(s.talon, champ('talon', 'heel')),
    };
    const gammaBeton = nb(s.gammaBeton, champ('γ_béton', 'γ_concrete'));

    const gamma = nb(s.gamma, 'γ');
    const phi = nb(s.phi, "φ'_k");
    const q = nb(s.q, 'q');
    const partKa = nb(s.partKa, 'K_a') / 100;
    const partKaVoile = s.partKaVoile.trim() === '' ? undefined : nb(s.partKaVoile, champ('K_a du voile', 'K_a of the stem')) / 100;
    const deltaParement = nb(s.deltaParement, "δ/φ'");
    const cRemblai = nb(s.cRemblai, champ("c' du remblai", "c' of the backfill"));
    const deltaAbout = nb(s.deltaAbout, champ("δ/φ' de l'about", "δ/φ' of the heel end"));
    const hAval = nb(s.hAval, champ('hauteur aval', 'front earth height'));
    const sigmaRd = s.sigmaRd.trim() === '' ? undefined : nb(s.sigmaRd, 'σ_R,d');
    const tete = (nature: 'G' | 'Q', H: string, V: string, M: string) => ({
      nature,
      H: nb(H, `${champ('tête', 'top')} ${nature}, H`),
      V: nb(V, `${champ('tête', 'top')} ${nature}, V`),
      M: nb(M, `${champ('tête', 'top')} ${nature}, M`),
    });
    const teteQ = { ...tete('Q', s.teteQH, s.teteQV, s.teteQM), ...(s.actionTeteQ !== ACTION_PAR_DEFAUT ? { action: s.actionTeteQ } : {}) };
    const chargesTete = [tete('G', s.teteGH, s.teteGV, s.teteGM), teteQ].filter((t) => t.H !== 0 || t.V !== 0 || t.M !== 0);
    const noms = new Set<string>();
    const actions = s.actions.map((a, i) => {
      const lib = `${champ('action', 'action')} ${i + 1}`;
      const id = a.nom.trim();
      if (id === '') throw new Refus(textes().messages.nomAction(lib));
      if (noms.has(id)) throw new Refus(textes().messages.nomActionDouble(id));
      noms.add(id);
      const g1 = a.gammaA1.trim() === '' ? undefined : nb(a.gammaA1, `${lib}, γ_Q,A1`);
      const g2 = a.gammaA2.trim() === '' ? undefined : nb(a.gammaA2, `${lib}, γ_Q,A2`);
      return { id, psi0: nb(a.psi0, `${lib}, ψ_0`), ...(g1 === undefined ? {} : { gammaA1: g1 }), ...(g2 === undefined ? {} : { gammaA2: g2 }) };
    });
    const charges = s.bandes.map((b, i) => {
      const nom = champ(`bande ${i + 1}`, `strip ${i + 1}`);
      return {
        nature: b.nature,
        ...(b.nature === 'Q' && b.action !== undefined && b.action !== ACTION_PAR_DEFAUT ? { action: b.action } : {}),
        q: nb(b.q, `${nom}, q`),
        distance: nb(b.distance, `${nom}, distance`),
        largeur: nb(b.largeur, `${nom}, ${champ('largeur', 'width')}`),
      };
    });

    const phiBase = nb(s.phiBase, champ("φ'_k du sol d'assise", "φ'_k of the bearing soil"));
    const deltaSurPhi = nb(s.deltaSurPhi, "δ_k / φ'_k");
    const portance =
      s.modePortance === 'saisie'
        ? { mode: 'saisie' as const, qRd: nb(s.qRd, 'q_Rd') }
        : {
            mode: 'annexeD' as const,
            phi: phiBase,
            c: nb(s.c, "c'_k"),
            gamma: nb(s.gammaBase, champ("γ du sol d'assise", 'γ of the bearing soil')),
            D: nb(s.D, 'D'),
          };
    const fondation = { phi: phiBase, deltaSurPhi, portance, ...(sigmaRd === undefined ? {} : { sigmaRd }) };

    const armatures = {
      fck: nb(s.fck, 'f_ck'),
      fyk: nb(s.fyk, 'f_yk'),
      a: nb(s.a, 'a'),
      voileArriere: aireDe(s.voileArriere, champ('voileArriere', 'wallBack')),
      voileAvant: aireDe(s.voileAvant, champ('voileAvant', 'wallFront')),
      semelleHaut: aireDe(s.semelleHaut, champ('semelleHaut', 'baseTop')),
      semelleBas: aireDe(s.semelleBas, champ('semelleBas', 'baseBottom')),
    };

    const barres: Barres = { voileArriere: s.voileArriere, voileAvant: s.voileAvant, semelleHaut: s.semelleHaut, semelleBas: s.semelleBas };

    const table = generation === '1re' ? s.coefficients1 : s.coefficients2;
    const modifs: Modifs = {};
    for (const c of coefficientsDe(generation)) {
      const brut = table[c.cle];
      if (brut === undefined || brut.trim() === '') continue;
      const v = nb(brut, c.cle);
      if (!(v > 0)) throw new Refus(textes().messages.positifAttendu(c.cle, brut));
      if (v !== c.valeur) modifs[c.cle] = v;
    }

    const communes = {
      sourceUnique: s.sourceUnique,
      talonPrisme: s.talonPrisme,
      frottementBase: s.frottementBase,
      geometrie,
      gammaBeton,
      remblai: {
        gamma, phi, q, partKa, ...(partKaVoile === undefined ? {} : { partKaVoile }),
        c: cRemblai, deltaAbout, deltaParement, methodeBandes: s.methodeBandes, charges,
        ...(s.actionQ !== ACTION_PAR_DEFAUT ? { actionQ: s.actionQ } : {}),
      },
      ...(actions.length > 0 ? { actions } : {}),
      hAval,
      chargesTete,
      fondation,
      armatures,
    };

    if (generation === '1re') {
      return {
        ok: true,
        calcul: {
          generation: '1re',
          donnees: { ...communes, approche: s.approche1 as Donnees1re['approche'] },
          barres,
          modifs,
        },
      };
    }

    return {
      ok: true,
      calcul: {
        generation: '2e',
        barres,
        modifs,
        donnees: {
          ...communes,
          approche: s.approche2 as Donnees2e['approche'],
          consequences: s.consequences as Donnees2e['consequences'],
          dimensionsControlees: s.dimensionsControlees,
          profondeurComptee: s.profondeurComptee,
          Dlower: nb(s.Dlower, 'D_lower'),
        },
      },
    };
  } catch (e) {
    if (e instanceof Refus) return { ok: false, message: e.message };
    throw e;
  }
}

/** Verifie avec les valeurs recommandees, remplacees par les coefficients saisis. */
export function verifier(calcul: Calcul): ResultatMur {
  return calcul.generation === '1re'
    ? verifierMur(calcul.donnees, deriverProfil(profilRecommande(), calcul.modifs))
    : verifierMur2e(calcul.donnees, deriverProfil(profil2eRecommande(), calcul.modifs));
}

const FORMAT = 'mur-en-l/1';

export function serialiser(s: Saisie): string {
  return JSON.stringify({ format: FORMAT, ...s }, null, 2);
}

function texteOu(valeur: unknown, defaut: string): string {
  return typeof valeur === 'string' ? valeur : defaut;
}

function choixOu<T extends string>(valeur: unknown, autorisees: readonly T[], defaut: T): T {
  return typeof valeur === 'string' && (autorisees as readonly string[]).includes(valeur)
    ? (valeur as T)
    : defaut;
}

/** Une table de coefficients relue : cles connues de la generation, valeurs en chaines. */
function coefficientsOu(valeur: unknown, generation: Generation): Record<string, string> {
  if (typeof valeur !== 'object' || valeur === null) return {};
  const connues = new Set(coefficientsDe(generation).map((c) => c.cle));
  const out: Record<string, string> = {};
  for (const [cle, v] of Object.entries(valeur as Record<string, unknown>)) {
    if (connues.has(cle) && typeof v === 'string') out[cle] = v;
  }
  return out;
}

function armatureOu(valeur: unknown, defaut: ArmatureSaisie): ArmatureSaisie {
  if (typeof valeur !== 'object' || valeur === null) return { ...defaut };
  const o = valeur as Record<string, unknown>;
  return {
    diametre: texteOu(o.diametre, defaut.diametre),
    espacement: texteOu(o.espacement, defaut.espacement),
  };
}

/** Relit un document enregistre ; les champs absents prennent leur valeur par defaut. */
export function relire(contenu: string): Saisie {
  const brut = JSON.parse(contenu) as Record<string, unknown>;
  if (brut.format !== FORMAT) throw new Error(textes().messages.format(JSON.stringify(brut.format), FORMAT));

  const d = saisieParDefaut();
  const nature = (v: unknown): v is 'G' | 'Q' => v === 'G' || v === 'Q';

  const bandes: BandeSaisie[] = Array.isArray(brut.bandes)
    ? brut.bandes.flatMap((valeur) => {
        if (typeof valeur !== 'object' || valeur === null) return [];
        const o = valeur as Record<string, unknown>;
        if (!nature(o.nature)) return [];
        if (typeof o.q !== 'string' || typeof o.distance !== 'string' || typeof o.largeur !== 'string') return [];
        return [{ nature: o.nature, ...(typeof o.action === 'string' ? { action: o.action } : {}), q: o.q, distance: o.distance, largeur: o.largeur }];
      })
    : d.bandes;

  return {
    generation: choixOu(brut.generation, ['1re', '2e'] as const, d.generation),
    approche1: choixOu(brut.approche1, ['DA1', 'DA2', 'DA2*', 'DA3'] as const, d.approche1),
    approche2: choixOu(brut.approche2, ['a+b', 'c', 'd'] as const, d.approche2),
    consequences: choixOu(brut.consequences, ['CC1', 'CC2', 'CC3'] as const, d.consequences),
    sourceUnique: brut.sourceUnique === true,
    talonPrisme: brut.talonPrisme === true,
    frottementBase: brut.frottementBase === true,
    coefficients1: coefficientsOu(brut.coefficients1, '1re'),
    coefficients2: coefficientsOu(brut.coefficients2, '2e'),
    dimensionsControlees: brut.dimensionsControlees === true,
    profondeurComptee: brut.profondeurComptee === true,
    Dlower: texteOu(brut.Dlower, d.Dlower),
    h: texteOu(brut.h, d.h),
    eHaut: texteOu(brut.eHaut, d.eHaut),
    eBas: texteOu(brut.eBas, d.eBas),
    es: texteOu(brut.es, d.es),
    patin: texteOu(brut.patin, d.patin),
    talon: texteOu(brut.talon, d.talon),
    gammaBeton: texteOu(brut.gammaBeton, d.gammaBeton),
    gamma: texteOu(brut.gamma, d.gamma),
    phi: texteOu(brut.phi, d.phi),
    q: texteOu(brut.q, d.q),
    partKa: texteOu(brut.partKa, d.partKa),
    partKaVoile: texteOu(brut.partKaVoile, d.partKaVoile),
    cRemblai: texteOu(brut.cRemblai, d.cRemblai),
    deltaAbout: texteOu(brut.deltaAbout, d.deltaAbout),
    hAval: texteOu(brut.hAval, d.hAval),
    sigmaRd: texteOu(brut.sigmaRd, d.sigmaRd),
    teteGH: texteOu(brut.teteGH, d.teteGH),
    teteGV: texteOu(brut.teteGV, d.teteGV),
    teteGM: texteOu(brut.teteGM, d.teteGM),
    teteQH: texteOu(brut.teteQH, d.teteQH),
    teteQV: texteOu(brut.teteQV, d.teteQV),
    teteQM: texteOu(brut.teteQM, d.teteQM),
    deltaParement: texteOu(brut.deltaParement, d.deltaParement),
    methodeBandes: choixOu(brut.methodeBandes, ['diffusion', 'din4085'] as const, d.methodeBandes),
    bandes,
    actions: Array.isArray(brut.actions)
      ? brut.actions.flatMap((v) => {
          if (typeof v !== 'object' || v === null) return [];
          const o = v as Record<string, unknown>;
          return [{ nom: texteOu(o.nom, ''), psi0: texteOu(o.psi0, '1'), gammaA1: texteOu(o.gammaA1, ''), gammaA2: texteOu(o.gammaA2, '') }];
        })
      : d.actions,
    actionQ: texteOu(brut.actionQ, d.actionQ),
    actionTeteQ: texteOu(brut.actionTeteQ, d.actionTeteQ),
    phiBase: texteOu(brut.phiBase, d.phiBase),
    deltaSurPhi: texteOu(brut.deltaSurPhi, d.deltaSurPhi),
    modePortance: choixOu(brut.modePortance, ['annexeD', 'saisie'] as const, d.modePortance),
    qRd: texteOu(brut.qRd, d.qRd),
    c: texteOu(brut.c, d.c),
    gammaBase: texteOu(brut.gammaBase, d.gammaBase),
    D: texteOu(brut.D, d.D),
    fck: texteOu(brut.fck, d.fck),
    fyk: texteOu(brut.fyk, d.fyk),
    a: texteOu(brut.a, d.a),
    voileArriere: armatureOu(brut.voileArriere, d.voileArriere),
    voileAvant: armatureOu(brut.voileAvant, d.voileAvant),
    semelleHaut: armatureOu(brut.semelleHaut, d.semelleHaut),
    semelleBas: armatureOu(brut.semelleBas, d.semelleBas),
  };
}
