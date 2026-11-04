// Mur « coupe type 1 » de la comparaison MB : calcul par le noyau de l application.
// Lancer depuis la racine : npx vite-node docs/validation/mb-mur-type1/calcul-app.ts
import { deriverProfil, profilRecommande, verifierMur, type DonneesMur } from '../../../src/index';

{
  const base: DonneesMur = {
    geometrie: { h: 6.08, eHaut: 0.45, eBas: 0.45, es: 0.4, patin: 0.6, talon: 2.4 },
    gammaBeton: 25,
    remblai: {
      gamma: 19.5, phi: 30, q: 0, c: 2.5, deltaAbout: 2 / 3, methodeBandes: 'din4085',
      charges: [
        { nature: 'G', q: 2, distance: 0, largeur: 2.3 },
        { nature: 'Q', q: 5, distance: 2.3, largeur: 1.95 },
        { nature: 'Q', q: 20, distance: 4.25, largeur: 3 },
        { nature: 'Q', q: 9, distance: 7.25, largeur: 7 },
      ],
    },
    // Glissement sur la couche de 0,40 m (phi 32,5) ; portance avec les moyennes de MB.
    fondation: { phi: 32.5, deltaSurPhi: 1, portance: { mode: 'annexeD', phi: 28.89, c: 0, gamma: 19.5, D: 0.8 }, sigmaRd: 260 },
    hAval: 0.8,
    chargesTete: [{ nature: 'Q', H: 2.8, V: 0, M: 2.52 }],
    armatures: { fck: 30, fyk: 500, a: 55, voileArriere: 4021, voileAvant: 314, semelleHaut: 6283, semelleBas: 524 },
    approche: 'DA2*',
    sourceUnique: true,
    talonPrisme: true,
    frottementBase: true,
  };
  const p = deriverProfil(profilRecommande(), { 'EQU.sol.gPhi': 1, 'beton.cRdc': 0.15, 'beton.k1': 0.12 });
  const f = (x: number, n = 2) => x.toFixed(n);
  // MB : stabilite en poussee active, voile et reaction du voile sur le talon au repos.
  for (const [nom, partKaVoile] of [['voile en poussee active', 1], ['voile au repos, comme MB', 0]] as const) {
    const r = verifierMur({ ...base, remblai: { ...base.remblai, partKa: 1, partKaVoile } }, p);
    const c = r.combinaisons[0];
    const V = 0.9 * (r.poids.voile + r.poids.semelle + r.poids.terresTalon + r.poids.terresPatin + 4.6) + 1.1 * (c.poussee.Pv ?? 0);
    const xR = (r.renversement.pivot.M_stb_d - r.renversement.pivot.M_dst_d) / V;
    console.log(`\n== ${nom} ==`);
    console.log('poussees', c.pousseesCalcul.map((x) => `${x.origine} ${f(x.F)}`).join(' | '));
    console.log(`EQU Mdst/Mstb ${f(r.renversement.taux, 3)} ; e/b ${f((r.B / 2 - xR) / r.B, 3)} ; eta MB ${f(((r.B / 2 - xR) / r.B) / 0.5, 3)}`);
    console.log(`glissement H_d ${f(c.glissement.H_d)} R_d ${f(c.glissement.R_d)} taux ${f(c.glissement.taux, 3)}`);
    const k = c.portance;
    console.log(`portance ${k.nom} V ${f(k.V)} e_k ${f(k.caracteristique?.e ?? NaN, 3)} B' ${f(k.Bp, 3)} R_d ${f(k.R_d)} taux ${f(k.taux, 3)}`);
    console.log(`poussee P_G ${f(c.poussee.P_G)} zG ${f(c.poussee.zG ?? 0)} Pv ${f(c.poussee.Pv ?? 0)} ; contrainte ${c.contrainte ? f(c.contrainte.sigmaEd) + ' / ' + f(c.contrainte.sigmaRd) + ' = ' + f(c.contrainte.taux, 3) : '-'}`);
    console.log(`excentricite e ${f(r.excentricite.e, 3)} taux ${f(r.excentricite.taux, 3)}`);
    for (const s of [c.voile, c.patin, c.talon]) console.log(`${s.section} M_Ed ${f(s.M_Ed)} V_Ed ${f(s.V_Ed)} V_Rd,c ${f(s.V_Rd_c)} (${s.casFlexion})`);
  }
}
