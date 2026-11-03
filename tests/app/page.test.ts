/** T1 : la page, sa configuration, le cablage de main.ts. */

import { describe, expect, it } from 'vitest';
import { JETONS, constatsAffichage, contenuBalise, texteVisible, valeursDesJetons } from 'aedificium-ui';
import { saisieParDefaut } from '../../app/src/form';
import { lire } from './_commun';

const page = lire('../../app/index.html');
const main = lire('../../app/src/main.ts');

describe('page', () => {
  it('titre', () => {
    expect(contenuBalise(page, 'h1')).toBe('Mur en L');
    expect(contenuBalise(page, 'title')?.startsWith('Mur en L')).toBe(true);
  });

  it('un champ par valeur saisie', () => {
    const d = saisieParDefaut();
    for (const [cle, v] of Object.entries(d)) {
      if (cle === 'generation' || cle === 'bandes' || cle === 'coefficients1' || cle === 'coefficients2') continue;
      if (typeof v === 'object') {
        expect(page).toContain(`data-champ="${cle}.diametre"`);
        expect(page).toContain(`data-champ="${cle}.espacement"`);
      } else {
        expect(page).toContain(`data-champ="${cle}"`);
      }
    }
  });

  it('generations, approches par generation, modes de portance', () => {
    expect(page).toContain('data-generation="1re"');
    expect(page).toContain('data-generation="2e"');
    expect(page).toContain('data-groupe="1re"');
    expect(page).toContain('data-groupe="2e"');
    expect(page).toContain('data-portance="annexeD"');
    expect(page).toContain('data-portance="saisie"');
    for (const v of ['DA1', 'DA2', 'DA2*', 'DA3', 'a+b', 'c', 'd', 'CC1', 'CC2', 'CC3']) expect(page).toContain(`value="${v}"`);
  });

  it('bandes, zones de resultat, options du dessin, sorties', () => {
    for (const r of ['bandes', 'coefficients', 'erreur', 'vues', 'coupe', 'base', 'projection', 'verdicts', 'volets', 'projet', 'element', 'ouvrir']) {
      expect(page).toContain(`data-role="${r}"`);
    }
    for (const a of ['ajouter-bande', 'exporter-note', 'exporter-coupe', 'exporter-resultats', 'enregistrer', 'reinitialiser']) {
      expect(page).toContain(`data-action="${a}"`);
    }
    expect(page).toContain('data-option="cotes"');
    expect(page).toContain('data-option="bras"');
  });

  it('le hors-perimetre et les valeurs recommandees sont annonces', () => {
    const t = texteVisible(page);
    for (const m of ['nappe', 'bêche', 'talus', 'non drainé', 'stabilité générale']) expect(t).toContain(m);
    expect(t).toContain('annexe nationale');
  });

  it('notations, accents, phrases types', () => {
    expect(constatsAffichage(texteVisible(page))).toEqual([]);
  });

  it('pas de reste du gabarit', () => {
    for (const f of [page, main, lire('../../vite.config.ts'), lire('../../app/src/pwa.ts')]) {
      expect(f.toLowerCase()).not.toContain('cisaillement');
    }
    expect(lire('../../vite.config.ts')).toContain('mur-en-l');
  });

  it('le :root de style.css concorde avec les jetons communs', () => {
    const css = valeursDesJetons(lire('../../app/src/style.css'));
    for (const [nom, valeur] of valeursDesJetons(JETONS)) expect(css.get(nom)).toBe(valeur);
  });
});

describe('main.ts', () => {
  it('passe par le formulaire et les modules purs', () => {
    for (const f of ['lireSaisie(', 'verifier(', 'verdictsHtml(', 'voletsHtml(', 'coupe(', 'baseSvg(', 'projectionSvg(', 'vuesDisponibles(', 'noteDuCalcul(', 'blocsEnTexte(', 'noteDeCalculHtml(']) {
      expect(main).toContain(f);
    }
    expect(main).toMatch(/import \{[^}]*\bnoteDeCalculHtml\b[^}]*\} from 'aedificium-ui'/);
  });

  it('memorise saisie et cartouche sous le nom de l outil', () => {
    expect(main).toContain("'mur-en-l/saisie'");
    expect(main).toContain("'mur-en-l:cartouche'");
  });

  it('l interface ne calcule rien', () => {
    expect(main).not.toContain('verifierMur');
    for (const f of [main, lire('../../app/src/vue.ts'), lire('../../app/src/note.ts')]) {
      expect(f).not.toMatch(/Math\.(tan|sin|cos|atan|exp|sqrt)/);
    }
  });
});
