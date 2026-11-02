export const STYLES_TRACE = `
svg .terrain { fill: #efe6d6; stroke: none; }
svg .hachure { stroke: var(--neutre); stroke-width: 1; fill: none; }
svg .tete-traction { fill: var(--traction); }
svg .tete-compression { fill: var(--compression); }
svg .tete-neutre { fill: var(--neutre); }
svg .tete-cote { stroke: var(--texte-doux); stroke-width: 1.2; fill: none; }
svg .surface { stroke: var(--texte-doux); stroke-width: 1; }
svg .semelle { fill: var(--beton); stroke: var(--texte); stroke-width: 1.2; }
svg .voile { fill: var(--beton); stroke: var(--texte); stroke-width: 1.2; }
svg .ecran { stroke: var(--texte-doux); stroke-width: 1; stroke-dasharray: 6 4; fill: none; }

svg .charge-repartie line.haut { stroke: var(--neutre); stroke-width: 2; }
svg .charge-repartie line.fleche { stroke: var(--neutre); stroke-width: 1; }
svg .charge-repartie.variable line { stroke-dasharray: 5 3; }
svg .charge-repartie.permanent line { stroke-dasharray: none; }

svg .poussee { stroke: var(--traction); stroke-width: 2; }
svg .poussee.variable { stroke-dasharray: 7 3; }
svg .force-traction { fill: var(--traction); font-size: 12px; font-weight: 600; font-family: var(--sans); }
svg .force-compression { fill: var(--compression); font-size: 12px; font-weight: 600; font-family: var(--sans); }
svg .valeur-traction { fill: var(--traction); font-size: 11px; font-family: var(--sans); }
svg .valeur-compression { fill: var(--compression); font-size: 11px; font-family: var(--sans); }
svg .diagramme { fill: var(--traction); fill-opacity: 0.1; stroke: var(--traction); stroke-width: 1; }
svg .diagramme.variable { fill-opacity: 0.05; stroke-dasharray: 5 3; }
svg .pivot { fill: #fff; stroke: var(--texte); stroke-width: 2; }
svg .pivot-nom { fill: var(--texte); font-size: 11px; font-weight: 600; font-family: var(--sans); }
svg .rappel { stroke: var(--texte-doux); stroke-width: 1; stroke-dasharray: 3 3; fill: none; }
svg .poids { stroke: var(--compression); stroke-width: 2; }
svg .resultante { stroke: var(--traction); stroke-width: 2; }
svg .noyau { stroke: var(--texte-doux); stroke-width: 3; }

svg .cote { stroke: var(--texte-faible); stroke-width: 0.8; fill: var(--texte-faible); font-size: 11px; font-family: var(--sans); }
svg .bras { stroke: var(--texte-doux); stroke-width: 1; fill: var(--texte-doux); font-size: 10px; font-family: var(--sans); }

svg .diffusion { stroke: var(--texte-doux); stroke-width: 1; }
svg .pression { fill: var(--traction); fill-opacity: 0.14; stroke: var(--traction); stroke-dasharray: 5 3; }
svg .fleche-pression { stroke: var(--traction); stroke-width: 1; }
svg .contrainte { fill: var(--compression); fill-opacity: 0.12; stroke: var(--compression); stroke-width: 1.2; }
svg .contrainte-fleche { stroke: var(--compression); stroke-width: 1; }
svg .meyer { fill: none; stroke: var(--traction); stroke-dasharray: 5 3; stroke-width: 1.5; }
svg .legende { fill: var(--texte-faible); font-size: 11px; font-family: var(--sans); }
`;
