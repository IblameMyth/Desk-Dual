(function () {
  'use strict';

  const poses = {
    1: { index: true,  middle: false, ring: false, pinky: false, thumbOpen: false },
    2: { index: true,  middle: true,  ring: false, pinky: false, thumbOpen: false },
    3: { index: true,  middle: true,  ring: true,  pinky: false, thumbOpen: false },
    4: { index: true,  middle: true,  ring: true,  pinky: true,  thumbOpen: false },
    5: { index: true,  middle: true,  ring: true,  pinky: true,  thumbOpen: true  },
    6: { index: false, middle: false, ring: false, pinky: false, thumbOpen: true  }
  };

  function setPartVisible(svg, id, visible) {
    const part = svg.queryWithId(id);
    if (part) part.style.display = visible ? '' : 'none';
  }

  function svg(run, outline) {
    const pose = poses[run] || poses[4];
    const stroke = outline || '#352316';
    const thumbOpen = pose.thumbOpen
      ? '<path id="f-thumb-open" d="M36 78 L16 62 C11 58,6 64,11 70 L32 96 Z" fill="#fce4be" stroke="' + stroke + '" stroke-width="4"/>'
      : '';
    const thumbTucked = !pose.thumbOpen
      ? '<path id="f-thumb-tucked" d="M32 76 C44 72,66 74,72 82 C76 87,70 94,62 92 L33 88 Z" fill="#fce4be" stroke="' + stroke + '" stroke-width="4"/>'
      : '';
    const finger = (id, visible, x, y, width, height) =>
      `<rect id="${id}" x="${x}" y="${y}" width="${width}" height="${height}" rx="${width / 2}" fill="#fce4be" stroke="${stroke}" stroke-width="4" style="display:${visible ? '' : 'none'}"/>`;
    const knuckle = (id, visible, x, y, width, height) =>
      `<rect id="${id}" x="${x}" y="${y}" width="${width}" height="${height}" rx="7" fill="#fce4be" stroke="${stroke}" stroke-width="4" style="display:${visible ? 'none' : ''}"/>`;

    return `
      <svg class="hc-hand-svg" viewBox="0 0 140 150" role="img" aria-label="${run} run hand gesture">
        ${finger('f-index', pose.index, 38, 18, 14, 54)}
        ${finger('f-middle', pose.middle, 54, 10, 14, 62)}
        ${finger('f-ring', pose.ring, 70, 16, 14, 56)}
        ${finger('f-pinky', pose.pinky, 86, 28, 13, 44)}
        ${thumbOpen}
        <path d="M34 64 C34 56,100 56,100 66 L97 108 C95 122,84 130,68 130 L54 130 C40 130,32 120,32 106 Z" fill="#fce4be" stroke="${stroke}" stroke-width="4"/>
        ${knuckle('k-index', pose.index, 37, 56, 15, 18)}
        ${knuckle('k-middle', pose.middle, 53, 55, 15, 19)}
        ${knuckle('k-ring', pose.ring, 69, 56, 15, 18)}
        ${knuckle('k-pinky', pose.pinky, 85, 58, 14, 16)}
        ${thumbTucked}
        <path d="M46 102 Q66 108 84 100" fill="none" stroke="#c79a63" stroke-width="2.5" stroke-linecap="round"/>
        <path d="M52 114 Q68 118 80 112" fill="none" stroke="#c79a63" stroke-width="2.5" stroke-linecap="round"/>
      </svg>`;
  }

  window.HandCricketHand = { svg };
})();
