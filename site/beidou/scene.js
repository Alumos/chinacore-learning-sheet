(function (root, factory) {
  const engine = typeof module === 'object' && module.exports ? require('./engine.js') : root.BeidouEngine;
  const api = factory(engine);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.BeidouScene = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (E) {
  'use strict';
  const W = 1200, H = 750, FONT = '"PingFang SC", "Microsoft YaHei", system-ui, sans-serif';
  const random = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  const stars = Array.from({ length: 230 }, (_, i) => ({ x: random(i + 4) * W, y: random(i + 404) * 520, r: .35 + random(i + 704) * 1.1, a: .15 + random(i + 304) * .65 }));
  function camera(width, height, focus = 'all') {
    const narrow = width < 540;
    const centers = { all: { x: 600, y: 375, z: narrow ? 1 : 1 }, space: { x: 813, y: 268, z: narrow ? 1.68 : 1.4 }, ground: { x: 306, y: 574, z: narrow ? 2.15 : 1.78 }, user: { x: 947, y: 584, z: narrow ? 2.04 : 1.75 } };
    const c = centers[focus] || centers.all, scale = Math.min(width / W, height / H) * c.z;
    return { scale, x: width / 2 - c.x * scale, y: height / 2 - c.y * scale, toWorld(px, py) { return { x: (px - this.x) / scale, y: (py - this.y) / scale }; } };
  }
  function makeEarth(texture, createCanvas, size = 420) {
    const source = createCanvas(texture.width, texture.height), sc = source.getContext('2d');
    sc.drawImage(texture, 0, 0);
    const input = sc.getImageData(0, 0, texture.width, texture.height).data;
    const sphere = createCanvas(size, size), out = sphere.getContext('2d'), pixels = out.createImageData(size, size);
    const r = size * .485, center = size / 2, rot = 1.46;
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const nx = (x - center) / r, ny = (y - center) / r, d = nx * nx + ny * ny;
      if (d >= 1) continue;
      const nz = Math.sqrt(1 - d), longitude = Math.atan2(nx, nz) + rot, latitude = Math.asin(-ny);
      const u = ((longitude / (Math.PI * 2) + .5) % 1 + 1) % 1, v = .5 - latitude / Math.PI;
      const sx = Math.floor(u * (texture.width - 1)), sy = Math.floor(v * (texture.height - 1));
      const i = (sy * texture.width + sx) * 4, j = (y * size + x) * 4;
      const light = Math.max(.12, -.5 * nx - .38 * ny + .68 * nz), rim = Math.pow(1 - nz, 3) * .45;
      pixels.data[j] = input[i] * light + 14 * rim;
      pixels.data[j + 1] = input[i + 1] * light + 82 * rim;
      pixels.data[j + 2] = input[i + 2] * light + 139 * rim;
      pixels.data[j + 3] = Math.min(255, (1 - Math.sqrt(d)) * r * 255);
    }
    out.putImageData(pixels, 0, 0);
    return sphere;
  }
  function masks(assets, createCanvas) {
    const result = {};
    E.PARTS.forEach(p => {
      const c = createCanvas(360, 283), ctx = c.getContext('2d');
      ctx.drawImage(assets[p.file], 0, 0, 360, 283);
      ctx.globalCompositeOperation = 'source-in'; ctx.fillStyle = '#7396af'; ctx.fillRect(0, 0, 360, 283);
      result[p.id] = c;
    });
    return result;
  }
  function text(c, value, x, y, size = 15, color = '#bfd1df', align = 'left', weight = 400) {
    c.fillStyle = color; c.font = `${weight} ${size}px ${FONT}`; c.textAlign = align; c.textBaseline = 'middle'; c.fillText(value, x, y);
  }
  function line(c, x1, y1, x2, y2, color, width = 1) { c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.strokeStyle = color; c.lineWidth = width; c.stroke(); }
  function path(c, pts, fill, stroke) {
    c.beginPath(); pts.forEach((p, i) => i ? c.lineTo(...p) : c.moveTo(...p)); c.closePath();
    if (fill) { c.fillStyle = fill; c.fill(); } if (stroke) { c.strokeStyle = stroke; c.lineWidth = 1; c.stroke(); }
  }
  function rounded(c, x, y, w, h, radius, fill, stroke) {
    c.beginPath(); c.roundRect(x, y, w, h, radius);
    if (fill) { c.fillStyle = fill; c.fill(); } if (stroke) { c.strokeStyle = stroke; c.lineWidth = 1; c.stroke(); }
  }
  function orbitalPath(c, orbit, front, active) {
    c.save(); c.translate(813, 276); c.rotate(orbit.angle); c.beginPath();
    c.ellipse(0, 0, orbit.rx, orbit.ry, 0, front ? 0 : Math.PI, front ? Math.PI : 2 * Math.PI);
    c.strokeStyle = active ? (front ? '#7dc0d774' : '#5a819c4f') : '#50759149'; c.lineWidth = front ? 1.5 : 1;
    c.stroke(); c.restore();
  }
  function sprite(c, image, x, y, w, h, opacity = 1) {
    if (!image) return;
    c.save(); c.globalAlpha *= opacity; c.drawImage(image, x - w / 2, y - h / 2, w, h); c.restore();
  }
  function terrain(c, time) {
    const sea = c.createLinearGradient(0, 465, 0, 750); sea.addColorStop(0, '#0a2337'); sea.addColorStop(1, '#0a1b2c');
    path(c, [[0, 532], [575, 469], [1200, 522], [1200, 750], [0, 750]], sea);
    c.save(); c.lineWidth = 1;
    for (let i = 0; i < 25; i++) {
      const y = 510 + i * 10, x = 510 + random(i) * 135;
      c.strokeStyle = `rgba(103,166,185,${.07 + random(i + 12) * .06})`; c.beginPath(); c.moveTo(x, y);
      c.bezierCurveTo(x + 110, y - 7, x + 200, y + 6, x + 280, y - 2); c.stroke();
      c.beginPath(); c.moveTo(x + 360, y + 2); c.bezierCurveTo(x + 430, y - 5, 1190, y + 6, 1260, y); c.stroke();
    } c.restore();
    path(c, [[33, 560], [420, 472], [591, 581], [482, 682], [118, 707], [25, 622]], '#203344', '#466172');
    path(c, [[33, 560], [420, 472], [591, 581], [482, 657], [118, 678], [25, 622]], '#2c4353', '#57717e');
    for (let i = 0; i < 8; i++) line(c, 68 + i * 48, 563 - i * 10.5, 198 + i * 37, 672 - i * 3, '#425d6a66');
    for (let i = 0; i < 4; i++) line(c, 70 + i * 7, 571 + i * 25, 447 + i * 22, 492 + i * 39, '#425d6a66');
    // Three distinct station foundations and embedded light strips.
    [[168, 604], [320, 633], [461, 586]].forEach(([x, y]) => {
      path(c, [[x - 65, y], [x, y - 22], [x + 65, y], [x, y + 22]], '#293e50', '#688492');
      line(c, x - 47, y + 6, x - 5, y + 20, '#6eb6c174', 2);
    });
    path(c, [[576, 511], [664, 491], [872, 595], [774, 627]], '#40576a', '#607889');
    line(c, 608, 511, 804, 611, '#afc5c85c', 2);
    c.save(); c.setLineDash([13, 12]); line(c, 638, 503, 838, 605, '#c2d0c388', 2); c.restore();
    path(c, [[956, 475], [1110, 437], [1198, 485], [1088, 533]], '#233e51', '#557489');
    // Bridge supports and coastal lights.
    [660, 700, 740, 780].forEach((x, i) => line(c, x, 528 + i * 19, x, 563 + i * 19, '#253d50', 8));
    [[48, 580], [149, 672], [410, 495], [554, 585], [1047, 503]].forEach(([x, y]) => {
      c.fillStyle = '#b0e4e4'; c.shadowColor = '#75d6e5'; c.shadowBlur = 8; c.fillRect(x - 1, y - 5, 2, 5); c.shadowBlur = 0;
    });
  }
  function packet(c, from, to, color, time, index, bidirectional = false, degraded = false) {
    c.save(); c.strokeStyle = color; c.lineWidth = degraded ? 1.2 : 1.3; c.globalAlpha = degraded ? .3 : .48;
    c.setLineDash(degraded ? [5, 9] : [2, 5]); c.beginPath(); c.moveTo(from.x, from.y); c.lineTo(to.x, to.y); c.stroke(); c.setLineDash([]); c.globalAlpha = 1;
    const dir = bidirectional && index % 2 ? -1 : 1;
    let t = ((time * .23 + index * .28) % 1 + 1) % 1;
    if (dir < 0) t = 1 - t;
    const x = from.x + (to.x - from.x) * t, y = from.y + (to.y - from.y) * t;
    if (!degraded) {
      const a = Math.atan2(to.y - from.y, to.x - from.x) + (dir < 0 ? Math.PI : 0);
      c.translate(x, y); c.rotate(a); c.fillStyle = color; c.shadowColor = color; c.shadowBlur = 9;
      path(c, [[6, 0], [-3, -3], [-1, 0], [-3, 3]], color);
    }
    c.restore();
  }
  function draw(ctx, opts) {
    const { width, height, state, assets, earth, silhouettes, time = 0, selected, hovered, hints = false, animations = {}, focus = 'all', clockError = 10, faultAge = 0 } = opts;
    const view = camera(width, height, focus), running = state.phase !== 'assembly', narrow = width < 540;
    ctx.clearRect(0, 0, width, height);
    const bg = ctx.createLinearGradient(0, 0, width, height); bg.addColorStop(0, '#07101b'); bg.addColorStop(.55, '#0b1b2a'); bg.addColorStop(1, '#102b3d'); ctx.fillStyle = bg; ctx.fillRect(0, 0, width, height);
    ctx.save(); ctx.translate(view.x, view.y); ctx.scale(view.scale, view.scale);
    const nebula = ctx.createRadialGradient(860, 250, 20, 860, 250, 470); nebula.addColorStop(0, '#1b486138'); nebula.addColorStop(1, '#12253500'); ctx.fillStyle = nebula; ctx.fillRect(0, 0, W, H);
    stars.forEach(s => { ctx.globalAlpha = s.a; ctx.fillStyle = '#d6edf9'; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill(); }); ctx.globalAlpha = 1;
    E.ORBITS.forEach(o => orbitalPath(ctx, o, false, running));
    const glow = ctx.createRadialGradient(813, 276, 130, 813, 276, 191); glow.addColorStop(0, '#70c3ff00'); glow.addColorStop(.5, '#74c2fb28'); glow.addColorStop(1, '#70c3ff00'); ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(813, 276, 191, 0, Math.PI * 2); ctx.fill();
    if (earth) ctx.drawImage(earth, 651, 114, 324, 324);
    ctx.strokeStyle = '#83d4fe5a'; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.arc(813, 276, 157, 0, Math.PI * 2); ctx.stroke();
    E.ORBITS.forEach(o => orbitalPath(ctx, o, true, running));
    terrain(ctx, time);
    // Contextual labels are part of the scene, not substitutes for the objects.
    const labelSize = Math.max(15, 10.5 / view.scale);
    if (focus === 'all' || focus === 'space') { text(ctx, '空间段', 542, 73, labelSize, '#9dd3df', 'left', 500); if (!narrow) text(ctx, '三类轨道，协同提供导航信号', 542, 97, 13, '#7996ab'); }
    if (focus === 'all' || focus === 'ground') { text(ctx, '地面段', 64, 467, labelSize, '#bdcfd9', 'left', 500); if (!narrow) text(ctx, '监控 · 管理 · 信息更新', 64, 489, 13, '#839aa8'); }
    if (focus === 'all' || focus === 'user') { text(ctx, '用户段', 903, 731, labelSize, '#9dd3df', 'left', 500); }
    if (!narrow && focus === 'all') {
      rounded(ctx, 44, 135, 318, 158, 11, '#102333aa', '#29485c');
      text(ctx, '海 上 救 援 任 务', 63, 161, 12, '#e6c48a');
      text(ctx, running ? (state.phase === 'complete' ? '救援船已抵达' : state.fault ? '正在观察故障影响' : '正在前往救援点') : '接通北斗，找到方向', 63, 198, 24, '#e7f0f4', 'left', 500);
      text(ctx, running ? (state.fault ? '任务演示暂停，查看可靠性变化' : '卫星播发信号 · 终端计算位置') : '把组件拖到对应的轮廓插槽', 63, 232, 14, '#9eb5c6');
      const progress = running ? state.missionTime / 36 : state.placed.length / 9;
      rounded(ctx, 63, 262, 265, 3, 1, '#2a4558'); if (progress) rounded(ctx, 63, 262, 265 * progress, 3, 1, running ? '#83e3f3' : '#e6c48a');
    }
    const positions = Object.fromEntries(E.PARTS.map(p => [p.id, E.position(p, time, running, state.missionTime)]));
    // The rescue destination and route are illustrative, not a geographic map.
    ctx.save(); ctx.setLineDash([7, 9]); line(ctx, 963, 642, 1120, 681, '#79c9d556', 1.6); ctx.restore();
    ctx.strokeStyle = '#b9e4e897'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(1120, 681, 12, 0, Math.PI * 2); ctx.stroke();
    line(ctx, 1101, 681, 1139, 681, '#b9e4e866'); line(ctx, 1120, 662, 1120, 700, '#b9e4e866');
    if (!narrow) text(ctx, '救援点', 1120, 711, 12, '#b0c8d6', 'center');
    if (running) {
      // Ground data maintenance is distinct from user reception. No return arrow from users.
      packet(ctx, positions.monitor, positions.control, '#a2b9c9', time, 1);
      packet(ctx, positions.control, positions.inject, '#a2b9c9', time, 2);
      packet(ctx, positions.geo, positions.monitor, '#b6a07a', time, 0, false, state.fault === 'ground');
      packet(ctx, positions.inject, positions.igso, '#e0c18e', time, 2, false, state.fault === 'ground');
      [['geo', 'ship'], ['igso', 'car'], ['meo', 'phone'], ['meo', 'ship']].forEach(([a, b], i) => packet(ctx, positions[a], positions[b], state.fault === 'clock' ? '#d8b28a' : '#7dc9dd', time, i, false, state.fault === 'clock'));
    }
    // Slots are silhouettes of the actual components and occupy the same visual footprint.
    E.PARTS.forEach(p => {
      if (state.placed.includes(p.id)) return;
      const highlight = p.id === hovered || (hints && selected === p.id);
      ctx.save();
      const color = highlight ? '#83e3f3' : '#7397b0';
      ctx.globalAlpha = highlight ? .55 : .19;
      ctx.shadowColor = color; ctx.shadowBlur = highlight ? 18 : 0;
      sprite(ctx, silhouettes[p.id], p.x, p.y, p.w, p.h);
      ctx.restore();
      ctx.save(); ctx.strokeStyle = highlight ? '#8ce3f2' : '#50728b9a'; ctx.lineWidth = highlight ? 1.6 : 1; ctx.setLineDash([4, 6]);
      ctx.beginPath(); ctx.ellipse(p.x, p.y + p.h * .31, p.w * .38, p.h * .17, 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
      if (!narrow || focus !== 'all') {
        const size = Math.max(12, 10 / view.scale);
        text(ctx, hints || highlight ? p.name : p.group === 'space' ? `${p.id.toUpperCase()} 接口` : '待安装', p.x, p.y + p.h * .52, size, highlight ? '#baf3fc' : '#819bb0', 'center');
      }
    });
    E.PARTS.filter(p => state.placed.includes(p.id)).sort((a, b) => positions[a.id].y - positions[b.id].y).forEach(p => {
      let pos = positions[p.id], scale = 1;
      const anim = animations[p.id];
      if (anim && anim.age < .65) {
        const u = Math.min(1, anim.age / .55), easing = 1 - Math.pow(1 - u, 3);
        pos = { x: anim.x + (pos.x - anim.x) * easing, y: anim.y + (pos.y - anim.y) * easing };
        scale = .92 + .08 * easing + Math.sin(u * Math.PI) * .055;
        if (u > .4) {
          ctx.save(); ctx.strokeStyle = `rgba(131,227,243,${(1 - u) * .8})`; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.ellipse(p.x, p.y + 20, 20 + u * 65, 8 + u * 25, 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
        }
      }
      if (p.id === hovered || p.id === selected) { ctx.save(); ctx.globalAlpha = .65; ctx.shadowBlur = 25; ctx.shadowColor = '#92dcea'; sprite(ctx, silhouettes[p.id], pos.x, pos.y, p.w * 1.02, p.h * 1.02); ctx.restore(); }
      sprite(ctx, assets[p.file], pos.x, pos.y, p.w * scale, p.h * scale);
      if (running && p.group === 'user') {
        ctx.save(); ctx.strokeStyle = state.fault ? '#dfa87a77' : '#74d1df77'; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(pos.x, pos.y + p.h * .34, p.w * .35, p.h * .13, 0, 0, 2 * Math.PI); ctx.stroke(); ctx.restore();
      }
      if ((!narrow || focus !== 'all') && p.group !== 'space') text(ctx, p.name, pos.x, pos.y + p.h * .49, Math.max(12, 10 / view.scale), '#bdd0df', 'center');
      if ((!narrow || focus !== 'all') && p.group === 'space') text(ctx, p.id.toUpperCase(), pos.x, pos.y + p.h * .43, Math.max(12, 10 / view.scale), '#e5d2ae', 'center');
    });
    if (state.fault) {
      const ship = positions.ship;
      const radius = state.fault === 'clock' ? 13 + clockError * .62 : 12 + Math.min(faultAge, 8) * 6;
      ctx.save(); ctx.strokeStyle = '#e4ac76aa'; ctx.fillStyle = '#e4ac7613'; ctx.lineWidth = 1.5; ctx.setLineDash([5, 5]);
      ctx.beginPath(); ctx.ellipse(ship.x + 10, ship.y + 43, radius, radius * .48, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.restore();
      if (!narrow) text(ctx, state.fault === 'clock' ? '时间偏差 → 测距误差' : '维护中断 → 可靠性逐步受影响', 688, 695, 15, '#e6b386');
    }
    if (running && !narrow) {
      rounded(ctx, 46, 328, 271, 67, 9, '#0d2333bb', '#294c60');
      line(ctx, 63, 347, 90, 347, '#7dc9dd', 2); text(ctx, '卫星 → 终端：导航信号', 101, 347, 12, '#b6d6e3');
      line(ctx, 63, 374, 90, 374, '#e0c18e', 2); text(ctx, '地面 ↔ 卫星：监控与更新', 101, 374, 12, '#bfbea9');
    }
    if (state.phase === 'complete' && !state.fault) {
      ctx.save(); ctx.strokeStyle = '#9cebe6'; ctx.shadowColor = '#83e3f3'; ctx.shadowBlur = 16; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(1120, 681, 19, 0, 2 * Math.PI); ctx.stroke(); ctx.restore();
    }
    ctx.restore(); return view;
  }
  return { draw, camera, makeEarth, masks, W, H };
});
