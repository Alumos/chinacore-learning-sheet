(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const config = window.LEARNING_SHEET_CONFIG || {};
  const activities = [
    {title: '北斗拼装台', caption: '动手拼装 · 观察实验', url: 'beidou/', kicker: 'MISSION 01', tag: '动手发现', heading: ['让你的北斗', '亮起来。'], lead: '拼出一个系统，发现每个关键部件的力量。', color: '#3b6fe8', wash: '#edf3ff', tasks: ['把 9 个组件放回合适的位置，启动北斗导航。', '进入原子钟实验，拖动滑杆，观察导航位置的变化。', '校准原子钟，再看看地面维护中断会发生什么。'], question: '为什么一个小小的原子钟，会影响整个导航系统？', tip: '观察原子钟偏差，看看定位会发生什么变化。', fields: [{key: 'beidou', label: '我观察到的现象', placeholder: '当原子钟出现偏差时，我发现……'}]},
    {title: '高小铁 AI 助手', caption: '提出问题 · 寻找证据', url: config.searchUrl || 'https://fxh.alumos.cn/', kicker: 'MISSION 02', tag: 'AI 探究', heading: ['复兴号的本领，', '一起找答案。'], lead: '带着问题出发，让 AI 帮你找到线索。', color: '#259d80', wash: '#eaf8f2', tasks: ['询问复兴号在哪些方面实现了自主建造和自主研发。', '阅读回答，点开参考来源，核对找到的线索。', '用自己的话记录自主创新及其优点。'], question: '掌握关键技术，会让我们的高铁获得哪些本领？', tip: '试着问：复兴号有哪些自主创新？这些创新带来了哪些优点？', fields: [{key: 'built', label: '自主建造', placeholder: '哪些部分能够自主建造？'}, {key: 'developed', label: '自主研发', placeholder: '哪些关键技术由我们自主研发？'}, {key: 'benefits', label: '带来的优点', placeholder: '这些创新让高铁变得……'}]},
    {title: '中国芯 · 强国梦', caption: '整理想法 · 勇敢表达', url: config.classroomUrl || 'https://chinacore.alumos.cn/join', kicker: 'MISSION 03', tag: '分享观点', heading: ['把你的想法，', '送上班级大屏。'], lead: '从北斗到高铁，你的发现值得被听见。', color: '#d68147', wash: '#fff1e6', tasks: ['回顾北斗和复兴号的探索，选择一个你关注的领域。', '在右侧中国芯学生页面，用一句话分享你的理解。', '发送后，看看你的想法如何与全班的发现汇聚。'], question: '为什么关键技术要掌握在自己手里？你能举一个例子吗？', tip: '把观点发送到右侧中国芯页面，老师就能在班级大屏看到。', fields: [{key: 'reflection', label: '整理一下我的观点', placeholder: '我认为自主可控很重要，因为……（投稿请在右侧发送）'}]}
  ];
  const storageKey = 'alumos-learning-sheet-v1';
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(storageKey)) || {}; } catch (_) {}
  const state = {active: Number.isInteger(saved.active) && saved.active >= 0 && saved.active < 3 ? saved.active : 0, done: Array.from({length: 3}, (_, i) => saved.done?.[i] === true), notes: {}};
  activities.flatMap(a => a.fields).forEach(f => {state.notes[f.key] = typeof saved.notes?.[f.key] === 'string' ? saved.notes[f.key].slice(0, 4000) : '';});
  const frames = new Map();
  let toastTimer;
  const notify = message => { $('toast').textContent = message; $('toast').hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => { $('toast').hidden = true; }, 2800); };
  function persist() {
    try { localStorage.setItem(storageKey, JSON.stringify(state)); $('save-status').textContent = '学习记录已保存在本机'; }
    catch (_) { $('save-status').textContent = '可下载记录保存'; }
  }
  function updateProgress() {
    const count = state.done.filter(Boolean).length;
    $('progress-count').textContent = `${count} / 3`;
    $('progress-fill').style.width = `${count / 3 * 100}%`;
    document.querySelectorAll('.station').forEach((button, i) => {
      const active = state.active === i;
      button.classList.toggle('active', active);
      if (active) button.setAttribute('aria-current', 'step'); else button.removeAttribute('aria-current');
      button.querySelector('.station-check').hidden = !state.done[i];
      button.querySelector('.station-number').hidden = state.done[i];
    });
    $('complete-button').setAttribute('aria-pressed', String(state.done[state.active]));
    $('complete-label').textContent = state.done[state.active] ? '这一站已完成 · 点击可取消' : '我已完成这一站';
  }
  function createFrame(index) {
    const activity = activities[index];
    const frame = document.createElement('iframe');
    frame.title = activity.title;
    frame.allow = 'fullscreen';
    frame.setAttribute('allowfullscreen', '');
    frame.dataset.activity = String(index);
    const loading = document.createElement('div');
    loading.className = 'frame-loading';
    const spinner = document.createElement('span'); spinner.className = 'loader-orbit';
    const text = document.createElement('span'); text.textContent = `正在打开${activity.title}…`;
    const link = document.createElement('a'); link.className = 'loading-open'; link.href = activity.url; link.target = '_blank'; link.rel = 'noopener noreferrer'; link.textContent = '也可以独立打开 ↗';
    loading.append(spinner, text, link);
    let timer;
    frame.addEventListener('load', () => {clearTimeout(timer); loading.remove();}, {once: true});
    frame.src = activity.url;
    $('frame-stage').append(frame, loading);
    timer = setTimeout(() => { text.textContent = '打开较慢？可以点击下方独立打开。'; }, 12000);
    frames.set(index, {frame, loading});
  }
  function activate(index, save = true) {
    state.active = index;
    const activity = activities[index];
    document.documentElement.style.setProperty('--accent', activity.color);
    document.documentElement.style.setProperty('--wash', activity.wash);
    $('task-kicker').textContent = activity.kicker;
    $('task-tag').textContent = activity.tag;
    $('task-title').replaceChildren(document.createTextNode(activity.heading[0]), document.createElement('br'), document.createTextNode(activity.heading[1]));
    $('task-lead').textContent = activity.lead;
    $('task-list').replaceChildren(...activity.tasks.map(task => {const li = document.createElement('li'); li.textContent = task; return li;}));
    $('question-text').textContent = activity.question;
    $('activity-title').textContent = activity.title;
    $('activity-caption').textContent = activity.caption;
    $('activity-tip').textContent = activity.tip;
    $('open-link').href = activity.url;
    $('next-button').textContent = index === 2 ? '回顾第一站 ↺' : '去下一站 →';
    $('note-fields').replaceChildren(...activity.fields.map(field => {
      const label = document.createElement('label'); label.className = 'note-label'; label.textContent = field.label;
      const textarea = document.createElement('textarea'); textarea.placeholder = field.placeholder; textarea.value = state.notes[field.key]; textarea.maxLength = 4000; textarea.dataset.note = field.key;
      textarea.addEventListener('input', () => {state.notes[field.key] = textarea.value; persist();});
      label.append(textarea); return label;
    }));
    document.querySelector('.task-scroll').scrollTop = 0;
    if (!frames.has(index)) createFrame(index);
    frames.forEach(({frame, loading}, key) => {frame.hidden = key !== index; loading.hidden = key !== index;});
    updateProgress();
    if (save) persist();
  }
  function celebrate() {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const box = $('celebration'); box.replaceChildren();
    for (let i = 0; i < 15; i++) {
      const star = document.createElement('i'); star.textContent = i % 3 ? '✦' : '•';
      star.style.setProperty('--dx', `${(Math.random() - .5) * 650}px`); star.style.setProperty('--dy', `${120 + Math.random() * 280}px`); star.style.setProperty('--turn', `${Math.random() * 350}deg`);
      star.style.color = ['#5c8bea', '#f2b752', '#49b398'][i % 3]; box.append(star);
    }
    setTimeout(() => box.replaceChildren(), 1500);
  }
  document.querySelectorAll('.station').forEach(button => button.addEventListener('click', () => activate(Number(button.dataset.activity))));
  $('next-button').addEventListener('click', () => activate((state.active + 1) % 3));
  $('complete-button').addEventListener('click', () => {
    state.done[state.active] = !state.done[state.active]; updateProgress(); persist();
    if (state.done[state.active]) {celebrate(); notify(state.done.every(Boolean) ? '三站探索完成！把你的发现带向更远的未来。' : '收获一枚探索足迹，继续出发！');}
  });
  $('focus-button').addEventListener('click', () => {
    const focus = $('workspace').classList.toggle('focus-mode');
    $('focus-label').textContent = focus ? '展开任务' : '收起任务';
    $('focus-button').setAttribute('aria-expanded', String(!focus));
  });
  $('fullscreen-button').addEventListener('click', async () => {
    try {if (document.fullscreenElement) await document.exitFullscreen(); else await $('app-shell').requestFullscreen();}
    catch (_) {notify('可以使用浏览器全屏功能，或点击“收起任务”扩大活动区。');}
  });
  $('export-button').addEventListener('click', () => {
    const lines = ['# 我的课堂学习单', '', '主题：系统自主可控的重要意义', ''];
    activities.forEach((a, i) => {lines.push(`## ${i + 1}. ${a.title}`, `完成状态：${state.done[i] ? '我已完成' : '还在探索'}`, ''); a.fields.forEach(f => lines.push(`### ${f.label}`, state.notes[f.key] || '（尚未记录）', ''));});
    const url = URL.createObjectURL(new Blob([lines.join('\n')], {type: 'text/markdown;charset=utf-8'}));
    const link = document.createElement('a'); link.href = url; link.download = '我的课堂学习单.md'; document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    notify('学习记录已下载，记得保存你的发现。');
  });
  window.addEventListener('storage', event => {if (event.key === storageKey) notify('其他标签页更新了学习记录；刷新后可查看。');});
  activate(state.active, false);
})();
