/**
 * Annexe nationale de la 1re generation (audit R4, lot E) : valeurs recommandees ou
 * Luxembourg. Le noyau ne connait aucune annexe : il recoit un profil EC7 et un profil
 * EC2. Le profil luxembourgeois reprend les valeurs recommandees de l'EN 1997-1
 * (presumees retenues) et alpha_cc de la table commune d'aedificium-ui (0,85), chaque
 * source renvoyant a l'AN-LU:2020, avec la mention « non verifiee » tant que l'annexe
 * n'a pas ete lue.
 */
import { valeurLu, type AnnexeNationale } from 'aedificium-ui';
import { ec2Recommended, type NormProfile } from 'section-uls';
import { profilRecommande, type ProfilMur, type ValeurSourcee } from '../../src/index';

/** Clause de l'annexe A citee par une source recommandee (« tableau A.3 »). */
function clauseDe(source: string): string {
  return /tableau A\.\d+/.exec(source)?.[0] ?? 'annexe A';
}

function reetiqueter(o: unknown, chemin: string): unknown {
  if (o !== null && typeof o === 'object') {
    const v = o as Partial<ValeurSourcee>;
    if (typeof v.valeur === 'number' && typeof v.source === 'string') {
      return valeurLu('EN 1997-1', chemin, { valeur: v.valeur, source: v.source }, clauseDe(v.source));
    }
    return Object.fromEntries(Object.entries(o).map(([k, x]) => [k, reetiqueter(x, chemin === '' ? k : `${chemin}.${k}`)]));
  }
  return o;
}

/** Profil EC7 de la 1re generation selon l'annexe. */
export function profilMurDe(a: AnnexeNationale): ProfilMur {
  const rec = profilRecommande();
  if (a !== 'lu') return rec;
  return {
    ...(reetiqueter(rec, '') as ProfilMur),
    nom: 'Luxembourg, ILNAS-EN 1997-1/AN-LU:2020 (valeurs présumées, à vérifier)',
    date: '2026-11-17',
  };
}

/** alpha_cc de l'EN 1992-1-1 selon l'annexe, avec sa source. */
export function alphaCcDe(a: AnnexeNationale): ValeurSourcee {
  const rec = { valeur: ec2Recommended().alphaCc, source: 'EN 1992-1-1:2004, valeur recommandée, 3.1.6(1)P' };
  return a === 'lu' ? valeurLu('EN 1992-1-1', 'alpha_cc', rec, '3.1.6(1)P') : rec;
}

/** Profil EC2 de la 1re generation selon l'annexe. */
export function normeEc2De(a: AnnexeNationale): NormProfile {
  const rec = ec2Recommended();
  return a === 'lu' ? { ...rec, name: 'EC2_LU', alphaCc: alphaCcDe('lu').valeur } : rec;
}
