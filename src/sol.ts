/**
 * Calculs de sol du mur en L : poussee active et portance drainee.
 *
 * Unites : m, kN, kPa, kN/m3, degres pour les angles saisis. Tout est rendu
 * par metre de mur.
 *
 * Module ecrit pour le mur en L, sans reprise du code de Fondbis. Il pourra
 * devenir le paquet sol partage quand Fondbis sera refondu.
 */

const RAD_PAR_DEG = Math.PI / 180;

function positif(v: number, nom: string, unite: string): number {
  if (!(Number.isFinite(v) && v > 0)) throw new Error(`${nom} doit être un nombre strictement positif (${unite}).`);
  return v;
}

function positifOuNul(v: number, nom: string, unite: string): number {
  if (!(Number.isFinite(v) && v >= 0)) throw new Error(`${nom} doit être un nombre positif ou nul (${unite}).`);
  return v;
}

/** tan(phi_d) = tan(phi_k) / gamma_phi, EN 1997-1 §2.4.6.2. Rendu en radians. */
export function phiCalcul(phiDegres: number, gPhi: number): number {
  if (!(Number.isFinite(phiDegres) && phiDegres > 0 && phiDegres < 90)) throw new Error("L'angle de frottement doit être compris entre 0 et 90 (°).");
  positif(gPhi, 'Le coefficient gamma_phi', '-');
  return Math.atan(Math.tan(phiDegres * RAD_PAR_DEG) / gPhi);
}

/**
 * Coefficient de poussee de Rankine, terre-plein horizontal et ecran vertical
 * sans frottement : K_a = (1 - sin phi) / (1 + sin phi).
 *
 * Choix : sur l'ecran virtuel au droit du talon, le frottement est celui du sol
 * sur lui-meme avec une contrainte parallele au terre-plein, donc nul quand le
 * terre-plein est horizontal. Le talus incline et Coulomb sont hors perimetre.
 */
export function kaRankine(phiRadians: number): number {
  const s = Math.sin(phiRadians);
  return (1 - s) / (1 + s);
}

export interface Poussee {
  Ka: number;
  /** Resultante des terres (kN/m), au tiers de la hauteur depuis la base. */
  P_G: number;
  /** Resultante de la surcharge (kN/m), a mi-hauteur. */
  P_Q: number;
}

/** Poussee sur un ecran vertical de hauteur H, remblai sans cohesion, sans nappe. */
export function pousseeActive(H: number, gamma: number, Ka: number, q: number): Poussee {
  positif(H, "La hauteur de l'écran", 'm');
  positif(gamma, 'Le poids volumique du remblai', 'kN/m3');
  positifOuNul(q, 'La surcharge', 'kPa');
  return { Ka, P_G: 0.5 * Ka * gamma * H * H, P_Q: Ka * q * H };
}

export interface DonneesPortance {
  /** Largeur efficace B' = B - 2e (m). */
  Bp: number;
  /** Charges de calcul sur la base (kN/m). */
  V: number;
  H: number;
  /** Parametres de calcul : phi' (radians), c' (kPa). */
  phi: number;
  c: number;
  /** Poids volumique efficace sous la base (kN/m3). */
  gamma: number;
  /** Contrainte efficace au niveau de la base, a cote de la semelle (kPa). */
  q: number;
}

export interface ResultatPortance {
  Nq: number;
  Nc: number;
  Ngamma: number;
  iq: number;
  ic: number;
  igamma: number;
  /** Resistance du terrain R/A' avant gamma_Rv (kPa). */
  q_u: number;
}

/**
 * Portance en conditions drainees, EN 1997-1 annexe D, formule D.2, pour une
 * semelle filante : facteurs de forme s = 1 (D.4(5)), base horizontale b = 1,
 * m = m_B = 2 (L' infini, charge H dans la direction de B').
 *
 * N_gamma = 2 (N_q - 1) tan phi' suppose une base rugueuse (delta >= phi'/2).
 * Une charge H telle que 1 - H/(V + A'c' cot phi') <= 0 annule les facteurs
 * d'inclinaison.
 */
export function portanceDrainee(d: DonneesPortance): ResultatPortance {
  positif(d.Bp, 'La largeur efficace', 'm');
  positif(d.V, "L'effort vertical", 'kN/m');
  positifOuNul(d.H, "L'effort horizontal", 'kN/m');
  positif(d.phi, "L'angle de frottement de calcul", 'rad');
  positifOuNul(d.c, 'La cohésion', 'kPa');
  positif(d.gamma, 'Le poids volumique du sol de fondation', 'kN/m3');
  positifOuNul(d.q, 'La contrainte au niveau de la base', 'kPa');

  const t = Math.tan(d.phi);
  const Nq = Math.exp(Math.PI * t) * Math.tan(Math.PI / 4 + d.phi / 2) ** 2;
  const Nc = (Nq - 1) / t;
  const Ngamma = 2 * (Nq - 1) * t;
  const base = Math.max(0, 1 - d.H / (d.V + (d.Bp * d.c) / t));
  const iq = base ** 2;
  const igamma = base ** 3;
  const ic = Math.max(0, iq - (1 - iq) / (Nc * t));
  const q_u = d.c * Nc * ic + d.q * Nq * iq + 0.5 * d.gamma * d.Bp * Ngamma * igamma;
  return { Nq, Nc, Ngamma, iq, ic, igamma, q_u };
}
