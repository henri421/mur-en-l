/**
 * Mur de soutenement en L en beton arme, par metre de mur : stabilite externe
 * (EN 1997-1) et sections du voile et de la semelle (EN 1992-1-1).
 *
 * Unites : geometrie en m, poids volumiques en kN/m3, contraintes de sol en
 * kPa, efforts en kN/m et kN.m/m ; armatures en mm2/m, distances aux armatures
 * en mm, fck et fyk en MPa. Les sections sont calculees en mm par `section-uls`.
 *
 * Repere : x depuis l'arete du patin vers le talon, z vers le haut depuis la
 * base. Le parement arriere du voile est vertical ; un voile a fruit a son
 * parement avant incline.
 *
 * Choix de modelisation, declares :
 *  - poussee sur l'ecran virtuel au droit du talon, terres sur le talon comptees
 *    comme action stabilisante (EN 1997-1 §9.5.1) ;
 *  - remblai horizontal au niveau de la tete du voile, sans cohesion, sans nappe ;
 *  - charges en bande projetees par diffusion avec phi' de calcul (`projectionBande`) :
 *    sur l'ecran virtuel pour la stabilite, sur le parement pour le voile. La part
 *    posee sur le talon pese sur lui sans pousser l'ecran virtuel ;
 *  - terres devant le patin ignorees dans l'equilibre : ni butee ni poids. Elles
 *    ne servent que par la contrainte q' de la portance ;
 *  - comme dans equilibre-statique, chaque poids est une action distincte. Les
 *    verticales sont prises favorables pendant que la poussee reste defavorable,
 *    selon le cas le plus severe ;
 *  - contrainte sous la semelle lineaire pour les sections, sans traction ;
 *  - sections au nu du voile, sans reduction a la distance d : c'est sur.
 *
 * L'outil constate : il ne dimensionne pas, et les armatures sont saisies.
 */

import {
  createConcrete,
  createSteel,
  ec2Recommended,
  fctmDepuisFck,
  rectangularSection,
  shearWithoutLinks,
  verifyUniaxial,
  type NormProfile,
  type Section,
} from 'section-uls';
import {
  profilRecommande as profilEquilibre,
  verifierEquilibre,
  type Charge,
  type DonneesEquilibre,
  type JeuEquilibre,
  type ProfilEquilibre,
  type Renversement,
} from 'equilibre-statique';
import { combinaisons, verifierProfil, type Approche, type Combinaison, type JeuActions, type ProfilMur } from './profil';
import { combinaisons2e, verifierProfil2e, type Approche2e, type ClasseConsequences, type Profil2e } from './profil2e';
import { kaRankine, phiCalcul, portanceDrainee, portanceDrainee2e, pousseeActive, type Poussee, type ResultatPortance } from './sol';

const MM_PAR_M = 1000;
const LARGEUR_MM = 1000;
const E_S = 200000;
const N_PAR_KN = 1000;

/** Coefficients de l'EN 1992-1-1:2023 : gamma_V (4.3.3), k_tc (5.1.6, mise en charge avant 90 jours), f_ck,ref. */
const GAMMA_V_2023 = 1.4;
const K_TC_2023 = 0.85;
const FCK_REF_2023 = 40;
/** Ecart de largeur d'une semelle coulee en place, EN 1997-3:2025 5.6.3, NOTE 1 de (5.10) (m). */
const DELTA_B_2E = 0.1;

export interface GeometrieMur {
  /** Hauteur du voile au-dessus de la semelle (m). */
  h: number;
  /** Epaisseurs du voile en tete et a la base (m). */
  eHaut: number;
  eBas: number;
  /** Epaisseur de la semelle, longueurs du patin et du talon (m). */
  es: number;
  patin: number;
  talon: number;
}

export interface Remblai {
  gamma: number;
  /** phi' caracteristique (degres). */
  phi: number;
  /** Surcharge variable sur toute la surface du remblai (kPa). */
  q: number;
  /** Charges reparties de largeur finie, en plus de q. */
  charges?: ChargeBande[];
}

/** Charge repartie sur une bande de la surface du remblai, parallele au mur. */
export interface ChargeBande {
  nature: 'G' | 'Q';
  /** Intensite (kPa). */
  q: number;
  /** Distance du parement arriere du voile au bord de la bande (m). */
  distance: number;
  /** Largeur de la bande (m). */
  largeur: number;
}

export type PortanceSaisie =
  | { mode: 'annexeD'; phi: number; c: number; gamma: number; /** Hauteur de terre devant le patin (m). */ D: number }
  | { mode: 'saisie'; /** Resistance de calcul du terrain, deja divisee par gamma_Rv (kPa). */ qRd: number };

export interface Fondation {
  /** phi' caracteristique du sol d'assise pour le glissement (degres). */
  phi: number;
  /**
   * 1re generation : delta_k / phi'_k a la base, 1 pour un beton coule en place,
   * EN 1997-1 §6.5.3(10). 2e generation : k_interface sur les tangentes, 1 pour une
   * base rugueuse et 2/3 sinon, EN 1997-3 §5.5.3.
   */
  deltaSurPhi: number;
  portance: PortanceSaisie;
}

export interface Armatures {
  fck: number;
  fyk: number;
  /** Distance de l'axe des barres au parement (mm). */
  a: number;
  /** Voile : cote remblai et cote avant (mm2/m). */
  voileArriere: number;
  voileAvant: number;
  /** Semelle : nappes superieure et inferieure (mm2/m). */
  semelleHaut: number;
  semelleBas: number;
}

export interface DonneesMur {
  geometrie: GeometrieMur;
  /** Poids volumique du beton arme (kN/m3). */
  gammaBeton: number;
  remblai: Remblai;
  fondation: Fondation;
  armatures: Armatures;
  approche: Approche;
}

export interface DonneesMur2e extends Omit<DonneesMur, 'approche'> {
  approche: Approche2e;
  consequences: ClasseConsequences;
  /** Mesures de controle des dimensions : pas de reduction de B, EN 1997-3 §5.6.3. */
  dimensionsControlees: boolean;
  /** Facteur de profondeur d_q compte : terre devant le patin durable et au moins aussi resistante. */
  profondeurComptee: boolean;
  /** Plus grande dimension des granulats D_lower (mm), EN 1992-1-1:2023. */
  Dlower: number;
}

/** Un des quatre cas de charge d'une combinaison sur la base. */
export interface CasBase {
  nom: string;
  /** Verticales majorees (sup) ou non (inf). */
  verticales: 'sup' | 'inf';
  surchargeSurTalon: boolean;
  V: number;
  H: number;
  /** Moment autour du milieu de la base, positif vers le patin (kN.m/m). */
  M: number;
  /** Excentricite vers le patin (m), negative vers le talon. */
  e: number;
  /** Largeur efficace B' (m), nulle si la resultante sort de la base. */
  Bp: number;
  sol: ResultatPortance | null;
  /** Resistance de calcul (kN/m). */
  R_d: number;
  taux: number;
}

export interface VerifSection {
  section: 'voile' | 'patin' | 'talon';
  /** Cas gouvernants, distincts pour la flexion et le tranchant. */
  casFlexion: string;
  casTranchant: string;
  /** Face tendue du cas gouvernant en flexion. */
  faceTendue: 'arriere' | 'avant' | 'haut' | 'bas';
  M_Ed: number;
  M_Rd: number;
  tauxFlexion: number;
  V_Ed: number;
  V_Rd_c: number;
  tauxTranchant: number;
  /** Armature minimale §9.2.1.1 (mm2/m), et armature tendue saisie. */
  As_min: number;
  As: number;
}

export interface ResultatCombinaison {
  nom: string;
  poussee: Poussee;
  /** Valeur de calcul de phi' du remblai (degres). */
  phi_d: number;
  mu_d: number;
  glissement: { H_d: number; N_d: number; R_d: number; taux: number };
  cas: CasBase[];
  /** Cas de portance le plus sollicite. */
  portance: CasBase;
  voile: VerifSection;
  patin: VerifSection;
  talon: VerifSection;
}

export interface ResultatMur {
  generation: '1re' | '2e';
  B: number;
  /** Hauteur de l'ecran virtuel (m). */
  Ht: number;
  poids: { voile: number; semelle: number; terresTalon: number; surchargeTalon: number };
  /** Renversement autour de l'arete du patin. */
  renversement: {
    Ka: number;
    poussee: Poussee;
    pivot: Renversement;
    taux: number;
    /** 2e generation : cas de verification retenu, VC2(a) ou VC2(b). */
    cas?: string;
  };
  /**
   * Position de la resultante caracteristique. 1re generation : constat §6.5.4.
   * 2e generation : limites du tableau 5.3 de l'EN 1997-3, dont la plus chargee
   * donne e, limite et taux, avec le detail des deux.
   */
  excentricite: {
    e: number;
    limite: number;
    taux: number;
    noyauCentral: boolean;
    detail?: { eG: number; tauxG: number; eGQ: number; tauxGQ: number };
  };
  combinaisons: ResultatCombinaison[];
  /** Taux le plus eleve par nature de constat. */
  tauxExterne: number;
  tauxSections: number;
  tauxDispositions: number;
  verdict: 'conforme' | 'non-conforme';
  motif: string;
  avertissements: string[];
}

function positif(v: number, nom: string, unite: string): number {
  if (!(Number.isFinite(v) && v > 0)) throw new Error(`${nom} doit être un nombre strictement positif (${unite}).`);
  return v;
}

function positifOuNul(v: number, nom: string, unite: string): number {
  if (!(Number.isFinite(v) && v >= 0)) throw new Error(`${nom} doit être un nombre positif ou nul (${unite}).`);
  return v;
}

function verifierDonnees(d: DonneesMur): void {
  const g = d.geometrie;
  positif(g.h, 'La hauteur du voile', 'm');
  positif(g.eHaut, "L'épaisseur du voile en tête", 'm');
  positif(g.eBas, "L'épaisseur du voile à la base", 'm');
  if (g.eBas < g.eHaut) throw new Error("L'épaisseur du voile à la base doit être au moins égale à celle en tête (m).");
  positif(g.es, "L'épaisseur de la semelle", 'm');
  positifOuNul(g.patin, 'La longueur du patin', 'm');
  positif(g.talon, 'La longueur du talon', 'm');
  positif(d.gammaBeton, 'Le poids volumique du béton', 'kN/m3');
  positif(d.remblai.gamma, 'Le poids volumique du remblai', 'kN/m3');
  positifOuNul(d.remblai.q, 'La surcharge', 'kPa');
  for (const c of d.remblai.charges ?? []) {
    positifOuNul(c.q, "L'intensité d'une charge en bande", 'kPa');
    positifOuNul(c.distance, "La distance d'une charge en bande", 'm');
    positif(c.largeur, "La largeur d'une charge en bande", 'm');
  }
  positif(d.fondation.deltaSurPhi, 'Le rapport delta/phi', '-');
  const a = d.armatures;
  positif(a.fck, 'f_ck', 'MPa');
  positif(a.fyk, 'f_yk', 'MPa');
  positif(a.a, "La distance de l'axe des barres au parement", 'mm');
  positifOuNul(a.voileArriere, "L'armature du voile, côté remblai", 'mm2/m');
  positifOuNul(a.voileAvant, "L'armature du voile, côté avant", 'mm2/m');
  positifOuNul(a.semelleHaut, "L'armature supérieure de la semelle", 'mm2/m');
  positifOuNul(a.semelleBas, "L'armature inférieure de la semelle", 'mm2/m');
  if (d.fondation.portance.mode === 'saisie') positif(d.fondation.portance.qRd, 'La résistance q_Rd', 'kPa');
  else {
    positifOuNul(d.fondation.portance.c, 'La cohésion', 'kPa');
    positif(d.fondation.portance.gamma, 'Le poids volumique du sol de fondation', 'kN/m3');
    positifOuNul(d.fondation.portance.D, 'La hauteur de terre devant le patin', 'm');
  }
}

/** Poids et position (depuis l'arete du patin) de chaque bloc. */
function blocs(d: DonneesMur) {
  const { h, eHaut, eBas, es, patin, talon } = d.geometrie;
  const B = patin + eBas + talon;
  const gc = d.gammaBeton;
  // Le voile a fruit : une bande d'epaisseur eHaut contre le parement arriere,
  // et un triangle devant elle.
  const voileRect = { F: gc * eHaut * h, x: patin + eBas - eHaut / 2, z: es + h / 2 };
  const voileTri = { F: (gc * (eBas - eHaut) * h) / 2, x: patin + (2 / 3) * (eBas - eHaut), z: es + h / 3 };
  const semelle = { F: gc * B * es, x: B / 2, z: es / 2 };
  const xTalon = patin + eBas + talon / 2;
  const terres = { F: d.remblai.gamma * talon * h, x: xTalon, z: es + h / 2 };
  const surcharge = { F: d.remblai.q * talon, x: xTalon, z: es + h };
  return { B, Ht: h + es, voileRect, voileTri, semelle, terres, surcharge };
}

/**
 * Projection d'une bande sur un ecran vertical, par diffusion : pression uniforme
 * K_a q entre les droites issues du bord proche a phi' et du bord eloigne a
 * 45 + phi'/2 de l'horizontale. Methode courante, que l'EN 1997 ne donne pas : les
 * deux generations ne traitent que la surcharge uniforme.
 *
 * `a` et `largeur` sont comptes depuis l'ecran (m), `H` est sa hauteur (m), phi en
 * radians. Rend les profondeurs depuis la surface, bornees a H, ou null si la
 * diffusion passe sous l'ecran.
 */
export function projectionBande(a: number, largeur: number, phi: number, H: number): { z1: number; z2: number } | null {
  const z1 = a * Math.tan(phi);
  const z2 = Math.min((a + largeur) * Math.tan(Math.PI / 4 + phi / 2), H);
  return z1 < H && z2 > z1 ? { z1, z2 } : null;
}

/** Part d'une bande qui passe derriere l'ecran virtuel, et sa poussee caracteristique. */
function pousseesBandes(d: DonneesMur, Ka: number, phi: number) {
  const Ht = d.geometrie.h + d.geometrie.es;
  const res: { nature: 'G' | 'Q'; P: number; z: number }[] = [];
  for (const c of d.remblai.charges ?? []) {
    const loin = c.distance + c.largeur - d.geometrie.talon;
    if (loin <= 0) continue;
    const a = Math.max(0, c.distance - d.geometrie.talon);
    const p = projectionBande(a, loin - a, phi, Ht);
    if (p) res.push({ nature: c.nature, P: Ka * c.q * (p.z2 - p.z1), z: Ht - (p.z1 + p.z2) / 2 });
  }
  return res;
}

/** Part d'une bande posee sur le talon : resultante et abscisse depuis le patin. */
function bandesSurTalon(d: DonneesMur) {
  const { patin, eBas, talon } = d.geometrie;
  const res: { nature: 'G' | 'Q'; F: number; x: number }[] = [];
  for (const c of d.remblai.charges ?? []) {
    const L = Math.min(c.distance + c.largeur, talon) - c.distance;
    if (L > 0) res.push({ nature: c.nature, F: c.q * L, x: patin + eBas + c.distance + L / 2 });
  }
  return res;
}

function jeuEquilibre(j: JeuActions): JeuEquilibre {
  return { gG_dst: j.gG_dst, gG_stb: j.gG_stb, gQ_dst: j.gQ_dst, gQ_stb: j.gQ_stb };
}

function profilPour(j: JeuActions): ProfilEquilibre {
  const jeu = jeuEquilibre(j);
  return { ...profilEquilibre(), equ: jeu, glissement: jeu, upl: jeu };
}

/** Les actions du mur, au format du moteur d'equilibre. */
function donneesEquilibre(d: DonneesMur, p: Poussee, mu: number, phi: number): DonneesEquilibre {
  const b = blocs(d);
  const ponctuelle = (id: string, nature: 'G' | 'Q', x: number, z: number, Fx: number, Fz: number): Charge => ({ type: 'ponctuelle', id, nature, x, z, Fx, Fz });
  const charges: Charge[] = [
    ponctuelle('voile', 'G', b.voileRect.x, b.voileRect.z, 0, b.voileRect.F),
    ponctuelle('semelle', 'G', b.semelle.x, b.semelle.z, 0, b.semelle.F),
    ponctuelle('terres sur le talon', 'G', b.terres.x, b.terres.z, 0, b.terres.F),
    // Vers le patin, donc vers -x.
    ponctuelle('poussée des terres', 'G', b.B, b.Ht / 3, -p.P_G, 0),
  ];
  if (b.voileTri.F > 0) charges.push(ponctuelle('fruit du voile', 'G', b.voileTri.x, b.voileTri.z, 0, b.voileTri.F));
  if (b.surcharge.F > 0) {
    charges.push(ponctuelle('surcharge sur le talon', 'Q', b.surcharge.x, b.surcharge.z, 0, b.surcharge.F));
    charges.push(ponctuelle('poussée de la surcharge', 'Q', b.B, b.Ht / 2, -p.P_Q, 0));
  }
  bandesSurTalon(d).forEach((c, i) => charges.push(ponctuelle(`bande ${i + 1} sur le talon`, c.nature, c.x, b.Ht, 0, c.F)));
  pousseesBandes(d, p.Ka, phi).forEach((c, i) => charges.push(ponctuelle(`poussée de la bande ${i + 1}`, c.nature, b.B, c.z, -c.P, 0)));
  return { segments: [], charges, base: { xg: 0, xd: b.B, z: 0 }, mu, profondeur: 1 };
}

/** Contrainte lineaire sous la base (kPa), sans traction, x depuis le patin. */
export function contrainteSol(V: number, e: number, B: number): (x: number) => number {
  if (Math.abs(e) <= B / 6) {
    const p0 = (V / B) * (1 + (6 * e) / B);
    const pB = (V / B) * (1 - (6 * e) / B);
    return (x) => p0 + ((pB - p0) * x) / B;
  }
  const L = 3 * (B / 2 - Math.abs(e));
  const pMax = (2 * V) / L;
  return e > 0
    ? (x) => Math.max(0, pMax * (1 - x / L))
    : (x) => Math.max(0, pMax * (1 - (B - x) / L));
}

/**
 * Effort et moment autour de `x0` d'une contrainte affine par morceaux sur
 * [a ; b], par trapezes : exact sur chaque morceau, le pli du diagramme
 * triangulaire etant traite en ajoutant son abscisse aux points de coupe.
 */
function integrerPression(p: (x: number) => number, a: number, b: number, x0: number, coupes: number[]): { F: number; M: number } {
  const points = [a, ...coupes.filter((c) => c > a && c < b), b].sort((u, v) => u - v);
  let F = 0;
  let M = 0;
  for (let i = 1; i < points.length; i++) {
    const [u, v] = [points[i - 1], points[i]];
    const [pu, pv] = [p(u), p(v)];
    const L = v - u;
    F += ((pu + pv) * L) / 2;
    // Moment du trapeze : pu et pv decoupes en deux triangles.
    M += (pu * L * (u + L / 3 - x0)) / 2 + (pv * L * (u + (2 * L) / 3 - x0)) / 2;
  }
  return { F, M };
}

interface ContexteSection {
  beton: ReturnType<typeof createConcrete>;
  acier: ReturnType<typeof createSteel>;
  norme: NormProfile;
  a: number;
  /** Renseigne en 2e generation seulement : D_lower (mm). */
  Dlower?: number;
}

/**
 * Regles propres a une generation pour la stabilite externe. Le reste du calcul,
 * cas de charge et efforts dans les sections, est commun.
 */
interface Regles {
  /** tan delta avant coefficient partiel. */
  tanDeltaK(d: DonneesMur): number;
  /** Largeur dont on retire 2e pour obtenir B' (m). */
  largeurPortance(B: number): number;
  portance(p: Extract<PortanceSaisie, { mode: 'annexeD' }>, c: Combinaison, Bp: number, V: number, H: number): ResultatPortance;
}

const REGLES_1RE: Regles = {
  tanDeltaK: (d) => Math.tan((d.fondation.deltaSurPhi * d.fondation.phi * Math.PI) / 180),
  largeurPortance: (B) => B,
  portance: (p, c, Bp, V, H) =>
    portanceDrainee({ Bp, V, H, phi: phiCalcul(p.phi, c.sol.gPhi.valeur), c: p.c / c.sol.gC.valeur, gamma: p.gamma, q: p.gamma * p.D }),
};

function regles2e(d: DonneesMur2e): Regles {
  return {
    tanDeltaK: (m) => m.fondation.deltaSurPhi * Math.tan((m.fondation.phi * Math.PI) / 180),
    largeurPortance: (B) => (d.dimensionsControlees ? B : B - DELTA_B_2E),
    portance: (p, c, Bp, V, H) =>
      portanceDrainee2e({
        Bp,
        V,
        H,
        phi: phiCalcul(p.phi, c.sol.gPhi.valeur),
        c: p.c / c.sol.gC.valeur,
        gamma: p.gamma,
        q: p.gamma * p.D,
        Df: d.profondeurComptee ? p.D : undefined,
      }),
  };
}

/** f_ctm de l'EN 1992-1-1:2023, tableau 5.1. */
function fctm2023(fck: number): number {
  return fck <= 50 ? 0.3 * fck ** (2 / 3) : 1.1 * fck ** (1 / 3);
}

/** V_Rd,c de l'EN 1992-1-1:2023, (8.20) et (8.27), z = 0,9 d, effort normal neglige : c'est sur (kN/m). */
function vRdc2023(fck: number, fyk: number, gammaS: number, As: number, d: number, Dlower: number): number {
  const ddg = fck <= 60 ? Math.min(16 + Dlower, 40) : Math.min(16 + Dlower * (60 / fck) ** 2, 40);
  const fyd = fyk / gammaS;
  const rho = As / (LARGEUR_MM * d);
  const tauMin = (11 / GAMMA_V_2023) * Math.sqrt(((fck / fyd) * ddg) / d);
  const tau = Math.max((0.66 / GAMMA_V_2023) * ((100 * rho * fck * ddg) / d) ** (1 / 3), tauMin);
  return (tau * LARGEUR_MM * 0.9 * d) / N_PAR_KN;
}

/** Section de 1 m : la compression de section-uls est en haut, As tendue en bas. */
function sectionMetre(c: ContexteSection, hauteur: number, tendue: number, opposee: number): Section {
  const barres = [
    { depthFromTop: hauteur - c.a, area: tendue, steel: c.acier },
    { depthFromTop: c.a, area: opposee, steel: c.acier },
  ].filter((b) => b.area > 0);
  return rectangularSection({ width: LARGEUR_MM, height: hauteur, concrete: c.beton, rebars: barres });
}

/** As,min de l'EN 1992-1-1 §9.2.1.1, eq. 9.1N (mm2/m). */
function armatureMinimale(c: ContexteSection, hauteur: number, fck: number, fyk: number): number {
  // 2e generation : M_cr / (f_yk z), EN 1992-1-1:2023 (12.1), z = 0,9 d.
  if (c.Dlower !== undefined) return (fctm2023(fck) * LARGEUR_MM * hauteur ** 2) / 6 / (fyk * 0.9 * (hauteur - c.a));
  return Math.max((0.26 * fctmDepuisFck(fck)) / fyk, 0.0013) * LARGEUR_MM * (hauteur - c.a);
}

function verifierSection(
  c: ContexteSection,
  nom: VerifSection['section'],
  cas: string,
  faceTendue: VerifSection['faceTendue'],
  hauteur: number,
  As: number,
  As2: number,
  N: number,
  M: number,
  V: number,
  fck: number,
  fyk: number,
): VerifSection {
  const As_min = armatureMinimale(c, hauteur, fck, fyk);
  let M_Rd = 0;
  let V_Rd_c = 0;
  if (As > 0) {
    const s = sectionMetre(c, hauteur, As, As2);
    const r = verifyUniaxial(s, { N, M: 0 }, c.norme);
    if (!r.converged) throw new Error(`${nom} : équilibre de la section introuvable (section-uls).`);
    M_Rd = Math.abs(r.M_Rd);
    V_Rd_c = c.Dlower !== undefined ? vRdc2023(fck, fyk, c.norme.gammaS, As, hauteur - c.a, c.Dlower) : shearWithoutLinks(s, N, c.norme).VRdc;
  }
  const taux = (Ed: number, Rd: number): number => (Ed <= 0 ? 0 : Rd > 0 ? Ed / Rd : Infinity);
  return { section: nom, casFlexion: cas, casTranchant: cas, faceTendue, M_Ed: M, M_Rd, tauxFlexion: taux(M, M_Rd), V_Ed: V, V_Rd_c, tauxTranchant: taux(V, V_Rd_c), As_min, As };
}

/**
 * Enveloppe de deux cas : flexion et tranchant gouvernent chacun de leur cote,
 * le cas le plus defavorable pour l'un ne l'etant pas forcement pour l'autre.
 */
function pireSection(a: VerifSection | null, b: VerifSection): VerifSection {
  if (!a) return b;
  const flexion = b.tauxFlexion > a.tauxFlexion ? b : a;
  const tranchant = b.tauxTranchant > a.tauxTranchant ? b : a;
  return {
    ...flexion,
    casTranchant: tranchant.casTranchant,
    V_Ed: tranchant.V_Ed,
    V_Rd_c: tranchant.V_Rd_c,
    tauxTranchant: tranchant.tauxTranchant,
  };
}

function calculerCombinaison(d: DonneesMur, c: Combinaison, ctx: ContexteSection, regles: Regles): ResultatCombinaison {
  const b = blocs(d);
  const { h, es, eBas, patin, talon } = d.geometrie;
  const gamma = d.remblai.gamma;
  const q = d.remblai.q;
  const phi_d = phiCalcul(d.remblai.phi, c.sol.gPhi.valeur);
  const Ka = kaRankine(phi_d);
  const poussee = pousseeActive(b.Ht, gamma, Ka, q);

  // Glissement : moteur d'equilibre, EN 1997-1 §6.5.3(8) ou EN 1997-3 (5.16).
  // delta_d divise comme phi'.
  const tanDeltaD = regles.tanDeltaK(d) / c.sol.gPhi.valeur;
  const mu_d = tanDeltaD / c.resistance.gRh.valeur;
  const eq = verifierEquilibre(donneesEquilibre(d, poussee, mu_d, phi_d), profilPour(c.geotechnique));
  const glissement = { H_d: eq.glissement.H_d, N_d: eq.glissement.N_d, R_d: eq.glissement.R_d, taux: eq.glissement.taux };
  // En DA3 le beton suit A1 et le moteur n'a qu'un jeu : on corrige son poids
  // favorable si le profil donne a A1 et A2 des gamma_G,stb differents.
  if (c.structure.gG_stb.valeur !== c.geotechnique.gG_stb.valeur) {
    const poidsBeton = b.voileRect.F + b.voileTri.F + b.semelle.F;
    const N_d = glissement.N_d + (c.structure.gG_stb.valeur - c.geotechnique.gG_stb.valeur) * poidsBeton;
    glissement.N_d = N_d;
    glissement.R_d = Math.max(0, mu_d * N_d);
    glissement.taux = glissement.R_d > 0 ? glissement.H_d / glissement.R_d : Infinity;
  }

  // Poussee de calcul : toujours defavorable.
  const gG = c.geotechnique.gG_dst.valeur;
  const gQ = c.geotechnique.gQ_dst.valeur;
  const facteur = (nature: 'G' | 'Q'): number => (nature === 'G' ? gG : gQ);
  const pb = pousseesBandes(d, Ka, phi_d);
  const H_d = gG * poussee.P_G + gQ * poussee.P_Q + pb.reduce((s, x) => s + facteur(x.nature) * x.P, 0);
  const M_H = (gG * poussee.P_G * b.Ht) / 3 + (gQ * poussee.P_Q * b.Ht) / 2 + pb.reduce((s, x) => s + facteur(x.nature) * x.P * x.z, 0);

  const As = d.armatures;

  // Voile : console chargee par la poussee seule, N favorable.
  const KaG = gG * Ka * gamma;
  const KaQ = gQ * Ka * q;
  let M_v = (KaG * h ** 3) / 6 + (KaQ * h ** 2) / 2;
  let V_v = (KaG * h ** 2) / 2 + KaQ * h;
  // Le voile est l'ecran reel : la bande entiere se diffuse depuis son parement.
  for (const x of d.remblai.charges ?? []) {
    const p = projectionBande(x.distance, x.largeur, phi_d, h);
    if (!p) continue;
    const F = facteur(x.nature) * Ka * x.q * (p.z2 - p.z1);
    V_v += F;
    M_v += F * (h - (p.z1 + p.z2) / 2);
  }
  const N_v = c.structure.gG_stb.valeur * (b.voileRect.F + b.voileTri.F);
  const voile = verifierSection(ctx, 'voile', c.nom, 'arriere', eBas * MM_PAR_M, As.voileArriere, As.voileAvant, N_v, M_v, V_v, As.fck, As.fyk);

  const cas: CasBase[] = [];
  let patinV: VerifSection | null = null;
  let talonV: VerifSection | null = null;
  const xh = patin + eBas;
  const milieu = b.B / 2;

  for (const verticales of ['sup', 'inf'] as const) {
    const fc = verticales === 'sup' ? c.structure.gG_dst.valeur : c.structure.gG_stb.valeur;
    const fs = verticales === 'sup' ? c.geotechnique.gG_dst.valeur : c.geotechnique.gG_stb.valeur;
    for (const surchargeSurTalon of [true, false]) {
      const fq = surchargeSurTalon ? gQ : 0;
      const surTalon = bandesSurTalon(d).map((x) => ({ ...x, f: x.nature === 'G' ? fs : fq }));
      const beton = [b.voileRect, b.voileTri, b.semelle];
      const V = fc * beton.reduce((s, x) => s + x.F, 0) + fs * b.terres.F + fq * b.surcharge.F + surTalon.reduce((s, x) => s + x.f * x.F, 0);
      const M =
        fc * beton.reduce((s, x) => s + x.F * (milieu - x.x), 0) +
        fs * b.terres.F * (milieu - b.terres.x) +
        fq * b.surcharge.F * (milieu - b.surcharge.x) +
        surTalon.reduce((s, x) => s + x.f * x.F * (milieu - x.x), 0) +
        M_H;
      const e = M / V;
      const Bp = Math.max(0, regles.largeurPortance(b.B) - 2 * Math.abs(e));
      const nom = `${c.nom}, verticales ${verticales}${surchargeSurTalon ? ', surcharge sur le talon' : ''}`;

      let sol: ResultatPortance | null = null;
      let R_d = 0;
      const p = d.fondation.portance;
      if (Bp > 0) {
        if (p.mode === 'annexeD') {
          sol = regles.portance(p, c, Bp, V, H_d);
          R_d = (Bp * sol.q_u) / c.resistance.gRv.valeur;
        } else {
          R_d = Bp * p.qRd;
        }
      }
      const taux = R_d > 0 ? V / R_d : Infinity;
      cas.push({ nom, verticales, surchargeSurTalon, V, H: H_d, M, e, Bp, sol, R_d, taux });

      // Sections : contrainte lineaire de ce cas. Si la resultante sort de la
      // base, l'etat n'existe pas : la portance est deja refusee.
      if (Bp <= 0) continue;
      const pression = contrainteSol(V, e, b.B);
      const coupes = Math.abs(e) > b.B / 6 ? [e > 0 ? 3 * (milieu - e) : b.B - 3 * (milieu + e)] : [];

      // Patin : reaction du sol moins poids de la semelle, console au nu du voile.
      const wC = fc * d.gammaBeton * es;
      const rp = integrerPression(pression, 0, patin, patin, coupes);
      const V_p = rp.F - wC * patin;
      const Mp = -rp.M - (wC * patin * patin) / 2;
      patinV = pireSection(
        patinV,
        Mp >= 0
          ? verifierSection(ctx, 'patin', nom, 'bas', es * MM_PAR_M, As.semelleBas, As.semelleHaut, 0, Mp, Math.abs(V_p), As.fck, As.fyk)
          : verifierSection(ctx, 'patin', nom, 'haut', es * MM_PAR_M, As.semelleHaut, As.semelleBas, 0, -Mp, Math.abs(V_p), As.fck, As.fyk),
      );

      // Talon : poids et terres moins reaction du sol, console au nu du voile.
      const wT = wC + fs * gamma * h + fq * q;
      const rt = integrerPression(pression, xh, b.B, xh, coupes);
      const V_t = wT * talon + surTalon.reduce((s, x) => s + x.f * x.F, 0) - rt.F;
      const M_t = (wT * talon * talon) / 2 + surTalon.reduce((s, x) => s + x.f * x.F * (x.x - xh), 0) - rt.M;
      talonV = pireSection(
        talonV,
        M_t >= 0
          ? verifierSection(ctx, 'talon', nom, 'haut', es * MM_PAR_M, As.semelleHaut, As.semelleBas, 0, M_t, Math.abs(V_t), As.fck, As.fyk)
          : verifierSection(ctx, 'talon', nom, 'bas', es * MM_PAR_M, As.semelleBas, As.semelleHaut, 0, -M_t, Math.abs(V_t), As.fck, As.fyk),
      );
    }
  }

  const portance = cas.reduce((x, y) => (y.taux > x.taux ? y : x));
  if (!patinV || !talonV) {
    // Aucun cas n'a de resultante dans la base : les sections ne sont pas calculables.
    throw new Error('La résultante sort de la base dans tous les cas : les sections ne sont pas calculables, revoir la géométrie.');
  }
  return { nom: c.nom, poussee, phi_d: (phi_d * 180) / Math.PI, mu_d, glissement, cas, portance, voile, patin: patinV, talon: talonV };
}

function nombreAffiche(valeur: number): string {
  if (!Number.isFinite(valeur)) return 'infini';
  return valeur.toFixed(3).replace('.', ',');
}

/**
 * Verifie le mur : renversement EQU (EN 1997-1 §2.4.7.2 ; moteur
 * equilibre-statique), glissement et portance selon l'approche choisie
 * (§6.5.2, §6.5.3 ; annexe D), position de la resultante (§6.5.4), flexion et
 * tranchant du voile, du patin et du talon (EN 1992-1-1 §6.1, §6.2.2, moteur
 * section-uls), armature minimale (§9.2.1.1).
 */
export function verifierMur(d: DonneesMur, profil: ProfilMur): ResultatMur {
  verifierProfil(profil);
  verifierDonnees(d);
  const b = blocs(d);

  const norme = ec2Recommended();
  const ctx: ContexteSection = {
    beton: createConcrete(d.armatures.fck, norme),
    acier: createSteel(d.armatures.fyk, E_S, norme),
    norme,
    a: d.armatures.a,
  };

  // EQU : jeu propre, phi' divise par son gamma de A.2. Pas de portance ici.
  const KaE = kaRankine(phiCalcul(d.remblai.phi, profil.EQU.sol.gPhi.valeur));
  const pE = pousseeActive(b.Ht, d.remblai.gamma, KaE, d.remblai.q);
  const eqE = verifierEquilibre(donneesEquilibre(d, pE, 0, phiCalcul(d.remblai.phi, profil.EQU.sol.gPhi.valeur)), profilPour(profil.EQU.actions));
  const pivot = eqE.renversement[0];

  // Excentricite : toutes actions caracteristiques, surcharge comprise.
  const KaK = kaRankine(phiCalcul(d.remblai.phi, 1));
  const pK = pousseeActive(b.Ht, d.remblai.gamma, KaK, d.remblai.q);
  const eqK = verifierEquilibre(donneesEquilibre(d, pK, 0, phiCalcul(d.remblai.phi, 1)), profilPour(profil.EQU.actions)).excentricite;
  if (!eqK) throw new Error('Aucun effort normal sur la base : vérifier les poids saisis.');
  const excentricite = { e: eqK.e, limite: b.B / 3, taux: eqK.e / (b.B / 3), noyauCentral: eqK.noyauCentral };

  const res = combinaisons(d.approche, profil).map((c) => calculerCombinaison(d, c, ctx, REGLES_1RE));

  const avertissements: string[] = [];
  if (!excentricite.noyauCentral) avertissements.push('Résultante caractéristique hors du noyau central (e > B/6) : base partiellement décomprimée.');

  return conclure('1re', b, { Ka: KaE, poussee: pE, pivot, taux: pivot.taux }, excentricite, res, avertissements);
}

/**
 * Verifie le mur en 2e generation. Basculement : VC2(a) et VC2(b) de l'EN 1990:2023
 * (EN 1997-1:2024 §8.1.3.1), coefficients sur les actions seules, phi' representatif.
 * Glissement et portance : combinaisons du tableau 7.2 de l'EN 1997-3:2025 (§5.6.3,
 * §5.6.4 ; annexe B.4). Excentricite : tableau 5.3. Sections : EN 1992-1-1:2023, avec
 * le moteur section-uls pour la flexion (f_cd = eta_cc k_tc f_ck / gamma_C).
 *
 * Choix declares, en plus de ceux de la 1re generation :
 *  - e se calcule sur la largeur nominale ; B' = B_d - 2e, B_d = B - 0,1 m sauf
 *    dimensions controlees ; les sections gardent la largeur nominale ;
 *  - phi' est pris comme un angle de pic, gamma = 1,25 k_M et non 1,1 k_M : c'est sur ;
 *  - terres sur le talon, meme source que la poussee, a gamma_G,stb en VC2(a) ; poids
 *    du beton, independant de la poussee, a gamma_G,fav ;
 *  - voile verifie comme une poutre, sans les regles propres aux voiles.
 */
export function verifierMur2e(d: DonneesMur2e, profil: Profil2e): ResultatMur {
  verifierProfil2e(profil);
  verifierDonnees({ ...d, approche: 'DA1' });
  positif(d.Dlower, 'D_lower', 'mm');
  if (d.Dlower < 8) throw new Error("D_lower inférieur à 8 mm : hors du domaine de l'EN 1992-1-1:2023 (mm).");
  if (d.fondation.deltaSurPhi > 1) throw new Error("k_interface ne peut pas dépasser 1 (EN 1997-3 §5.5.3) (-).");
  const b = blocs(d as unknown as DonneesMur);
  const m = d as unknown as DonneesMur;

  const { fck, fyk } = d.armatures;
  const norme: NormProfile = {
    name: 'EN 1992-1-1:2023',
    gammaC: 1.5,
    gammaS: 1.15,
    alphaCc: Math.min((FCK_REF_2023 / fck) ** (1 / 3), 1) * K_TC_2023,
    nBands: ec2Recommended().nBands,
  };
  const ctx: ContexteSection = { beton: createConcrete(fck, norme), acier: createSteel(fyk, E_S, norme), norme, a: d.armatures.a, Dlower: d.Dlower };

  // Basculement : phi' representatif, VC2(a) et VC2(b), le moins favorable.
  const phiRep = phiCalcul(d.remblai.phi, 1);
  const Ka = kaRankine(phiRep);
  const pK = pousseeActive(b.Ht, d.remblai.gamma, Ka, d.remblai.q);
  const kF = profil.kF[d.consequences];
  const gQ = kF.valeur * profil.gQ.valeur;
  const vc2 = (cas: string, gG: number, gTerres: number) => {
    const source = 'EN 1990:2023, tableau A.1.8';
    const v = (valeur: number) => ({ valeur, source });
    const jeu: JeuActions = { gG_dst: v(gG), gG_stb: v(profil.gG_fav.valeur), gQ_dst: v(gQ), gQ_stb: v(0) };
    const brut = verifierEquilibre(donneesEquilibre(m, pK, 0, phiRep), profilPour(jeu)).renversement[0];
    const lignes = brut.lignes.map((l) =>
      l.elementaire.origine.includes('terres sur le talon') && l.role === 'stabilisant' ? { ...l, gamma: gTerres, Md: gTerres * Math.abs(l.M) } : l,
    );
    const M_stb_d = lignes.filter((l) => l.role === 'stabilisant').reduce((s, l) => s + l.Md, 0);
    return { cas, pivot: { ...brut, lignes, M_stb_d, taux: M_stb_d > 0 ? brut.M_dst_d / M_stb_d : Infinity } };
  };
  const a = vc2('VC2(a)', kF.valeur * profil.gG.valeur, profil.gG_stb_VC2a.valeur);
  const bb = vc2('VC2(b)', 1, 1);
  const renv = bb.pivot.taux > a.pivot.taux ? bb : a;

  // Excentricite, tableau 5.3 : permanentes seules, puis avec la variable.
  const milieu = b.B / 2;
  const poids = [b.voileRect, b.voileTri, b.semelle, b.terres, ...bandesSurTalon(m).filter((x) => x.nature === 'G')];
  const pb = pousseesBandes(m, Ka, phiRep);
  const momentBandes = (n: 'G' | 'Q') => pb.filter((x) => x.nature === n).reduce((s, x) => s + x.P * x.z, 0);
  const V0 = poids.reduce((s, x) => s + x.F, 0);
  const M0 = poids.reduce((s, x) => s + x.F * (milieu - x.x), 0);
  const eG = (M0 + (pK.P_G * b.Ht) / 3 + momentBandes('G')) / V0;
  const eGQ = eG + ((pK.P_Q * b.Ht) / 2 + momentBandes('Q')) / V0;
  const tauxG = Math.abs(eG) / (b.B / 6);
  const tauxGQ = Math.abs(eGQ) / (b.B / 3);
  const excentricite =
    tauxG >= tauxGQ
      ? { e: eG, limite: b.B / 6, taux: tauxG, noyauCentral: Math.abs(eGQ) <= b.B / 6, detail: { eG, tauxG, eGQ, tauxGQ } }
      : { e: eGQ, limite: b.B / 3, taux: tauxGQ, noyauCentral: Math.abs(eGQ) <= b.B / 6, detail: { eG, tauxG, eGQ, tauxGQ } };

  if (d.fondation.portance.mode === 'annexeD') {
    const phi = (d.fondation.phi * Math.PI) / 180;
    if (Math.atan(d.fondation.deltaSurPhi * Math.tan(phi)) < phi / 2) {
      throw new Error("Interface trop lisse : l'annexe B.4 de l'EN 1997-3 ne donne N_gamma que pour delta au moins égal à phi'/2 ; saisir q_Rd (-).");
    }
  }
  const regles = regles2e(d);
  const res = combinaisons2e(d.approche, d.consequences, profil).map((c) => calculerCombinaison(m, c, ctx, regles));

  const avertissements: string[] = [];
  const eMax = Math.max(...res.flatMap((r) => r.cas.map((c) => Math.abs(c.e))));
  if (eMax > b.B / 3) {
    avertissements.push('Excentricité de calcul supérieure à B/3 : revoir les valeurs de calcul des actions et la position du bord de la semelle (EN 1997-3 §5.6.3).');
  }
  if (!d.dimensionsControlees) avertissements.push('Largeur de calcul de la portance réduite de 0,1 m (EN 1997-3 §5.6.3).');

  return conclure('2e', b, { Ka, poussee: pK, pivot: renv.pivot, taux: renv.pivot.taux, cas: renv.cas }, excentricite, res, avertissements);
}

/** Les taux par nature de constat, et le verdict. */
function conclure(
  generation: ResultatMur['generation'],
  b: ReturnType<typeof blocs>,
  renversement: ResultatMur['renversement'],
  excentricite: ResultatMur['excentricite'],
  res: ResultatCombinaison[],
  avertissements: string[],
): ResultatMur {
  const pivot = renversement.pivot;
  const lignesExt: [string, number][] = [
    ["renversement autour de l'arête du patin", pivot.taux],
    ...res.flatMap((r): [string, number][] => [
      [`glissement, ${r.nom}`, r.glissement.taux],
      [`portance, ${r.nom}`, r.portance.taux],
    ]),
  ];
  const lignesSec: [string, number][] = res.flatMap((r) =>
    [r.voile, r.patin, r.talon].flatMap((s): [string, number][] => [
      [`flexion du ${s.section}, ${r.nom}`, s.tauxFlexion],
      [`tranchant du ${s.section}, ${r.nom}`, s.tauxTranchant],
    ]),
  );
  const lignesDisp: [string, number][] = [
    ['excentricité de la résultante', excentricite.taux],
    ...res.flatMap((r) =>
      [r.voile, r.patin, r.talon].map((s): [string, number] => [`armature minimale du ${s.section}`, s.As > 0 ? s.As_min / s.As : Infinity]),
    ),
  ];
  const max = (l: [string, number][]): [string, number] => l.reduce((a, v) => (v[1] > a[1] ? v : a));
  const tous = [...lignesExt, ...lignesSec, ...lignesDisp];
  const [nom, tMax] = max(tous);
  const ok = tMax <= 1;

  return {
    generation,
    B: b.B,
    Ht: b.Ht,
    poids: { voile: b.voileRect.F + b.voileTri.F, semelle: b.semelle.F, terresTalon: b.terres.F, surchargeTalon: b.surcharge.F },
    renversement,
    excentricite,
    combinaisons: res,
    tauxExterne: max(lignesExt)[1],
    tauxSections: max(lignesSec)[1],
    tauxDispositions: max(lignesDisp)[1],
    verdict: ok ? 'conforme' : 'non-conforme',
    motif: `${ok ? 'Vérifications satisfaites' : 'Vérifications non satisfaites'} : taux maximal ${nombreAffiche(tMax)} (${nom}).`,
    avertissements,
  };
}
