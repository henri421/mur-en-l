/**
 * Cablage de l'interface du mur en L.
 *
 * Ce module ne calcule RIEN : il tient la saisie, appelle le noyau par `form`,
 * et confie la mise en forme aux modules purs. La generation n'est qu'un champ
 * de la saisie : la basculer ne touche a aucune valeur saisie.
 */

import {
  blocsEnTexte,
  definirLangue,
  echapper,
  langueDuDocument,
  noteDeCalculHtml,
  notationHtml,
  ouvrirOuTelecharger,
  resultatsEnCsv,
  svgAutonome,
  telecharger,
} from 'aedificium-ui';
import type { ResultatMur } from '../../src/index';
import { lireSaisie, relire, saisieParDefaut, serialiser, verifier, type Calcul, type Saisie } from './form';
import { baseSvg, coupe, phiDeLaVue, projectionSvg, vuesDisponibles } from './dessin';
import { STYLES_TRACE } from './export';
import { noteDuCalcul } from './note';
import { textes } from './textes';
import { blocEntrees, blocsResultat, messageDErreur, verdictsHtml, voletsHtml } from './vue';
import './style.css';

// La langue d'abord : tout rendu la lit (`index.html` ou `en/index.html`).
definirLangue(langueDuDocument(document));

const CLE_SAISIE = 'mur-en-l/saisie';
const CLE_CARTOUCHE = 'mur-en-l:cartouche';

function exige<T extends Element>(selecteur: string): T {
  const e = document.querySelector<T>(selecteur);
  if (e === null) throw new Error(`Élément absent de la page : ${selecteur}`);
  return e;
}

const formulaire = exige<HTMLFormElement>('#formulaire');
const zones = {
  erreur: exige<HTMLElement>('[data-role="erreur"]'),
  bandes: exige<HTMLElement>('[data-role="bandes"]'),
  vues: exige<HTMLElement>('[data-role="vues"]'),
  coupe: exige<HTMLElement>('[data-role="coupe"]'),
  base: exige<HTMLElement>('[data-role="base"]'),
  projection: exige<HTMLElement>('[data-role="projection"]'),
  verdicts: exige<HTMLElement>('[data-role="verdicts"]'),
  volets: exige<HTMLElement>('[data-role="volets"]'),
};
const champProjet = exige<HTMLInputElement>('[data-role="projet"]');
const champElement = exige<HTMLInputElement>('[data-role="element"]');

function charger(): Saisie | null {
  try {
    const t = window.localStorage.getItem(CLE_SAISIE);
    return t === null ? null : relire(t);
  } catch {
    return null;
  }
}

function memoriser(): void {
  try {
    window.localStorage.setItem(CLE_SAISIE, serialiser(saisie));
  } catch {
    // Stockage indisponible : la page fonctionne sans.
  }
}

function lireCartouche(): { projet: string; element: string } {
  try {
    const t = window.localStorage.getItem(CLE_CARTOUCHE);
    if (t === null) return { projet: '', element: '' };
    const c = JSON.parse(t) as { projet?: unknown; element?: unknown };
    return {
      projet: typeof c.projet === 'string' ? c.projet : '',
      element: typeof c.element === 'string' ? c.element : '',
    };
  } catch {
    return { projet: '', element: '' };
  }
}

let saisie: Saisie = charger() ?? saisieParDefaut();

interface Dernier {
  calcul: Calcul;
  resultat: ResultatMur;
}
let dernier: Dernier | null = null;
let vue = '';

type Racine = Record<string, unknown>;

function valeurDuChamp(chemin: string): string | boolean {
  const [cle, sous] = chemin.split('.');
  const racine = saisie as unknown as Racine;
  if (sous === undefined) return racine[cle] as string | boolean;
  return (racine[cle] as Racine)[sous] as string;
}

function ecrireLeChamp(chemin: string, valeur: string | boolean): void {
  const [cle, sous] = chemin.split('.');
  const racine = saisie as unknown as Racine;
  if (sous === undefined) racine[cle] = valeur;
  else (racine[cle] as Racine)[sous] = valeur;
}

function ecrireSaisie(): void {
  for (const e of formulaire.querySelectorAll<HTMLInputElement | HTMLSelectElement>('[data-champ]')) {
    const chemin = e.dataset.champ;
    if (chemin === undefined) continue;
    const v = valeurDuChamp(chemin);
    if (e instanceof HTMLInputElement && e.type === 'checkbox') e.checked = v === true;
    else e.value = String(v);
  }
  dessinerBandes();
  ajusterGeneration();
  ajusterModePortance();
}

/** Les lignes de bandes vivent dans la zone `data-role="bandes"`, une par charge. */
function dessinerBandes(): void {
  zones.bandes.innerHTML = saisie.bandes
    .map(
      (b, i) => `<tr>
        <td><select data-bande="${i}" data-bande-champ="nature" aria-label="Nature de la bande ${i + 1}">
          <option value="G"${b.nature === 'G' ? ' selected' : ''}>G</option>
          <option value="Q"${b.nature === 'Q' ? ' selected' : ''}>Q</option>
        </select></td>
        <td><input type="text" inputmode="decimal" data-bande="${i}" data-bande-champ="q" value="${echapper(b.q)}" aria-label="q de la bande ${i + 1}" /></td>
        <td><input type="text" inputmode="decimal" data-bande="${i}" data-bande-champ="distance" value="${echapper(b.distance)}" aria-label="distance de la bande ${i + 1}" /></td>
        <td><input type="text" inputmode="decimal" data-bande="${i}" data-bande-champ="largeur" value="${echapper(b.largeur)}" aria-label="largeur de la bande ${i + 1}" /></td>
        <td><button type="button" data-action="retirer-bande" data-bande="${i}" aria-label="Retirer la charge ${i + 1}">&times;</button></td>
      </tr>`
    )
    .join('');
}

function montrerErreur(message: string | null): void {
  zones.erreur.hidden = message === null;
  zones.erreur.innerHTML = message === null ? '' : notationHtml(message);
}

/** Les champs propres a une generation s'affichent avec elle ; leur valeur reste en memoire. */
function ajusterGeneration(): void {
  for (const b of document.querySelectorAll<HTMLButtonElement>('[data-generation]')) {
    b.setAttribute('aria-pressed', String(b.dataset.generation === saisie.generation));
  }
  for (const g of formulaire.querySelectorAll<HTMLElement>('[data-groupe]')) {
    g.hidden = g.dataset.groupe !== saisie.generation;
  }
}

/** Les champs de portance suivent le mode choisi ; l'autre mode garde sa valeur. */
function ajusterModePortance(): void {
  for (const z of formulaire.querySelectorAll<HTMLElement>('[data-portance-groupe]')) {
    z.hidden = z.dataset.portanceGroupe !== saisie.modePortance;
  }
}

function optionsDessin(): { cotes: boolean; bras: boolean } {
  return {
    cotes: exige<HTMLInputElement>('[data-option="cotes"]').checked,
    bras: exige<HTMLInputElement>('[data-option="bras"]').checked,
  };
}

function dessinerVues(): void {
  const vues = dernier === null ? [] : vuesDisponibles(dernier.resultat);
  if (!vues.includes(vue)) vue = vues[0] ?? '';
  zones.vues.innerHTML = vues
    .map(
      (v) =>
        `<button type="button" data-vue="${echapper(v)}" aria-pressed="${v === vue}">${echapper(v)}</button>`
    )
    .join('');
}

function renduDessin(): void {
  if (dernier === null) {
    zones.coupe.innerHTML = '';
    zones.base.innerHTML = '';
    zones.projection.innerHTML = '';
    return;
  }
  zones.coupe.innerHTML = coupe(dernier.calcul, dernier.resultat, vue, optionsDessin());
  zones.base.innerHTML = baseSvg(dernier.resultat, vue);
  zones.projection.innerHTML = projectionSvg(dernier.calcul, phiDeLaVue(dernier.resultat, vue));
}

function viderResultats(): void {
  dernier = null;
  vue = '';
  zones.vues.innerHTML = '';
  zones.verdicts.innerHTML = '';
  zones.volets.innerHTML = '';
  renduDessin();
}

function recalculer(): void {
  memoriser();
  ajusterGeneration();
  ajusterModePortance();
  const lecture = lireSaisie(saisie);
  if (!lecture.ok) {
    montrerErreur(lecture.message);
    viderResultats();
    return;
  }
  let resultat: ResultatMur;
  try {
    resultat = verifier(lecture.calcul);
  } catch (e) {
    montrerErreur(messageDErreur(e));
    viderResultats();
    return;
  }
  montrerErreur(null);
  dernier = { calcul: lecture.calcul, resultat };
  dessinerVues();
  zones.verdicts.innerHTML = verdictsHtml(resultat);
  zones.volets.innerHTML = voletsHtml(resultat);
  renduDessin();
}

formulaire.addEventListener('input', (evenement) => {
  const cible = evenement.target;
  if (!(cible instanceof HTMLInputElement || cible instanceof HTMLSelectElement)) return;

  const index = cible.dataset.bande;
  const champBande = cible.dataset.bandeChamp;
  if (index !== undefined && champBande !== undefined) {
    const i = Number(index);
    const bande = saisie.bandes[i];
    if (bande === undefined) return;
    if (champBande === 'nature') bande.nature = cible.value === 'G' ? 'G' : 'Q';
    else if (champBande === 'q' || champBande === 'distance' || champBande === 'largeur') bande[champBande] = cible.value;
    return recalculer();
  }

  const chemin = cible.dataset.champ;
  if (chemin === undefined) return;
  const valeur = cible instanceof HTMLInputElement && cible.type === 'checkbox' ? cible.checked : cible.value;
  ecrireLeChamp(chemin, valeur);
  recalculer();
});

formulaire.addEventListener('change', (e) => {
  if (e.target instanceof HTMLSelectElement || (e.target instanceof HTMLInputElement && e.target.type === 'checkbox')) {
    e.target.dispatchEvent(new Event('input', { bubbles: true }));
  }
});

for (const nom of ['cotes', 'bras']) {
  exige<HTMLInputElement>(`[data-option="${nom}"]`).addEventListener('input', () => renduDessin());
}

document.addEventListener('click', (evenement) => {
  const cible = evenement.target;
  if (!(cible instanceof HTMLElement)) return;

  const generation = cible.dataset.generation;
  if (generation === '1re' || generation === '2e') {
    saisie.generation = generation;
    ecrireSaisie();
    return recalculer();
  }

  const v = cible.dataset.vue;
  if (v !== undefined) {
    vue = v;
    dessinerVues();
    return renduDessin();
  }

  const action = cible.dataset.action;
  if (action === undefined) return;

  if (action === 'ajouter-bande') {
    saisie.bandes.push({ nature: 'G', q: '10', distance: '1', largeur: '1' });
    dessinerBandes();
    return recalculer();
  }
  if (action === 'retirer-bande') {
    const i = Number(cible.dataset.bande);
    if (Number.isInteger(i)) saisie.bandes.splice(i, 1);
    dessinerBandes();
    return recalculer();
  }
  if (action === 'enregistrer') {
    return telecharger('mur-en-l.json', serialiser(saisie), 'application/json;charset=utf-8');
  }
  if (action === 'reinitialiser') {
    saisie = saisieParDefaut();
    ecrireSaisie();
    return recalculer();
  }

  if (!action.startsWith('exporter-')) return;
  if (dernier === null) return montrerErreur(textes().messages.rienAExporter);
  const d = dernier;
  if (action === 'exporter-coupe') {
    const trace = coupe(d.calcul, d.resultat, vue, optionsDessin());
    telecharger(`mur-en-l-${vue || 'coupe'}-coupe.svg`, svgAutonome(trace, STYLES_TRACE), 'image/svg+xml;charset=utf-8');
  } else if (action === 'exporter-resultats') {
    const blocs = [blocEntrees(d.calcul), ...blocsResultat(d.resultat)];
    telecharger('mur-en-l-resultats.csv', resultatsEnCsv(blocsEnTexte(blocs)), 'text/csv;charset=utf-8');
  } else if (action === 'exporter-note') {
    const note = noteDuCalcul(d.calcul, d.resultat, cartouche());
    ouvrirOuTelecharger('mur-en-l-note.html', noteDeCalculHtml(note, STYLES_TRACE));
  }
});

function cartouche(): { projet: string; element: string; date: string } {
  return {
    projet: champProjet.value,
    element: champElement.value,
    date: new Date().toISOString().slice(0, 10),
  };
}

exige<HTMLInputElement>('[data-role="ouvrir"]').addEventListener('change', async (e) => {
  const entree = e.target as HTMLInputElement;
  const f = entree.files?.[0];
  entree.value = '';
  if (f === undefined) return;
  try {
    saisie = relire(await f.text());
  } catch (err) {
    return montrerErreur(messageDErreur(err));
  }
  ecrireSaisie();
  recalculer();
});

const cartoucheMemorise = lireCartouche();
champProjet.value = cartoucheMemorise.projet;
champElement.value = cartoucheMemorise.element;
exige<HTMLElement>('#sorties').addEventListener('input', () => {
  try {
    window.localStorage.setItem(
      CLE_CARTOUCHE,
      JSON.stringify({ projet: champProjet.value, element: champElement.value })
    );
  } catch {
    // Stockage indisponible : la page fonctionne sans.
  }
});

ecrireSaisie();
recalculer();

// Hors navigateur (tests), pas de service worker.
if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
  void import('./pwa').then((m) => m.enregistrerServiceWorker());
}
