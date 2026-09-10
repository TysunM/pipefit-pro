const W = 90;

const pipe = (d) => `
  <path d="${d}" fill="none" stroke="#16262F" stroke-width="${W + 7}" stroke-linecap="round" stroke-linejoin="round" opacity="0.5"/>
  <path d="${d}" fill="none" stroke="url(#body)" stroke-width="${W}" stroke-linecap="round" stroke-linejoin="round"/>
  <g transform="translate(-2,-5)"><path d="${d}" fill="none" stroke="#FFFFFF" stroke-width="${W * 0.13}" stroke-linecap="round" stroke-linejoin="round" opacity="0.72"/></g>
  <g transform="translate(3,7)"><path d="${d}" fill="none" stroke="#2B4657" stroke-width="${W * 0.12}" stroke-linecap="round" stroke-linejoin="round" opacity="0.5"/></g>`;

const collar = (x, y, axis) => {
  const rot = axis === 'v' ? 90 : 0;
  const bw = W * 0.46;
  const bh = W * 1.34;
  return `
  <g transform="rotate(${rot} ${x} ${y})">
    <rect x="${x - bw / 2 + 3}" y="${y - bh / 2 + 7}" width="${bw}" height="${bh}" rx="9" fill="#0E1A22" opacity="0.45"/>
    <rect x="${x - bw / 2}" y="${y - bh / 2}" width="${bw}" height="${bh}" rx="9" fill="url(#collar)"/>
    <rect x="${x - bw / 2}" y="${y - bh / 2}" width="${bw}" height="${bh * 0.26}" rx="8" fill="#FFFFFF" opacity="0.34"/>
    <rect x="${x - bw / 2}" y="${y + bh * 0.30}" width="${bw}" height="${bh * 0.2}" rx="8" fill="#7E3B0F" opacity="0.3"/>
  </g>`;
};

const ART = `
  <g filter="url(#soft)">
    ${pipe('M300,140 L300,282')}
    ${pipe('M140,282 L700,282')}
    ${pipe('M140,520 L452,520 L700,706')}
    ${pipe('M296,846 L884,846')}
    ${pipe('M700,140 L700,846')}
    ${collar(300, 196, 'v')}
    ${collar(452, 282, 'h')}
    ${collar(268, 520, 'h')}
    ${collar(560, 846, 'h')}
    ${collar(796, 846, 'h')}
    ${collar(700, 212, 'v')}
    ${collar(700, 610, 'v')}
  </g>`;

export const MARK = (bg, artScale = 1) => `
<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <defs>
    <radialGradient id="ground" cx="0.28" cy="0.18" r="1.05">
      <stop offset="0" stop-color="#41697F"/>
      <stop offset="0.5" stop-color="#26424F"/>
      <stop offset="1" stop-color="#0F1C23"/>
    </radialGradient>
    <linearGradient id="body" gradientUnits="userSpaceOnUse" x1="140" y1="100" x2="900" y2="920">
      <stop offset="0" stop-color="#FBFDFE"/>
      <stop offset="0.3" stop-color="#DAE6ED"/>
      <stop offset="0.62" stop-color="#AABDC9"/>
      <stop offset="1" stop-color="#78909F"/>
    </linearGradient>
    <linearGradient id="collar" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="1024">
      <stop offset="0" stop-color="#FFB067"/>
      <stop offset="0.45" stop-color="#E8792B"/>
      <stop offset="1" stop-color="#AF5118"/>
    </linearGradient>
    <filter id="soft" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="16" stdDeviation="18" flood-color="#040B10" flood-opacity="0.5"/>
    </filter>
  </defs>
  ${bg}
  <g transform="translate(512,512) scale(${artScale}) translate(-512,-512)">${ART}</g>
</svg>`;
