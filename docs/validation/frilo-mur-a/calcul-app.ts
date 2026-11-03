// Mur A de la comparaison Frilo : calcul par le noyau de l application.
// Lancer depuis la racine : npx vite-node docs/validation/frilo-mur-a/calcul-app.ts
import { verifierMur, profilRecommande, type DonneesMur } from '../../../src/index';

function mur(approche: DonneesMur['approche'], As = { v: 1643, sh: 1546, sb: 498 }): DonneesMur {
  return {
    geometrie: { h: 6.08, eHaut: 0.45, eBas: 0.45, es: 0.40, patin: 0.60, talon: 2.40 },
    gammaBeton: 25,
    remblai: {
      gamma: 18, phi: 32.5, q: 0,
      charges: [
        { nature: 'Q', q: 2, distance: 0, largeur: 2.30 },
        { nature: 'Q', q: 5, distance: 2.30, largeur: 1.95 },
        { nature: 'Q', q: 20, distance: 4.25, largeur: 3.00 },
        { nature: 'Q', q: 9, distance: 7.25, largeur: 3.50 },
      ],
    },
    fondation: { phi: 30, deltaSurPhi: 1, portance: { mode: 'annexeD', phi: 32.5, c: 0, gamma: 18, D: 0.60 } },
    armatures: { fck: 30, fyk: 500, a: 55, voileArriere: As.v, voileAvant: 0, semelleHaut: As.sh, semelleBas: As.sb },
    approche,
  };
}
const din = profilRecommande();
din.EQU.sol.gPhi = { valeur: 1.0, source: 'alignement DIN EN 1997-1/NA (phi caracteristique en EQU)' };

const f = (x: number, n = 2) => x.toFixed(n);
for (const [nomP, prof] of [['recommande', profilRecommande()], ['EQU phi_k', din]] as const) {
  for (const ap of ['DA2', 'DA1'] as const) {
    const r = verifierMur(mur(ap), prof);
    console.log(`\n=== ${ap} profil ${nomP} ===  B=${r.B} Ht=${r.Ht}`);
    console.log('poids', r.poids);
    const rv = r.renversement;
    console.log(`EQU Ka=${f(rv.Ka,4)} phi_d=${f(rv.phi_d)} Mdst=${f(rv.pivot.M_dst_d)} Mstb=${f(rv.pivot.M_stb_d)} taux=${f(rv.taux,3)}`);
    console.log(`excentricite e=${f(r.excentricite.e,3)} lim=${f(r.excentricite.limite,3)} taux=${f(r.excentricite.taux,3)}`);
    for (const c of r.combinaisons) {
      console.log(`> ${c.nom} phi_d=${f(c.phi_d)} K=${f(c.poussee.Ka,4)} P_G=${f(c.poussee.P_G)} mu_d=${f(c.mu_d,4)}`);
      console.log('   poussees', c.pousseesCalcul.map((p) => `${p.origine}:${f(p.F)}@${f(p.z)}`).join(' | '));
      const g = c.glissement;
      console.log(`   glissement H_d=${f(g.H_d)} N_d=${f(g.N_d)} R_d=${f(g.R_d)} taux=${f(g.taux,3)}`);
      for (const k of c.cas) console.log(`   cas ${k.nom}: V=${f(k.V)} H=${f(k.H)} M=${f(k.M)} e=${f(k.e,3)} Bp=${f(k.Bp,3)} qu=${k.sol ? f(k.sol.q_u) : '-'} R_d=${f(k.R_d)} taux=${f(k.taux,3)}`);
      for (const s of [c.voile, c.patin, c.talon]) console.log(`   ${s.section} [${s.faceTendue}] M_Ed=${f(s.M_Ed)} M_Rd=${f(s.M_Rd)} tf=${f(s.tauxFlexion,3)} V_Ed=${f(s.V_Ed)} V_Rdc=${f(s.V_Rd_c)} tv=${f(s.tauxTranchant,3)} Asmin=${f(s.As_min,0)} (${s.casFlexion} / ${s.casTranchant})`);
    }
    // armature requise par dichotomie (flexion seule)
    const req = (cle: 'v' | 'sh' | 'sb', sec: 'voile' | 'patin' | 'talon') => {
      let lo = 1, hi = 6000;
      for (let i = 0; i < 50; i++) {
        const m = (lo + hi) / 2;
        const As = { v: 1643, sh: 1546, sb: 498, [cle]: m };
        const rr = verifierMur(mur(ap, As), prof);
        const t = Math.max(...rr.combinaisons.map((c) => c[sec].tauxFlexion));
        if (t > 1) lo = m; else hi = m;
      }
      return hi;
    };
    console.log(`   As requis flexion: voile ${f(req('v','voile')/100)} cm2/m, talon haut ${f(req('sh','talon')/100)} cm2/m, patin bas ${f(req('sb','patin')/100)} cm2/m`);
  }
}
