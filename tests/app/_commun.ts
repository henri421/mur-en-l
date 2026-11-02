/** Saisies et lecture partagees par les tests d'acceptation de l'interface. */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { lireSaisie, saisieParDefaut, verifier, type Calcul, type Saisie } from '../../app/src/form';
import type { ResultatMur } from '../../src/index';

export const lire = (chemin: string): string => readFileSync(fileURLToPath(new URL(chemin, import.meta.url)), 'utf8');

export function calculer(s: Saisie): { calcul: Calcul; r: ResultatMur } {
  const l = lireSaisie(s);
  if (!l.ok) throw new Error(l.message);
  return { calcul: l.calcul, r: verifier(l.calcul) };
}

const BANDE_LOIN = { nature: 'Q' as const, q: '20', distance: '2,6', largeur: '1' };
const BANDE_TALON = { nature: 'G' as const, q: '10', distance: '0,4', largeur: '0,8' };
const BANDE_CHEVAL = { nature: 'G' as const, q: '10', distance: '1,1', largeur: '1' };

export const avecBandes = (s: Partial<Saisie> = {}): Saisie => ({
  ...saisieParDefaut(),
  q: '0',
  bandes: [BANDE_LOIN, BANDE_TALON, BANDE_CHEVAL],
  ...s,
});

/** Toutes les formes de resultat que l'interface doit savoir afficher. */
export const SAISIES: [string, Saisie][] = [
  ['defaut', saisieParDefaut()],
  ['DA2', { ...saisieParDefaut(), approche1: 'DA2' }],
  ['DA3', { ...saisieParDefaut(), approche1: 'DA3' }],
  ['2e a+b', { ...saisieParDefaut(), generation: '2e' }],
  ['2e c', { ...saisieParDefaut(), generation: '2e', approche2: 'c' }],
  ['2e d CC3', { ...saisieParDefaut(), generation: '2e', approche2: 'd', consequences: 'CC3' }],
  ['2e controle', { ...saisieParDefaut(), generation: '2e', dimensionsControlees: true, profondeurComptee: true }],
  ['moitie Ka', { ...saisieParDefaut(), partKa: '50' }],
  ['repos 2e', { ...saisieParDefaut(), generation: '2e', partKa: '0' }],
  ['fruit', { ...saisieParDefaut(), eBas: '0,4' }],
  ['qRd', { ...saisieParDefaut(), modePortance: 'saisie' }],
  ['qRd 2e', { ...saisieParDefaut(), generation: '2e', modePortance: 'saisie' }],
  ['interface', { ...saisieParDefaut(), deltaSurPhi: '0,67' }],
  ['sans surcharge', { ...saisieParDefaut(), q: '0' }],
  ['sans patin', { ...saisieParDefaut(), patin: '0' }],
  ['bandes', avecBandes()],
  ['bandes 2e', avecBandes({ generation: '2e' })],
  ['barres absentes', { ...saisieParDefaut(), semelleBas: { diametre: '0', espacement: '150' } }],
];
