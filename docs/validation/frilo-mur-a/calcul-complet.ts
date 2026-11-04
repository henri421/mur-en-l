// Mur A de Frilo, toutes donnees saisies : actions C et F, terre sur le patin, about frottant.
// Lancer depuis la racine : npx vite-node docs/validation/frilo-mur-a/calcul-complet.ts
import { deriverProfil, profilRecommande, verifierMur, type DonneesMur, type MethodeBandes } from '../../../src/index';

const f = (x: number, n = 2) => x.toFixed(n);
const profil = deriverProfil(profilRecommande(), { 'EQU.sol.gPhi': 1, 'beton.cRdc': 0.15, 'beton.k1': 0.12 });
for (const methode of ['diffusion', 'din4085'] as MethodeBandes[]) {
  const d: DonneesMur = {
    geometrie: { h: 6.08, eHaut: 0.45, eBas: 0.45, es: 0.4, patin: 0.6, talon: 2.4 },
    gammaBeton: 25,
    remblai: {
      gamma: 18, phi: 32.5, q: 0, deltaParement: 2 / 3, deltaAbout: 2 / 3, methodeBandes: methode,
      charges: [
        { nature: 'Q', action: 'F', q: 2, distance: 0, largeur: 2.3 },
        { nature: 'Q', action: 'F', q: 5, distance: 2.3, largeur: 1.95 },
        { nature: 'Q', action: 'F', q: 20, distance: 4.25, largeur: 3 },
        { nature: 'Q', action: 'F', q: 9, distance: 7.25, largeur: 3.5 },
      ],
    },
    fondation: { phi: 30, deltaSurPhi: 1, portance: { mode: 'annexeD', phi: 32.5, c: 0, gamma: 18, D: 0.6 } },
    hAval: 0.6,
    chargesTete: [{ nature: 'Q', action: 'C', H: 2.8, V: 0, M: 2.52 }],
    actions: [{ id: 'F', psi0: 0.7 }, { id: 'C', psi0: 0.7 }],
    armatures: { fck: 30, fyk: 500, a: 55, voileArriere: 1643, voileAvant: 0, semelleHaut: 1546, semelleBas: 498 },
    approche: 'DA2*',
    talonPrisme: true,
    frottementBase: true,
  };
  const r = verifierMur(d, profil);
  const pire = <T,>(l: T[], t: (x: T) => number) => l.reduce((a, v) => (t(v) > t(a) ? v : a));
  const g = pire(r.combinaisons, (c) => c.glissement.taux);
  const p = pire(r.combinaisons, (c) => c.portance.taux);
  const sec = (s: 'voile' | 'talon' | 'patin', k: 'M_Ed' | 'V_Ed') => Math.max(...r.combinaisons.map((c) => c[s][k]));
  console.log(`\n== bandes : ${methode} ==`);
  console.log(`P_G ${f(r.combinaisons[0].poussee.P_G)} Pv ${f(r.combinaisons[0].poussee.Pv ?? 0)} ; EQU ${f(r.renversement.taux, 3)} (${r.renversement.cas ?? ''})`);
  console.log(`glissement ${f(g.glissement.taux, 3)} H_d ${f(g.glissement.H_d)} (${g.nom}) ; portance ${f(p.portance.taux, 3)} (${p.nom}) ; e ${f(r.excentricite.e, 3)}`);
  for (const s of ['voile', 'talon', 'patin'] as const) console.log(`${s} M_Ed ${f(sec(s, 'M_Ed'))} V_Ed ${f(sec(s, 'V_Ed'))}`);
}
