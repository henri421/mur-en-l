/**
 * Les textes affiches, en francais et en anglais. PUR.
 * Aucun texte ne se lit au chargement d'un module : toujours `textes()` ou `phrase()` au moment du rendu.
 */

import { langueCourante, traducteur } from 'aedificium-ui';

const FR = {
  messages: {
    nombreAttendu: (champ: string, brut: string) => `${champ} : nombre attendu, reçu « ${brut} ».`,
    positifAttendu: (champ: string, brut: string) =>
      `${champ} : valeur strictement positive attendue, reçue « ${brut} ».`,
    format: (recu: string, attendu: string) => `Fichier de format ${recu} : attendu ${attendu}.`,
    rienAExporter: 'Aucun calcul valide à exporter : corriger la saisie.',
    nouvelleVersion: 'Une nouvelle version est disponible. Recharger maintenant ?',
  },
};

export type Textes = typeof FR;

const EN: Textes = {
  messages: {
    nombreAttendu: (champ: string, brut: string) => `${champ}: number expected, got “${brut}”.`,
    positifAttendu: (champ: string, brut: string) => `${champ}: positive value expected, got “${brut}”.`,
    format: (recu: string, attendu: string) => `File of format ${recu}: expected ${attendu}.`,
    rienAExporter: 'No valid calculation to export: correct the input.',
    nouvelleVersion: 'A new version is available. Reload now?',
  },
};

export function textes(): Textes {
  return langueCourante() === 'en' ? EN : FR;
}

/** Traduit une phrase du noyau ; en francais, elle sort intacte. */
export const phrase = traducteur({}, []);
