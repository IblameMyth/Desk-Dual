/*
 * Pencil-Box Tower: polished vector models of classroom items.
 * Each item has a physics size (w x h, in world units) and an SVG drawn
 * in a w x h viewBox so the picture matches the hitbox exactly.
 * Look: bold ink outline, flat colour + soft gloss/shade overlay, small details.
 */
(function () {
  'use strict';

  const INK = '#2e1d10';
  const font = 'font-family="Nunito,Arial,sans-serif" font-weight="900"';

  // shared gradients (identical in every svg, so duplicate ids are harmless)
  const DEFS =
    '<linearGradient id="ptGloss" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0" stop-color="#fff" stop-opacity=".6"/>' +
      '<stop offset=".45" stop-color="#fff" stop-opacity=".05"/>' +
      '<stop offset=".55" stop-color="#000" stop-opacity="0"/>' +
      '<stop offset="1" stop-color="#000" stop-opacity=".28"/></linearGradient>' +
    '<linearGradient id="ptSide" x1="0" y1="0" x2="1" y2="0">' +
      '<stop offset="0" stop-color="#fff" stop-opacity=".35"/>' +
      '<stop offset=".5" stop-color="#fff" stop-opacity="0"/>' +
      '<stop offset="1" stop-color="#000" stop-opacity=".22"/></linearGradient>' +
    '<linearGradient id="ptPage" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0" stop-color="#ddd0ae"/><stop offset=".18" stop-color="#fffaf0"/>' +
      '<stop offset=".82" stop-color="#fffaf0"/><stop offset="1" stop-color="#ddd0ae"/></linearGradient>' +
    '<linearGradient id="ptMetal" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0" stop-color="#ffffff"/><stop offset=".35" stop-color="#dfe5ec"/>' +
      '<stop offset=".6" stop-color="#aeb7c2"/><stop offset="1" stop-color="#e4e9ef"/></linearGradient>' +
    '<linearGradient id="ptWood" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0" stop-color="#f3c987"/><stop offset=".5" stop-color="#dd9b52"/>' +
      '<stop offset="1" stop-color="#b8742f"/></linearGradient>' +
    '<linearGradient id="ptLeg" x1="0" y1="0" x2="1" y2="0">' +
      '<stop offset="0" stop-color="#7a4f2c"/><stop offset=".45" stop-color="#5a3a1f"/>' +
      '<stop offset="1" stop-color="#3f2814"/></linearGradient>';

  function svg(w, h, inner) {
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + w + ' ' + h +
      '" width="' + w + '" height="' + h + '" preserveAspectRatio="none" aria-hidden="true"><defs>' + DEFS + '</defs>' +
      inner + '</svg>';
  }
  const f = n => (+n).toFixed(1);
  // rounded rect helper: fill + ink outline, then a gloss overlay on top
  function rr(x, y, w, h, r, fill, sw, gloss) {
    return '<rect x="' + f(x) + '" y="' + f(y) + '" width="' + f(w) + '" height="' + f(h) + '" rx="' + f(r) +
      '" fill="' + fill + '" stroke="' + INK + '" stroke-width="' + (sw || 1.5) + '"/>' +
      (gloss === false ? '' : '<rect x="' + f(x) + '" y="' + f(y) + '" width="' + f(w) + '" height="' + f(h) + '" rx="' + f(r) + '" fill="url(#ptGloss)"/>');
  }
  const shine = (x1, x2, y, o) => '<path d="M' + f(x1) + ' ' + f(y) + 'H' + f(x2) + '" stroke="#fff" stroke-opacity="' + (o || 0.6) + '" stroke-width="1.3" stroke-linecap="round"/>';

  /* ---------- textbooks (page edge view: covers, paper block, spine) ---------- */
  function book(cover, dark, label, labelColor) {
    return (w, h) => {
      const c = Math.max(3, h * 0.17);
      const sp = Math.min(14, w * 0.13);
      let lines = '';
      for (let y = c + 2; y < h - c - 1; y += 2.3) {
        lines += '<path d="M' + f(sp + 1) + ' ' + f(y) + 'H' + f(w - 2) + '" stroke="#cdbc94" stroke-width=".55"/>';
      }
      const mid = h / 2;
      const sh = Math.min(10, h - 2 * c - 2.5);
      return svg(w, h,
        // paper block
        '<rect x="' + f(sp - 2) + '" y="' + f(c) + '" width="' + f(w - sp + 1) + '" height="' + f(h - 2 * c) + '" fill="url(#ptPage)" stroke="' + INK + '" stroke-width="1.2"/>' + lines +
        '<rect x="' + f(sp - 1) + '" y="' + f(c) + '" width="' + f(w - sp - 1) + '" height="2.2" fill="#000" opacity=".13"/>' +
        // boards
        rr(1, 1, w - 2, c, 1.8, cover, 1.4) + rr(1, h - c - 1, w - 2, c, 1.8, cover, 1.4) +
        shine(sp + 4, w - 6, 1 + c * 0.35, 0.5) +
        // spine
        rr(1, 1, sp, h - 2, 2.8, dark, 1.5) +
        '<rect x="1" y="1" width="' + f(sp) + '" height="' + f(h - 2) + '" rx="2.8" fill="url(#ptSide)"/>' +
        '<rect x="' + f(sp * 0.12) + '" y="' + f(h * 0.2) + '" width="' + f(sp * 0.76) + '" height="1.7" rx=".8" fill="#f6d65e" stroke="' + INK + '" stroke-width=".5"/>' +
        '<rect x="' + f(sp * 0.12) + '" y="' + f(h * 0.8 - 1.7) + '" width="' + f(sp * 0.76) + '" height="1.7" rx=".8" fill="#f6d65e" stroke="' + INK + '" stroke-width=".5"/>' +
        // title sticker
        (sh >= 6 ? '<rect x="' + f(w * 0.46) + '" y="' + f(mid - sh / 2) + '" width="' + f(w * 0.4) + '" height="' + f(sh) + '" rx="1.6" fill="' + labelColor + '" stroke="' + INK + '" stroke-width=".9"/>' +
          '<text x="' + f(w * 0.66) + '" y="' + f(mid + sh * 0.26) + '" text-anchor="middle" font-size="' + f(Math.min(6.6, sh * 0.7)) + '" ' + font + ' fill="' + INK + '" letter-spacing=".3">' + label + '</text>' : ''));
    };
  }

  /* ---------- geometry box (steel tin) ---------- */
  function geometryBox(w, h) {
    const lid = h * 0.4;
    return svg(w, h,
      rr(1, 1, w - 2, h - 2, 4.5, '#2f7fc4', 1.8) +
      rr(1, 1, w - 2, lid, 4.5, '#52a9e8', 1.8) +
      '<path d="M2 ' + f(lid + 1) + 'H' + f(w - 2) + '" stroke="' + INK + '" stroke-width="1.5"/>' +
      shine(8, w - 8, 4.4, 0.7) +
      // embossed rim
      '<rect x="4.5" y="' + f(lid + 4) + '" width="' + f(w - 9) + '" height="' + f(h - lid - 8) + '" rx="2" fill="none" stroke="#fff" stroke-opacity=".28" stroke-width="1"/>' +
      // hinges + clasp
      '<rect x="' + f(w * 0.12) + '" y="' + f(lid - 2.6) + '" width="10" height="5.6" rx="1.2" fill="url(#ptMetal)" stroke="' + INK + '" stroke-width="1"/>' +
      '<rect x="' + f(w - w * 0.12 - 10) + '" y="' + f(lid - 2.6) + '" width="10" height="5.6" rx="1.2" fill="url(#ptMetal)" stroke="' + INK + '" stroke-width="1"/>' +
      '<rect x="' + f(w / 2 - 5) + '" y="' + f(lid - 3.2) + '" width="10" height="9" rx="1.8" fill="url(#ptMetal)" stroke="' + INK + '" stroke-width="1.2"/>' +
      '<circle cx="' + f(w / 2) + '" cy="' + f(lid + 1.4) + '" r="1.5" fill="' + INK + '"/>' +
      // set-square, protractor, compass icons
      '<path d="M' + f(w * 0.13) + ' ' + f(lid + 12) + 'l9 -1 l-1 -8z" fill="#f6d65e" stroke="' + INK + '" stroke-width=".9" stroke-linejoin="round"/>' +
      '<path d="M' + f(w * 0.82) + ' ' + f(lid + 12) + 'a7 7 0 0 1 -14 0z" fill="#e8f6ff" fill-opacity=".9" stroke="' + INK + '" stroke-width=".9" transform="translate(0 0)"/>' +
      '<text x="' + f(w / 2) + '" y="' + f(h - 5.6) + '" text-anchor="middle" font-size="6.8" ' + font + ' fill="#fff6e2" letter-spacing=".6">GEOMETRY BOX</text>');
  }

  /* ---------- plastic pencil box ---------- */
  function pencilBox(body, lidc, accent) {
    return (w, h) => {
      const lid = h * 0.46;
      return svg(w, h,
        rr(1, 1, w - 2, h - 2, 5.5, body, 1.8) +
        rr(1, 1, w - 2, lid, 5.5, lidc, 1.8) +
        shine(7, w - 7, 4.2, 0.75) +
        '<path d="M' + f(w - 15) + ' ' + f(lid * 0.38) + 'v' + f(lid * 0.38) + 'M' + f(w - 12) + ' ' + f(lid * 0.38) + 'v' + f(lid * 0.38) + 'M' + f(w - 9) + ' ' + f(lid * 0.38) + 'v' + f(lid * 0.38) + '" stroke="' + INK + '" stroke-opacity=".5" stroke-width="1" stroke-linecap="round"/>' +
        '<circle cx="' + f(w * 0.5) + '" cy="' + f(lid + 1) + '" r="3.3" fill="' + accent + '" stroke="' + INK + '" stroke-width="1.1"/>' +
        '<circle cx="' + f(w * 0.5 - 1) + '" cy="' + f(lid) + '" r="1" fill="#fff" fill-opacity=".7"/>' +
        '<path d="M' + f(w * 0.17) + ' ' + f(lid + 3) + 'l1.9 3.8 4.1 .6 -3 2.9 .7 4.1 -3.7 -2 -3.7 2 .7 -4.1 -3 -2.9 4.1 -.6z" fill="' + accent + '" stroke="' + INK + '" stroke-width=".9" stroke-linejoin="round"/>' +
        '<path d="M' + f(w * 0.74) + ' ' + f(lid + 9.5) + 'c-6 -3.6 -4.2 -8 -1.6 -8 1.1 0 1.6 .8 1.6 1.4 0 -.6 .5 -1.4 1.6 -1.4 2.6 0 4.4 4.4 -1.6 8z" fill="#e8465a" stroke="' + INK + '" stroke-width=".9" stroke-linejoin="round"/>');
    };
  }

  /* ---------- zipper pouch ---------- */
  function pouch(w, h) {
    let teeth = '';
    for (let x = 8; x < w - 8; x += 3.2) teeth += '<path d="M' + f(x) + ' 6.2v3.4" stroke="' + INK + '" stroke-width=".9"/>';
    return svg(w, h,
      rr(1, 1, w - 2, h - 2, h * 0.42, '#e9588a', 1.8) +
      '<rect x="7" y="4.6" width="' + (w - 14) + '" height="6" rx="3" fill="#fff4dc" stroke="' + INK + '" stroke-width="1"/>' + teeth +
      '<rect x="' + (w - 20) + '" y="3" width="10" height="9.4" rx="2.4" fill="#f6d65e" stroke="' + INK + '" stroke-width="1.1"/>' +
      '<circle cx="' + (w - 15) + '" cy="13.6" r="1.7" fill="#f6d65e" stroke="' + INK + '" stroke-width=".8"/>' +
      '<rect x="4.6" y="4.6" width="' + (w - 9.2) + '" height="' + (h - 9.2) + '" rx="' + f(h * 0.32) + '" fill="none" stroke="#fff" stroke-opacity=".65" stroke-width=".9" stroke-dasharray="2.2 2.2"/>' +
      '<circle cx="' + f(w * 0.22) + '" cy="' + f(h - 7.6) + '" r="2.8" fill="#f6d65e" stroke="' + INK + '" stroke-width=".8"/>' +
      '<circle cx="' + f(w * 0.5) + '" cy="' + f(h - 7.6) + '" r="2.8" fill="#7bc8f2" stroke="' + INK + '" stroke-width=".8"/>' +
      '<circle cx="' + f(w * 0.78) + '" cy="' + f(h - 7.6) + '" r="2.8" fill="#fff4dc" stroke="' + INK + '" stroke-width=".8"/>');
  }

  /* ---------- rubber / eraser ---------- */
  function eraser(w, h) {
    return svg(w, h,
      rr(1, 1, w - 2, h - 2, 3.6, '#fdfbf6', 1.7) +
      '<rect x="' + f(w * 0.22) + '" y="1" width="' + f(w * 0.56) + '" height="' + f(h - 2) + '" fill="#2f6fd0" stroke="' + INK + '" stroke-width="1.4"/>' +
      '<rect x="' + f(w * 0.22) + '" y="1" width="' + f(w * 0.56) + '" height="' + f(h - 2) + '" fill="url(#ptGloss)"/>' +
      '<path d="M' + f(w * 0.22) + ' ' + f(h * 0.28) + 'H' + f(w * 0.78) + 'M' + f(w * 0.22) + ' ' + f(h * 0.72) + 'H' + f(w * 0.78) + '" stroke="#f6d65e" stroke-width="1.3"/>' +
      '<text x="' + f(w / 2) + '" y="' + f(h / 2 + 2.1) + '" text-anchor="middle" font-size="5.8" ' + font + ' fill="#fff" letter-spacing=".3">RUBBER</text>' +
      '<path d="M4.5 4.4H' + f(w * 0.19) + '" stroke="#fff" stroke-width="1.3" stroke-linecap="round"/>' +
      '<circle cx="' + f(w * 0.1) + '" cy="' + f(h * 0.64) + '" r="1" fill="#cfc5b2"/><circle cx="' + f(w * 0.9) + '" cy="' + f(h * 0.42) + '" r="1.1" fill="#cfc5b2"/>');
  }

  /* ---------- sharpener ---------- */
  function sharpener(w, h) {
    return svg(w, h,
      rr(1, 1, w - 2, h - 2, 4, '#f5862a', 1.7) +
      '<circle cx="' + f(w * 0.3) + '" cy="' + f(h * 0.54) + '" r="' + f(h * 0.27) + '" fill="#2a1d12" stroke="' + INK + '" stroke-width="1.2"/>' +
      '<circle cx="' + f(w * 0.3) + '" cy="' + f(h * 0.54) + '" r="' + f(h * 0.13) + '" fill="#7a6650"/>' +
      '<circle cx="' + f(w * 0.3 - 2) + '" cy="' + f(h * 0.54 - 2.4) + '" r="1.2" fill="#fff" fill-opacity=".55"/>' +
      '<rect x="' + f(w * 0.53) + '" y="' + f(h * 0.3) + '" width="' + f(w * 0.34) + '" height="' + f(h * 0.4) + '" rx="1.3" fill="url(#ptMetal)" stroke="' + INK + '" stroke-width="1.1"/>' +
      '<circle cx="' + f(w * 0.7) + '" cy="' + f(h * 0.5) + '" r="1.7" fill="#7f8895" stroke="' + INK + '" stroke-width=".8"/>');
  }

  /* ---------- blackboard duster ---------- */
  function duster(w, h) {
    const felt = h * 0.34;
    return svg(w, h,
      '<rect x="1" y="1" width="' + (w - 2) + '" height="' + f(h - felt) + '" rx="3" fill="url(#ptWood)" stroke="' + INK + '" stroke-width="1.7"/>' +
      '<path d="M5 7H' + (w - 5) + 'M4 11.6H' + (w - 4) + 'M5 16.2H' + (w - 5) + '" stroke="#8d5a2a" stroke-opacity=".5" stroke-width="1" stroke-linecap="round"/>' +
      shine(7, w - 7, 4, 0.5) +
      '<rect x="1" y="' + f(h - felt - 1) + '" width="' + (w - 2) + '" height="' + f(felt) + '" rx="2.4" fill="#2f2f33" stroke="' + INK + '" stroke-width="1.7"/>' +
      '<rect x="1" y="' + f(h - felt - 1) + '" width="' + (w - 2) + '" height="' + f(felt) + '" rx="2.4" fill="url(#ptGloss)" opacity=".5"/>' +
      '<path d="M3 ' + f(h - felt + 3) + 'H' + (w - 3) + '" stroke="#5d5d64" stroke-width="1" stroke-dasharray="1.2 1.8"/>' +
      '<ellipse cx="' + f(w * 0.28) + '" cy="' + f(h - 5) + '" rx="6" ry="1.8" fill="#f6f1e2" fill-opacity=".85"/>' +
      '<ellipse cx="' + f(w * 0.66) + '" cy="' + f(h - 4) + '" rx="8" ry="1.6" fill="#f3b6c6" fill-opacity=".75"/>');
  }

  /* ---------- exercise notebook ---------- */
  function notebook(cover) {
    return (w, h) => {
      let lines = '';
      for (let y = 4.4; y < h - 3; y += 2.1) lines += '<path d="M12 ' + f(y) + 'H' + f(w - 3) + '" stroke="#cdbc94" stroke-width=".55"/>';
      return svg(w, h,
        '<rect x="9" y="2.2" width="' + (w - 10) + '" height="' + f(h - 4.4) + '" fill="url(#ptPage)" stroke="' + INK + '" stroke-width="1.1"/>' + lines +
        rr(1, 1, w - 2, 3.6, 1.4, cover, 1.3) + rr(1, h - 4.6, w - 2, 3.6, 1.4, cover, 1.3) +
        rr(1, 1, 9.5, h - 2, 2, cover, 1.4) +
        '<path d="M5.8 3.2V' + f(h - 3.2) + '" stroke="#fff" stroke-opacity=".5" stroke-width="1" stroke-dasharray="1.4 1.6"/>');
    };
  }

  /* ---------- wooden ruler (scale) with numbered cm marks ---------- */
  function ruler(w, h) {
    let ticks = '';
    let n = 0;
    for (let x = 6; x < w - 4; x += 3.6, n++) {
      const len = n % 5 === 0 ? 4.4 : 2.5;
      ticks += '<path d="M' + f(x) + ' 1.6v' + len + '" stroke="' + INK + '" stroke-width=".75"/>';
    }
    return svg(w, h,
      rr(1, 1, w - 2, h - 2, 1.8, '#f3cf74', 1.5) +
      ticks +
      '<path d="M4 ' + f(h - 2.2) + 'H' + (w - 4) + '" stroke="#fff" stroke-opacity=".55" stroke-width="1"/>' +
      '<circle cx="' + (w - 6) + '" cy="' + f(h - 3.6) + '" r="1.2" fill="#8d5a2a"/>');
  }

  /* ---------- pencil (hexagonal, eraser end, graphite tip) ---------- */
  function pencil(body, band) {
    return (w, h) => {
      const m = h / 2;
      return svg(w, h,
        // body hex bands
        '<rect x="19" y="1" width="' + (w - 40) + '" height="' + (h - 2) + '" fill="' + body + '" stroke="' + INK + '" stroke-width="1.4"/>' +
        '<rect x="19" y="1" width="' + (w - 40) + '" height="' + f((h - 2) * 0.34) + '" fill="' + band + '"/>' +
        '<rect x="19" y="' + f(h - 1 - (h - 2) * 0.28) + '" width="' + (w - 40) + '" height="' + f((h - 2) * 0.28) + '" fill="#000" opacity=".2"/>' +
        '<rect x="19" y="1" width="' + (w - 40) + '" height="' + (h - 2) + '" fill="url(#ptGloss)"/>' +
        '<text x="' + f(w * 0.45) + '" y="' + f(m + 2) + '" text-anchor="middle" font-size="5.6" ' + font + ' fill="' + INK + '" letter-spacing="1">HB · DESK DUAL</text>' +
        // ferrule + eraser
        '<rect x="11" y="1" width="9" height="' + (h - 2) + '" fill="url(#ptMetal)" stroke="' + INK + '" stroke-width="1.3"/>' +
        '<path d="M13.5 1.5V' + f(h - 1.5) + 'M16 1.5V' + f(h - 1.5) + '" stroke="' + INK + '" stroke-opacity=".45" stroke-width=".7"/>' +
        '<rect x="1" y="1.4" width="11" height="' + f(h - 2.8) + '" rx="2.8" fill="#f27a93" stroke="' + INK + '" stroke-width="1.3"/>' +
        '<rect x="1" y="1.4" width="11" height="' + f(h - 2.8) + '" rx="2.8" fill="url(#ptGloss)"/>' +
        // sharpened wood cone and lead
        '<polygon points="' + (w - 21) + ',1 ' + (w - 3) + ',' + f(m - 1.7) + ' ' + (w - 3) + ',' + f(m + 1.7) + ' ' + (w - 21) + ',' + (h - 1) + '" fill="#f1cf9b" stroke="' + INK + '" stroke-width="1.3" stroke-linejoin="round"/>' +
        '<polygon points="' + (w - 21) + ',1 ' + (w - 3) + ',' + f(m - 1.7) + ' ' + (w - 3) + ',' + f(m + 1.7) + ' ' + (w - 21) + ',' + (h - 1) + '" fill="url(#ptGloss)" opacity=".6"/>' +
        '<polygon points="' + (w - 9.5) + ',' + f(m - 1.35) + ' ' + (w - 0.8) + ',' + f(m) + ' ' + (w - 9.5) + ',' + f(m + 1.35) + '" fill="#3c3c44" stroke="' + INK + '" stroke-width=".8" stroke-linejoin="round"/>');
    };
  }

  /* ---------- chalk box ---------- */
  function chalkBox(w, h) {
    return svg(w, h,
      '<rect x="7" y="0.8" width="' + f(w * 0.46) + '" height="4.6" rx="1.8" fill="#fff" stroke="' + INK + '" stroke-width=".9"/>' +
      '<rect x="' + f(w * 0.56) + '" y="1.6" width="' + f(w * 0.26) + '" height="3.8" rx="1.6" fill="#f3b6c6" stroke="' + INK + '" stroke-width=".9"/>' +
      rr(1, 3.6, w - 2, h - 4.6, 2.2, '#f6f0e0', 1.7) +
      '<path d="M2 ' + f(h * 0.44) + 'H' + (w - 2) + '" stroke="' + INK + '" stroke-width="1.1"/>' +
      '<rect x="4" y="' + f(h * 0.52) + '" width="' + (w - 8) + '" height="' + f(h * 0.36) + '" rx="1.4" fill="#c9423a" stroke="' + INK + '" stroke-width="1"/>' +
      '<text x="' + f(w / 2) + '" y="' + f(h * 0.52 + h * 0.27) + '" text-anchor="middle" font-size="6.6" ' + font + ' fill="#fff" letter-spacing=".7">CHALK</text>');
  }

  /* ---------- stapler ---------- */
  function stapler(w, h) {
    return svg(w, h,
      rr(1, h * 0.62, w - 2, h * 0.38 - 1, 2.2, '#2f2f33', 1.6) +
      '<path d="M2 ' + (h * 0.35) + 'Q2 2 ' + (w * 0.3) + ' 2H' + (w - 7) + 'Q' + (w - 1) + ' 2 ' + (w - 1) + ' ' + (h * 0.4) + 'V' + (h * 0.66) + 'H2Z" fill="#d9372d" stroke="' + INK + '" stroke-width="1.7" stroke-linejoin="round"/>' +
      '<path d="M2 ' + (h * 0.35) + 'Q2 2 ' + (w * 0.3) + ' 2H' + (w - 7) + 'Q' + (w - 1) + ' 2 ' + (w - 1) + ' ' + (h * 0.4) + 'V' + (h * 0.66) + 'H2Z" fill="url(#ptGloss)"/>' +
      shine(9, w * 0.62, 5.4, 0.6) +
      '<rect x="' + (w - 16) + '" y="' + f(h * 0.42) + '" width="10" height="3" rx="1.5" fill="#2f2f33"/>' +
      '<circle cx="' + f(w * 0.17) + '" cy="' + f(h * 0.5) + '" r="1.9" fill="url(#ptMetal)" stroke="' + INK + '" stroke-width=".9"/>');
  }

  /* ---------- steel tiffin box ---------- */
  function tiffin(w, h) {
    const t = (h - 7) / 3;
    let tiers = '';
    for (let i = 0; i < 3; i++) {
      const y = 4 + i * t;
      const inset = i === 0 ? 6 : 3;
      tiers += '<rect x="' + inset + '" y="' + f(y) + '" width="' + (w - 2 * inset) + '" height="' + f(t + 0.7) + '" rx="2.8" fill="url(#ptMetal)" stroke="' + INK + '" stroke-width="1.5"/>';
    }
    return svg(w, h, tiers +
      '<path d="M' + f(w * 0.2) + ' 4V' + (h - 3) + 'M' + f(w * 0.8) + ' 4V' + (h - 3) + '" stroke="#7d8591" stroke-width="2" stroke-linecap="round"/>' +
      '<rect x="' + f(w * 0.2 - 2.2) + '" y="' + f(h / 2 - 3) + '" width="4.4" height="6" rx="1" fill="#f4f6f9" stroke="' + INK + '" stroke-width=".9"/>' +
      '<rect x="' + f(w * 0.8 - 2.2) + '" y="' + f(h / 2 - 3) + '" width="4.4" height="6" rx="1" fill="#f4f6f9" stroke="' + INK + '" stroke-width=".9"/>' +
      '<path d="M' + f(w * 0.3) + ' 4Q' + f(w / 2) + ' -1.5 ' + f(w * 0.7) + ' 4" fill="none" stroke="' + INK + '" stroke-width="1.7" stroke-linecap="round"/>');
  }

  /* ---------- catalogue (physics size + picture) ---------- */
  const TYPES = [
    { id: 'maths',   name: 'Maths Textbook',   w: 112, h: 28, density: 0.0105, svg: book('#2f6fd0', '#1f4f98', 'MATHS', '#fff4dc') },
    { id: 'science', name: 'Science Textbook', w: 106, h: 24, density: 0.0105, svg: book('#2f9a58', '#1f7040', 'SCIENCE', '#fff4dc') },
    { id: 'english', name: 'English Reader',   w: 100, h: 20, density: 0.0105, svg: book('#d9372d', '#9d241d', 'ENGLISH', '#fff4dc') },
    { id: 'social',  name: 'Social Atlas',     w: 118, h: 22, density: 0.0105, svg: book('#e5902b', '#a8671a', 'ATLAS', '#fff4dc') },
    { id: 'geo',     name: 'Geometry Box',     w: 94,  h: 30, density: 0.0095, svg: geometryBox },
    { id: 'pbox1',   name: 'Pencil Box',       w: 98,  h: 26, density: 0.0085, svg: pencilBox('#f2cf53', '#f9e48f', '#d9372d') },
    { id: 'pbox2',   name: 'Pencil Box',       w: 92,  h: 24, density: 0.0085, svg: pencilBox('#6dc0ee', '#a6dcf8', '#2f6fd0') },
    { id: 'pouch',   name: 'Zipper Pouch',     w: 88,  h: 24, density: 0.008,  svg: pouch },
    { id: 'rubber',  name: 'Rubber',           w: 44,  h: 20, density: 0.009,  svg: eraser },
    { id: 'sharp',   name: 'Sharpener',        w: 36,  h: 22, density: 0.0095, svg: sharpener },
    { id: 'duster',  name: 'Duster',           w: 66,  h: 28, density: 0.0095, svg: duster },
    { id: 'nbook',   name: 'Notebook',         w: 94,  h: 13, density: 0.0105, svg: notebook('#9b59c9') },
    { id: 'nbook2',  name: 'Notebook',         w: 90,  h: 14, density: 0.0105, svg: notebook('#2fb0a0') },
    { id: 'ruler',   name: 'Scale / Ruler',    w: 120, h: 9,  density: 0.009,  svg: ruler },
    { id: 'pencil1', name: 'Pencil',           w: 124, h: 10, density: 0.008,  svg: pencil('#f6c428', '#ffe27a') },
    { id: 'pencil2', name: 'Pencil',           w: 116, h: 10, density: 0.008,  svg: pencil('#3b82d6', '#7db4f0') },
    { id: 'chalk',   name: 'Chalk Box',        w: 58,  h: 22, density: 0.008,  svg: chalkBox },
    { id: 'stapler', name: 'Stapler',          w: 68,  h: 22, density: 0.011,  svg: stapler },
    { id: 'tiffin',  name: 'Tiffin Box',       w: 72,  h: 32, density: 0.0085, svg: tiffin }
  ];

  /* ---------- the school desk (fixed in place for the whole game) ---------- */
  const DESK_W = 190;
  const DESK_TOP_H = 16;
  const DESK_LEG_H = 56;

  function deskSvg() {
    const w = DESK_W + 14;
    const h = DESK_TOP_H + DESK_LEG_H + 2;
    let grain = '';
    for (let i = 0; i < 7; i++) {
      const x = 12 + i * 26;
      grain += '<path d="M' + x + ' 5q10 3 20 0" stroke="#8d5a2a" stroke-opacity=".5" stroke-width="1" fill="none" stroke-linecap="round"/>';
    }
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + w + ' ' + h + '" width="' + w + '" height="' + h + '" aria-hidden="true"><defs>' + DEFS + '</defs>' +
      '<rect x="24" y="' + (DESK_TOP_H - 2) + '" width="10" height="' + (DESK_LEG_H + 2) + '" fill="url(#ptLeg)" stroke="' + INK + '" stroke-width="1.5"/>' +
      '<rect x="' + (w - 34) + '" y="' + (DESK_TOP_H - 2) + '" width="10" height="' + (DESK_LEG_H + 2) + '" fill="url(#ptLeg)" stroke="' + INK + '" stroke-width="1.5"/>' +
      '<rect x="24" y="' + (DESK_TOP_H + 26) + '" width="' + (w - 48) + '" height="8" fill="#80532c" stroke="' + INK + '" stroke-width="1.4"/>' +
      '<rect x="24" y="' + (DESK_TOP_H + 26) + '" width="' + (w - 48) + '" height="8" fill="url(#ptGloss)"/>' +
      '<rect x="22" y="' + (h - 5) + '" width="14" height="4.4" rx="1.6" fill="#24160b"/>' +
      '<rect x="' + (w - 36) + '" y="' + (h - 5) + '" width="14" height="4.4" rx="1.6" fill="#24160b"/>' +
      '<rect x="1" y="1" width="' + (w - 2) + '" height="' + (DESK_TOP_H - 2) + '" rx="3.4" fill="url(#ptWood)" stroke="' + INK + '" stroke-width="2"/>' +
      '<path d="M5 3.6H' + (w - 5) + '" stroke="#fff0cf" stroke-width="1.6" stroke-linecap="round" opacity=".8"/>' +
      grain +
      '<path d="M2 ' + (DESK_TOP_H - 3.2) + 'H' + (w - 2) + '" stroke="#9a5f25" stroke-width="1.4"/>' +
      '<circle cx="10" cy="' + (DESK_TOP_H / 2) + '" r="1.5" fill="#8a929c" stroke="' + INK + '" stroke-width=".7"/>' +
      '<circle cx="' + (w - 10) + '" cy="' + (DESK_TOP_H / 2) + '" r="1.5" fill="#8a929c" stroke="' + INK + '" stroke-width=".7"/>' +
      '</svg>';
  }

  window.PTItems = { TYPES, DESK_W, DESK_TOP_H, DESK_LEG_H, deskSvg, INK };
})();
