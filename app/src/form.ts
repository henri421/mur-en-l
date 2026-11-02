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
  profil2eRecommande,
  profilRecommande,
  verifierMur,
  verifierMur2e,
} from '../../src/index';
import type { ResultatMur } from '../../src/index';
import { textes } from './textes';

export type Generation = '1re' | '2e';
export type Approche1 = 'DA1' | 'DA2' | 'DA3';
export type Approche2 = 'a+b' | 'c' | 'd';
export type ClasseConsequences = 'CC1' | 'CC2' | 'CC3';
export type ModePortance = 'annexeD' | 'saisie';

/** Armature saisie en barres : diametre et espacement, convertis par `aireParMetre`. */
export interface ArmatureSaisie {
  diametre: string;
  espacement: string;
}

/** Une charge repartie de largeur finie, telle que saisie. */
export interface BandeSaisie {
  nature: 'G' | 'Q';
  q: string;
  distance: string;
  largeur: string;
}

export interface Saisie {
  generation: Generation;
  approche1: Approche1;
  approche2: Approche2;
  consequences: ClasseConsequences;
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
  bandes: BandeSaisie[];
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
    bandes: [],
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

export type Calcul =
  | { generation: '1re'; donnees: Donnees1re; barres: Barres }
  | { generation: '2e'; donnees: Donnees2e; barres: Barres };

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
    const charges = s.bandes.map((b, i) => {
      const nom = champ(`bande ${i + 1}`, `strip ${i + 1}`);
      return {
        nature: b.nature,
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
    const fondation = { phi: phiBase, deltaSurPhi, portance };

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

    const communes = {
      geometrie,
      gammaBeton,
      remblai: { gamma, phi, q, partKa, charges },
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
        },
      };
    }

    return {
      ok: true,
      calcul: {
        generation: '2e',
        barres,
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

export function verifier(calcul: Calcul): ResultatMur {
  return calcul.generation === '1re'
    ? verifierMur(calcul.donnees, profilRecommande())
    : verifierMur2e(calcul.donnees, profil2eRecommande());
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
        return [{ nature: o.nature, q: o.q, distance: o.distance, largeur: o.largeur }];
      })
    : d.bandes;

  return {
    generation: choixOu(brut.generation, ['1re', '2e'] as const, d.generation),
    approche1: choixOu(brut.approche1, ['DA1', 'DA2', 'DA3'] as const, d.approche1),
    approche2: choixOu(brut.approche2, ['a+b', 'c', 'd'] as const, d.approche2),
    consequences: choixOu(brut.consequences, ['CC1', 'CC2', 'CC3'] as const, d.consequences),
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
    bandes,
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
