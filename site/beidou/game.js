(() => {
  'use strict';
  const E = window.BeidouEngine, S = window.BeidouScene, M = window.BeidouClockModel, C = window.BeidouClockScene;
  const $ = id => document.getElementById(id);
  const canvas = $('world'), context = canvas.getContext('2d'), tray = $('parts-grid');
  const storageKey = 'beidou-assembly-game-v2';
  let state = E.INITIAL(), selected = null, hovered = null, focus = 'all', group = 'all', hints = false;
  let assets = {}, earth = null, silhouettes = {}, ghosts = {}, ready = false, animations = {}, orbitTime = 0, faultAge = 0;
  const clock = { active:false, leaving:false, progress:0, displayNs:0, localTime:0, target:'ship', fromFocus:'all', fromTime:0, previousPaused:false };
  let width = 1200, height = 750, lastFrame = 0, drag = null, suppressClickUntil = 0, initialResize = true;
  let sound = false, audio = null, lastPhase = 'assembly', lastPersist = 0;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    const legacy = saved ? null : JSON.parse(localStorage.getItem('beidou-assembly-game-v1'));
    if (saved?.version === 2) state = E.restored(saved.state);
    else if (legacy?.version === 1) { state = E.restored(legacy.state); state.fault = null; state.clockNs = 0; }
  } catch (_) {}
  const directClockPreview = new URLSearchParams(window.location.search).has('clock-lab');
  if (directClockPreview) { state = E.INITIAL(); E.PARTS.forEach(p => E.install(state,p.id,p.id)); E.start(state); state.missionTime = 14; }
  const imagePath = p => `assets/${window.BEIDOU_ASSET_FILES?.[p.file] || `${p.file}.svg`}`;
  function notify(title, message, kind = '') {
    $('message-title').textContent = title; $('message-text').textContent = message;
    $('message-box').className = `message-box ${kind}`;
  }
  function persist() { if (directClockPreview) return; try { localStorage.setItem(storageKey, JSON.stringify({ version: 2, state })); } catch (_) {} }
  const subjectNames = {car:'车辆',ship:'船舶',phone:'手机'};
  function updateClockReadouts() {
    const response=M.response(clock.displayNs,clock.target);
    $('clock-error-value').textContent = Math.round(state.clockNs);
    $('clock-error-range').value = state.clockNs;
    $('clock-error-range').setAttribute('aria-valuetext',`${state.clockNs} 纳秒`);
    $('clock-range-error').textContent = response.rangeErrorMeters.toFixed(1);
    $('clock-position-label').textContent = `${subjectNames[clock.target]}的平面定位偏差`;
    $('clock-position-error').textContent = response.errorMeters.toFixed(1);
    const settling=Math.abs(clock.displayNs-state.clockNs)>.05;
    const hint=state.clockNs===0?(settling?'正在校准，导航估计位置平滑回归。':'时间基准同步，估计位置与实体位置重合。'):state.clockNs<100?'纳秒级偏差开始传递到测距，注意橙色估计位置。':'时间偏差越大，实体与导航估计位置的分离越明显。';
    if($('clock-live-hint').textContent!==hint)$('clock-live-hint').textContent=hint;
    if(clock.active){
      $('state-label').textContent=state.clockNs===0?(settling?'原子钟实验 · 校准回归中':'原子钟实验 · 时间同步'):'原子钟实验 · 定位偏差增大';
      $('state-dot').className=state.clockNs===0&&!settling?'running':'fault';
    }
    document.querySelectorAll('[data-clock-target]').forEach(b=>{b.classList.toggle('active',b.dataset.clockTarget===clock.target);b.setAttribute('aria-pressed',String(b.dataset.clockTarget===clock.target));});
  }
  function setClockError(ns) { state.clockNs=M.clampNs(Number(ns));updateClockReadouts();persist(); }
  function enterClock(restore=false) {
    if (!ready || state.phase==='assembly' || clock.active) return;
    clock.fromFocus=focus;clock.fromTime=orbitTime;clock.previousPaused=state.paused;
    clock.active=true;clock.leaving=false;clock.progress=reducedMotion?1:0;
    clock.localTime=0;
    if (!restore) state.clockNs=0;
    clock.displayNs=restore?state.clockNs:0;
    E.setFault(state,'clock');state.challenge=null;selected=null;hovered=null;
    document.body.classList.add('clock-focus');$('clock-lab').hidden=false;
    $('clock-error-range').disabled=false;$('clock-lab').setAttribute('aria-busy','false');
    notify('亲手改变时间，观察位置如何偏移', '实体的位置作为参照。拖动钟差滑杆，让橙色导航估计位置逐渐偏离；再校准原子钟，看它平滑回归。');
    updateClockReadouts();updateUI();persist();
    $('world-frame').scrollIntoView({behavior:reducedMotion?'instant':'smooth',block:'start'});
  }
  function finishClock() {
    clock.active=false;clock.leaving=false;clock.progress=0;clock.displayNs=0;
    document.body.classList.remove('clock-focus');$('clock-lab').hidden=true;$('clock-error-range').disabled=false;
    updateUI();
  }
  function leaveClock() {
    if (!clock.active || clock.leaving) return;
    clock.leaving=true;$('clock-error-range').disabled=true;$('clock-lab').setAttribute('aria-busy','true');
    E.recover(state);state.paused=clock.previousPaused;faultAge=0;
    notify('原子钟恢复校准，返回系统协作', '原子钟的精度与稳定性影响测距和定位。掌握关键部件的研发、校正与维护能力，才能持续保障服务。','success');
    if(reducedMotion)finishClock();updateUI();persist();
  }
  function tone(success = true) {
    if (!sound) return;
    try {
      audio ||= new (window.AudioContext || window.webkitAudioContext)(); audio.resume();
      const now = audio.currentTime, notes = success ? [523, 784] : [220, 185];
      notes.forEach((hz, i) => { const osc = audio.createOscillator(), gain = audio.createGain(); osc.type = 'sine'; osc.frequency.value = hz; gain.gain.setValueAtTime(0, now + i * .08); gain.gain.linearRampToValueAtTime(.075, now + i * .08 + .01); gain.gain.exponentialRampToValueAtTime(.001, now + i * .08 + .17); osc.connect(gain); gain.connect(audio.destination); osc.start(now + i * .08); osc.stop(now + i * .08 + .2); });
    } catch (_) { sound = false; $('sound-button').textContent = '音效不可用'; }
  }
  E.PARTS.forEach(p => {
    const card = document.createElement('button'); card.type = 'button'; card.className = 'part-card'; card.dataset.part = p.id;
    card.setAttribute('aria-pressed', 'false'); card.setAttribute('aria-label', `${p.name}，${p.short}，选择或拖动安装`);
    const img = new Image(); img.src = imagePath(p); img.alt = ''; img.draggable = false;
    const name = document.createElement('span'); name.className = 'part-name'; name.textContent = p.name;
    const subtitle = document.createElement('span'); subtitle.className = 'part-subtitle'; subtitle.textContent = p.short;
    const check = document.createElement('span'); check.className = 'part-check'; check.textContent = '✓'; check.hidden = true;
    card.append(img, name, subtitle, check); tray.append(card);
    const target = document.createElement('button'); target.type = 'button'; target.dataset.target = p.id; target.textContent = `安装到 ${p.name} 接口`;
    $('install-targets').append(target);
  });
  function setView(id) {
    focus = ['all', 'space', 'ground', 'user'].includes(id) ? id : 'all';
    document.querySelectorAll('[data-view]').forEach(b => { b.classList.toggle('active', b.dataset.view === focus); b.setAttribute('aria-pressed', String(b.dataset.view === focus)); });
  }
  function showPart(id) {
    const p = E.PARTS.find(p => p.id === id); if (!p) return;
    selected = p.id;
    $('detail-title').textContent = p.name; $('detail-text').textContent = p.description;
    if (width < 540) setView(p.group);
    if (state.placed.includes(id)) notify(p.name, p.description);
    else notify(`拿起了 ${p.name}`, `${p.description} 把它放到对应的轮廓接口。`);
    updateUI();
  }
  function updateUI() {
    $('installed-count').textContent = state.placed.length;
    $('progress-fill').style.width = `${state.placed.length / E.PARTS.length * 100}%`;
    document.querySelector('.progress-track').setAttribute('aria-valuenow', state.placed.length);
    $('tray-count').textContent = `${9 - state.placed.length} 件待装`;
    tray.querySelectorAll('[data-part]').forEach(card => {
      const p = E.PARTS.find(p => p.id === card.dataset.part), installed = state.placed.includes(p.id);
      card.hidden = group !== 'all' && p.group !== group;
      card.classList.toggle('selected', p.id === selected); card.classList.toggle('installed', installed);
      card.setAttribute('aria-pressed', String(p.id === selected));
      card.querySelector('.part-check').hidden = !installed;
      card.setAttribute('aria-label', `${p.name}，${installed ? '已安装，点击了解作用' : '选择或拖动安装'}`);
    });
    $('install-targets').querySelectorAll('[data-target]').forEach(b => b.disabled = state.placed.includes(b.dataset.target) || state.phase !== 'assembly');
    const active = state.phase !== 'assembly';
    $('start-button').disabled = !ready || state.placed.length !== 9 || state.phase === 'running';
    $('start-button').innerHTML = state.phase === 'complete' ? '<span aria-hidden="true">↻</span> 重播救援任务' : '<span aria-hidden="true">▶</span> 启动北斗导航';
    $('pause-button').disabled = !active;
    $('pause-button').textContent = clock.active ? '返回系统全景' : state.fault ? '恢复系统' : state.paused ? '继续演示' : '暂停演示';
    $('hint-button').disabled = active;
    $('challenge-panel').hidden = !active;
    $('experiment-count').textContent = `已观察 ${state.observed.length} / 2`;
    document.querySelectorAll('[data-experiment]').forEach(b => b.classList.toggle('observed', state.observed.includes(b.dataset.experiment)));
    $('state-label').textContent = clock.active ? state.clockNs===0?'原子钟实验 · 时间同步':'原子钟实验 · 定位偏差增大' : !active ? state.placed.length === 9 ? '系统装配完成' : '等待装配' : state.fault ? '故障实验观察中' : state.paused ? '运行已暂停' : state.phase === 'complete' ? '救援任务完成' : '北斗导航运行中';
    $('state-dot').className = state.fault ? 'fault' : active ? 'running' : '';
    document.querySelectorAll('[data-step]').forEach(s => { s.classList.toggle('active', s.dataset.step === (state.fault || state.challenge ? 'challenge' : active ? 'running' : 'assembly')); s.classList.toggle('done', s.dataset.step === 'assembly' && active); });
    $('world-hint').lastChild.textContent = clock.active ? '拖动下方滑杆，看实体位置与估计位置分离' : state.fault ? '观察误差范围，再恢复系统继续任务' : active ? '点击场景中的组件，查看它的职责' : selected && !state.placed.includes(selected) ? `把 ${E.PARTS.find(p => p.id === selected).name} 拖到接口，或点击对应轮廓` : '拿起组件，拖到场景中的轮廓';
  }
  function install(id, target, source) {
    if (!ready) return;
    const result = E.install(state, id, target);
    if (!result.ok) { notify('接口还没对上，再试一次', result.message, 'error'); tone(false); return; }
    const p = E.PARTS.find(p => p.id === id);
    animations[id] = { x: source?.x ?? p.x, y: source?.y ?? p.y - 30, age: reducedMotion ? 1 : 0 };
    selected = null; hovered = null;
    notify(result.complete ? '北斗系统，拼装完成！' : `${p.name} 已就位`, result.complete ? '九个组件各就其位。现在启动导航，看看卫星、地面站和终端怎样协作。' : p.description, 'success');
    tone(true); updateUI(); persist();
  }
  function scenePoint(event) {
    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) * width / rect.width, y = (event.clientY - rect.top) * height / rect.height;
    return S.camera(width, height, focus).toWorld(x, y);
  }
  function startDrag(event, id, owner) {
    if (!ready || state.phase !== 'assembly' || state.placed.includes(id) || event.button !== 0) return;
    showPart(id);
    drag = { id, pointerId: event.pointerId, x: event.clientX, y: event.clientY, moved: false, owner };
    try { owner.setPointerCapture(event.pointerId); } catch (_) {}
  }
  tray.addEventListener('pointerdown', event => {
    const card = event.target.closest('[data-part]'); if (card) startDrag(event, card.dataset.part, card);
  });
  tray.addEventListener('click', event => {
    if (Date.now() < suppressClickUntil) return;
    const card = event.target.closest('[data-part]'); if (card) showPart(card.dataset.part);
  });
  document.addEventListener('pointermove', event => {
    if (!drag || drag.pointerId !== event.pointerId) return;
    if (Math.hypot(event.clientX - drag.x, event.clientY - drag.y) > 7) drag.moved = true;
    if (!drag.moved) return;
    event.preventDefault();
    const ghost = $('drag-sprite'), part = E.PARTS.find(p => p.id === drag.id);
    ghost.hidden = false; ghost.querySelector('img').src = imagePath(part); ghost.querySelector('span').textContent = part.name;
    ghost.style.left = `${event.clientX}px`; ghost.style.top = `${event.clientY}px`;
    const rect = canvas.getBoundingClientRect(), inside = event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom;
    hovered = inside ? E.hitTest(scenePoint(event).x, scenePoint(event).y, state)?.id || null : null;
  }, { passive: false });
  function endDrag(event, cancel = false) {
    if (!drag || drag.pointerId !== event.pointerId) return;
    const finished = drag; drag = null; $('drag-sprite').hidden = true;
    try { finished.owner.releasePointerCapture(event.pointerId); } catch (_) {}
    if (finished.moved) {
      suppressClickUntil = Date.now() + 350;
      if (!cancel) {
        const rect = canvas.getBoundingClientRect(), inside = event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom;
        const point = scenePoint(event), target = inside ? E.hitTest(point.x, point.y, state) : null;
        if (target) install(finished.id, target.id, point);
        else notify('组件已回到工作台', '把组件的中心对准场景中的轮廓。也可以先点选组件，再点击安装位置。');
      }
    }
    hovered = null;
  }
  document.addEventListener('pointerup', event => endDrag(event));
  document.addEventListener('pointercancel', event => endDrag(event, true));
  canvas.addEventListener('pointermove', event => {
    if (drag || !ready || clock.active) return;
    const point = scenePoint(event), pending = selected && !state.placed.includes(selected) && state.phase === 'assembly';
    hovered = E.hitTest(point.x, point.y, state, orbitTime, !pending)?.id || null;
    canvas.style.cursor = hovered ? 'pointer' : 'default';
  });
  canvas.addEventListener('pointerleave', () => { if (!drag) hovered = null; });
  canvas.addEventListener('click', event => {
    if (!ready || clock.active) return;
    const point = scenePoint(event), pending = selected && !state.placed.includes(selected) && state.phase === 'assembly';
    const target = E.hitTest(point.x, point.y, state, orbitTime, !pending);
    if (target && pending) install(selected, target.id, point);
    else if (target) showPart(target.id);
  });
  $('install-targets').addEventListener('click', e => { const b = e.target.closest('[data-target]'); if (b) install(selected, b.dataset.target); });
  document.querySelectorAll('[data-group]').forEach(b => b.addEventListener('click', () => {
    group = b.dataset.group; document.querySelectorAll('[data-group]').forEach(t => { t.classList.toggle('active', t === b); t.setAttribute('aria-pressed', String(t === b)); });
    if (width < 540 && group !== 'all') setView(group); updateUI();
  }));
  document.querySelectorAll('[data-view]').forEach(b => b.addEventListener('click', () => setView(b.dataset.view)));
  $('hint-button').addEventListener('click', () => { hints = !hints; $('hint-button').setAttribute('aria-pressed', String(hints)); $('hint-button').textContent = hints ? '隐藏安装提示' : '显示安装提示'; });
  $('start-button').addEventListener('click', () => {
    if(clock.active){E.recover(state);finishClock();}
    if (!E.start(state)) return; orbitTime = 0; faultAge = 0;
    notify('导航上线，救援出发', '卫星播发导航信号，地面段持续监控维护，终端接收多颗卫星信号并计算位置。蓝色箭头指向终端；金色箭头表示监控和信息更新。');
    updateUI(); persist(); tone(true);
  });
  $('pause-button').addEventListener('click', () => {
    if(clock.active){leaveClock();return;}
    if (state.fault) { E.recover(state); faultAge = 0; notify('系统已恢复', '可靠导航需要系统协作，也需要掌握关键技术和持续维护能力。自主可控与开放合作、兼容其他导航系统可以同时实现。', 'success'); }
    else state.paused = !state.paused;
    updateUI(); persist();
  });
  function reset() {
    if(clock.active)finishClock();
    state = E.INITIAL(); selected = null; hovered = null; animations = {}; orbitTime = 0; faultAge = 0;
    $('detail-title').textContent = '每个组件，都有自己的职责'; $('detail-text').textContent = '太空提供导航信号，地面负责监控维护，终端接收信号并计算位置。';
    notify('新的拼装任务已准备好', '从组件库拿起第一个组件，寻找它在系统中的位置。'); updateUI(); persist();
  }
  $('reset-button').addEventListener('click', reset);
  $('sound-button').addEventListener('click', () => { sound = !sound; $('sound-button').textContent = sound ? '音效开' : '音效关'; $('sound-button').setAttribute('aria-pressed', String(sound)); if (sound) tone(); });
  $('fullscreen-button').addEventListener('click', async () => {
    try { if (document.fullscreenElement) await document.exitFullscreen(); else await document.documentElement.requestFullscreen(); } catch (_) { notify('当前环境暂不支持全屏', '仍可直接体验拼装和运行演示。'); }
  });
  document.addEventListener('fullscreenchange', () => $('fullscreen-button').textContent = document.fullscreenElement ? '退出全屏' : '全屏');
  $('help-button').addEventListener('click', () => $('help-dialog').showModal());
  $('help-done').addEventListener('click', () => $('help-dialog').close());
  $('sources-button').addEventListener('click', () => $('sources-dialog').showModal());
  $('clock-error-range').addEventListener('input',()=>{setClockError($('clock-error-range').value);updateUI();});
  $('clock-zero').addEventListener('click',()=>{setClockError(0);updateUI();tone(true);});
  $('clock-exit').addEventListener('click',leaveClock);
  document.querySelectorAll('[data-clock-target]').forEach(b=>b.addEventListener('click',()=>{clock.target=b.dataset.clockTarget;updateClockReadouts();}));
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&clock.active&&!document.querySelector('dialog[open]'))leaveClock();});
  const experiments = {
    ground: {
      title: '地面监控与更新中断，会怎样？', question: '卫星还在运行。如果地面段暂时无法持续监控和更新导航信息，终端会立即全部停止定位吗？',
      answers: ['所有用户会立即、同时失去全部定位能力', '完全没有影响，地面段可以永久省略', '已有信息可能短时可用，持续维护与可靠性会受影响'], correct: 2,
      result: '地面段承担持续监控、运行管理和信息更新。短时中断不等于所有终端立刻失去定位，但更新和维护长期受影响可能降低服务可靠性。影响还取决于故障范围、持续时间与系统冗余。',
    },
  };
  document.querySelectorAll('[data-experiment]').forEach(b => b.addEventListener('click', () => {
    if (state.phase === 'assembly') return;
    if(b.dataset.experiment==='clock'){enterClock();return;}
    const id = b.dataset.experiment, data = experiments[id]; state.challenge = id; state.challengeAnswered = false;
    $('experiment-title').textContent = data.title; $('experiment-question').textContent = data.question;
    $('experiment-result').hidden = true; $('observe-button').disabled = true;
    $('answers').replaceChildren(); data.answers.forEach((answer, index) => {
      const button = document.createElement('button'); button.type = 'button'; button.textContent = answer;
      button.addEventListener('click', () => {
        state.challengeAnswered = true;
        $('answers').querySelectorAll('button').forEach(a => { a.className = ''; a.setAttribute('aria-pressed', 'false'); });
        const correct = index === data.correct; button.className = correct ? 'selected' : 'incorrect'; button.setAttribute('aria-pressed', 'true');
        $('experiment-result').hidden = false; $('result-title').textContent = correct ? '判断正确，看看其中的原因' : '这个判断需要调整'; $('result-text').textContent = data.result;
        $('observe-button').disabled = false; tone(correct);
      });
      $('answers').append(button);
    });
    $('experiment-dialog').showModal(); updateUI();
  }));
  $('observe-button').addEventListener('click', () => {
    const id = state.challenge; if (!state.challengeAnswered || !id) return;
    E.setFault(state, id); state.challenge = null; state.challengeAnswered = false; faultAge = 0;
    notify('观察：更新中断影响持续可靠性', `${experiments[id].result} 为方便比较，救援任务进度暂时暂停；橙色范围为定性示意。`);
    if (width < 540) setView('user');
    $('experiment-dialog').close(); updateUI(); persist();
  });
  $('experiment-dialog').addEventListener('close', () => { state.challenge = null; state.challengeAnswered = false; updateUI(); });
  function resize() {
    const rect = canvas.getBoundingClientRect(), ratio = Math.min(window.devicePixelRatio || 1, 2);
    width = rect.width; height = rect.height; canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio); context.setTransform(ratio, 0, 0, ratio, 0, 0);
    if (initialResize) { if (width < 540) setView('space'); initialResize = false; }
  }
  const resizeObserver = new ResizeObserver(resize); resizeObserver.observe(canvas); resize();
  function loadImage(src) { return new Promise((resolve, reject) => { const image = new Image(); image.onload = () => resolve(image); image.onerror = () => reject(new Error(`无法加载 ${src}`)); image.src = src; }); }
  async function load() {
    try {
      await Promise.all(E.PARTS.map(async p => {
        try { assets[p.file] = await loadImage(imagePath(p)); }
        catch (_) { assets[p.file] = await loadImage(`assets/${p.file}.svg`); tray.querySelector(`[data-part="${p.id}"] img`).src = `assets/${p.file}.svg`; }
      }));
      earth = await loadImage('assets/earth-sphere.png');
      assets.clock = await loadImage('assets/clock.svg');
      silhouettes = S.masks(assets, (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; });
      ghosts = C.makeGhosts(assets, (w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;});
      ready = true; $('scene-loading').hidden = true; updateUI();
      if (state.placed.length) notify('上次的装配进度已恢复', state.phase === 'assembly' ? '可以继续安装剩余组件，也可以重新开始。' : '运行已暂停。点击“继续演示”，或开启故障实验。');
      if(directClockPreview||state.fault==='clock')enterClock(state.fault==='clock');
    } catch (error) { $('scene-loading').textContent = '组件加载失败，请确认 assets 文件夹和网页放在一起。'; notify('素材尚未加载完整', error.message, 'error'); }
  }
  function frame(timestamp) {
    const dt = lastFrame ? Math.min((timestamp - lastFrame) / 1000, .1) : 0; lastFrame = timestamp;
    if (ready) {
      if (!state.paused && !state.challenge && !document.hidden) { if (state.phase !== 'assembly') orbitTime += dt; if (state.fault) faultAge += dt; }
      E.tick(state, document.hidden ? 0 : dt);
      Object.keys(animations).forEach(id => { animations[id].age += dt; if (animations[id].age > 1) delete animations[id]; });
      if(clock.active){
        if(!document.hidden)clock.localTime+=dt;
        if(clock.leaving)clock.fromTime=orbitTime;
        clock.progress=Math.max(0,Math.min(1,clock.progress+(clock.leaving?-1:1)*dt/(clock.leaving?1.15:1.8)));
        clock.displayNs=M.smooth(clock.displayNs,state.clockNs,dt,reducedMotion);
        updateClockReadouts();
        C.draw(context,{width,height,state,assets,earth,silhouettes,ghosts,time:reducedMotion?0:clock.localTime,ns:clock.displayNs,target:clock.target,progress:clock.progress,fromFocus:clock.fromFocus,fromTime:clock.fromTime,reducedMotion});
        if(clock.leaving&&clock.progress===0)finishClock();
      }else S.draw(context, { width, height, state, assets, earth, silhouettes, time: reducedMotion ? 0 : orbitTime, selected, hovered, hints, animations, focus, clockError:state.clockNs, faultAge });
      if (lastPhase !== state.phase) {
        if (state.phase === 'complete') { notify('救援船已抵达，任务完成', '三个组成部分协作，才能提供可靠的导航服务。现在试着做一次原子钟和地面维护故障实验，思考关键技术为什么要自主掌握。', 'success'); tone(); persist(); }
        updateUI(); lastPhase = state.phase;
      }
      if (timestamp - lastPersist > 4000 && state.phase === 'running') { persist(); lastPersist = timestamp; }
    }
    requestAnimationFrame(frame);
  }
  window.addEventListener('pagehide', persist);
  window.beidouGame = { getState: () => structuredClone(state), select: showPart, install, reset, start: () => $('start-button').click(), getView: () => focus, enterClock, leaveClock, setClockError, getClockState:()=>({...clock,estimate:M.response(clock.displayNs,clock.target)}) };
  updateUI(); load(); requestAnimationFrame(frame);
})();
