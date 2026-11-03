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

/**
 * Coefficient de pression retenu : K = p K_a + (1 - p) K_0, avec K_0 = 1 - sin phi'
 * (sol normalement consolide, terre-plein horizontal). `partKa` = 1 pour la poussee
 * active, 0 pour le repos, entre les deux pour un mur qui se deplace peu.
 */
export function coefficientPoussee(phiRadians: number, partKa = 1): number {
  return partKa * kaRankine(phiRadians) + (1 - partKa) * (1 - Math.sin(phiRadians));
}

/**
 * Coefficient de poussee de Coulomb, ecran vertical, terre-plein horizontal,
 * frottement delta sur l'ecran (EN 1997-1 annexe C, C.2, cas alpha = beta = 0) :
 * K_a = cos^2 phi / [cos delta (1 + sqrt(sin(phi + delta) sin phi / cos delta))^2].
 * Rend K_a et sa composante horizontale K_ah = K_a cos delta. Angles en radians.
 */
export function kaCoulomb(phiRadians: number, deltaRadians: number): { Ka: number; Kah: number } {
  const c = Math.cos(deltaRadians);
  const r = Math.sqrt((Math.sin(phiRadians + deltaRadians) * Math.sin(phiRadians)) / c);
  const Ka = Math.cos(phiRadians) ** 2 / (c * (1 + r) ** 2);
  return { Ka, Kah: Ka * c };
}

/**
 * Coefficient horizontal sur le parement reel du voile, avec delta = rapport x phi' :
 * K_h = p K_ah + (1 - p) K_0. Le repos est pris sans frottement. Rapport nul :
 * on retrouve `coefficientPoussee`.
 */
export function coefficientParement(phiRadians: number, rapportDelta: number, partKa = 1): number {
  if (rapportDelta === 0) return coefficientPoussee(phiRadians, partKa);
  const { Kah } = kaCoulomb(phiRadians, rapportDelta * phiRadians);
  return partKa * Kah + (1 - partKa) * (1 - Math.sin(phiRadians));
}

export interface Poussee {
  /** Coefficient de pression retenu, K_a sauf si le mur est calcule plus pres du repos. */
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

/**
 * Portance drainee en 2e generation, EN 1997-3:2025 formule (5.5) et annexe B.4,
 * semelle filante sur base et terrain horizontaux : B'/L' = 0, donc s = 1 et
 * m = m_B = 2, b = g = 1.
 *
 * N_gamma = 2 (N_q + 1) tan phi' (B.3), base rugueuse. Les facteurs d'inclinaison
 * ne font plus intervenir la cohesion : i_q = (1 - T/N)^2 (B.4). Le facteur de
 * profondeur n'est applique que si `Df` est donne, 5.5.2.1 le limitant au cas
 * d'une terre au moins aussi resistante au-dessus de la base.
 */
export function portanceDrainee2e(d: DonneesPortance & { Df?: number }): ResultatPortance {
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
  const Ngamma = 2 * (Nq + 1) * t;
  const base = Math.max(0, 1 - d.H / d.V);
  const iq = base ** 2;
  const igamma = base ** 3;
  const ic = Math.max(0, iq - (1 - iq) / (Nc * t));
  let dq = 1;
  if (d.Df !== undefined && d.Df > 0) {
    const rapport = d.Df / d.Bp;
    dq = 1 + 2 * t * (1 - Math.sin(d.phi)) ** 2 * (rapport <= 1 ? rapport : Math.atan(rapport));
  }
  const dc = dq - (1 - dq) / (Nc * t);
  const q_u = d.c * Nc * dc * ic + d.q * Nq * dq * iq + 0.5 * d.gamma * d.Bp * Ngamma * igamma;
  return { Nq, Nc, Ngamma, iq, ic, igamma, q_u };
}
