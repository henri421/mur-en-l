export const STYLES_TRACE = `
svg .terrain { fill: var(--fond); stroke: none; }
svg .surface { stroke: var(--texte-doux); stroke-width: 1; }
svg .semelle { fill: var(--beton); stroke: var(--texte); stroke-width: 1.2; }
svg .voile { fill: var(--beton); stroke: var(--texte); stroke-width: 1.2; }
svg .ecran { stroke: var(--texte-doux); stroke-width: 1; stroke-dasharray: 6 4; fill: none; }

svg .charge-repartie line.haut { stroke: var(--neutre); stroke-width: 2; }
svg .charge-repartie line.fleche { stroke: var(--neutre); stroke-width: 1; }
svg .charge-repartie.variable line { stroke-dasharray: 5 3; }
svg .charge-repartie.permanent line { stroke-dasharray: none; }

svg .poussee { stroke: var(--traction); stroke-width: 2; }
svg .poids { stroke: var(--compression); stroke-width: 2; }
svg .resultante { stroke: var(--traction); stroke-width: 2; }
svg .noyau { stroke: var(--texte-doux); stroke-width: 3; }

svg .cote { stroke: var(--texte-faible); stroke-width: 0.8; fill: var(--texte-faible); font-size: 11px; font-family: var(--sans); }
svg .bras { stroke: var(--texte-doux); stroke-width: 1; fill: var(--texte-doux); font-size: 10px; font-family: var(--sans); }

svg .diffusion { stroke: var(--texte-doux); stroke-width: 1; }
svg .pression { fill: var(--traction); fill-opacity: 0.14; stroke: var(--traction); stroke-dasharray: 5 3; }
svg .fleche-pression { stroke: var(--traction); stroke-width: 1; }
svg .contrainte { fill: var(--compression); fill-opacity: 0.12; stroke: var(--compression); stroke-width: 1.2; }
svg .meyer { fill: none; stroke: var(--traction); stroke-dasharray: 5 3; stroke-width: 1.5; }
svg .legende { fill: var(--texte-faible); font-size: 11px; font-family: var(--sans); }
`;
