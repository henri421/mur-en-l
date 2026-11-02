/// <reference types="vite-plugin-pwa/client" />
/**
 * Enregistrement du service worker, explicite (`injectRegister: null`).
 *
 * Une nouvelle version n'est installee qu'avec l'accord de l'utilisateur :
 * un calcul en cours ne doit pas etre recharge sous ses yeux.
 */

import { registerSW } from 'virtual:pwa-register';
import { textes } from './textes';

export function enregistrerServiceWorker(): void {
  if (!('serviceWorker' in navigator)) return;
  const mettreAJour = registerSW({
    onNeedRefresh() {
      if (window.confirm(textes().messages.nouvelleVersion)) {
        void mettreAJour(true);
      }
    },
  });
}
