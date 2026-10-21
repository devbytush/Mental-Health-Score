const MAX_SCORE = 10;          // change if your model's score uses another scale
const C = 565.5;               // ring circumference (2π × 90)
const $ = (s) => document.querySelector(s);

const SEGS = {
  gender: ['Male', 'Female'],
  academic_level: ['High School', 'Undergraduate', 'Graduate'],
  most_used_platform: ['Instagram', 'TikTok', 'WhatsApp', 'Facebook', 'YouTube', 'Snapchat', 'Twitter', 'LinkedIn', 'WeChat', 'LINE', 'KakaoTalk', 'VKontakte'],
  purpose_of_use: ['Entertainment', 'Networking', 'Education', 'News'],
  stress_level: ['Low', 'Medium', 'High', 'Very High'],
};
const COUNTRIES = ['India', 'USA', 'Canada', 'Australia', 'UK', 'Germany', 'Mexico', 'Turkey', 'France', 'Other'];

// [type, name, label, min, max, step, default, unit]
const SECTIONS = [
  ['About you', [
    ['num', 'age', 'Age', 10, 100, 1, 20],
    ['seg', 'gender', 'Gender'],
    ['sel', 'country', 'Country'],
    ['seg', 'academic_level', 'Academic level'],
  ]],
  ['Social media', [
    ['seg', 'most_used_platform', 'Platform you use most'],
    ['seg', 'purpose_of_use', 'What you mostly use it for'],
    ['rng', 'avg_daily_usage_hours', 'Time on social media per day', 0, 16, 0.1, 4, ' h'],
    ['rng', 'daily_unlocks', 'Phone unlocks per day', 0, 300, 1, 70, ''],
  ]],
  ['Your day', [
    ['rng', 'study_hours', 'Study time per day', 0, 12, 0.1, 4, ' h'],
    ['rng', 'sleep_hours_per_night', 'Sleep per night', 0, 12, 0.1, 7, ' h'],
    ['rng', 'physical_activity_hours', 'Physical activity per day', 0, 24, 0.1, 0.5, ' h'],
    ['seg', 'stress_level', 'Stress level'],
  ]],
];

const form = $('#form');

function field([type, name, label, min, max, step, val, unit]) {
  const id = 'f-' + name;
  if (type === 'seg') {
    const items = SEGS[name].map((v, i) =>
      `<label><input type="radio" name="${name}" value="${v}" ${i === 0 ? 'checked' : ''}><span>${v}</span></label>`).join('');
    return `<div class="f"><div class="l" id="${id}">${label}</div><div class="seg ${name === 'stress_level' ? 'stress' : ''}" role="radiogroup" aria-labelledby="${id}">${items}</div></div>`;
  }
  if (type === 'sel') {
    return `<div class="f"><label class="l" for="${id}">${label}</label><select id="${id}" name="${name}">${COUNTRIES.map((c) => `<option>${c}</option>`).join('')}</select></div>`;
  }
  if (type === 'num') {
    return `<div class="f"><label class="l" for="${id}">${label}</label><input id="${id}" name="${name}" type="number" min="${min}" max="${max}" step="${step}" value="${val}" inputmode="numeric"></div>`;
  }
  return `<div class="f"><label class="l" for="${id}">${label}<output id="${id}-o" data-unit="${unit}">${step < 1 ? Number(val).toFixed(1) : val}${unit}</output></label><input id="${id}" name="${name}" type="range" min="${min}" max="${max}" step="${step}" value="${val}"></div>`;
}

form.innerHTML = SECTIONS.map(([t, fs]) => `<section><h2>${t}</h2>${fs.map(field).join('')}</section>`).join('') +
  '<button class="go" id="go" type="submit">Estimate my score</button>';

/* ---- Day split bar ---- */
const DAY = [
  ['sleep_hours_per_night', 'Sleep', 'var(--indigo)'],
  ['study_hours', 'Study', 'var(--teal)'],
  ['avg_daily_usage_hours', 'Social media', 'var(--rose)'],
  ['physical_activity_hours', 'Activity', 'var(--sun)'],
];
$('#day').innerHTML = DAY.map(([, , c]) => `<i style="background:${c};flex:0 0 0%"></i>`).join('');
$('#legend').innerHTML = DAY.map(([, n, c]) => `<li><b style="background:${c}"></b>${n}</li>`).join('');

function syncRange(el) {
  const p = ((el.value - el.min) / (el.max - el.min)) * 100;
  el.style.setProperty('--p', p + '%');
  const o = $('#' + el.id + '-o');
  if (o) o.textContent = (parseFloat(el.step) < 1 ? Number(el.value).toFixed(1) : el.value) + o.dataset.unit;
}
function syncDay() {
  const bars = $('#day').children;
  const vals = DAY.map(([n]) => parseFloat(form.elements[n].value) || 0);
  const total = Math.max(24, vals.reduce((a, b) => a + b, 0));
  vals.forEach((v, i) => (bars[i].style.flexBasis = (v / total) * 100 + '%'));
}
form.querySelectorAll('input[type=range]').forEach(syncRange);
syncDay();
form.addEventListener('input', (e) => {
  if (e.target.type === 'range') syncRange(e.target);
  syncDay();
});

/* ---- Result ---- */
const BANDS = [
  [0.8, 'Doing well', ['#5CBDB8', '#17706F'], 'Your habits line up with a high score. Keep protecting your sleep and routine.'],
  [0.6, 'Holding steady', ['#6F86E0', '#33479E'], 'A solid middle ground. Small changes to sleep or screen time could move this up.'],
  [0.4, 'Under some strain', ['#EDAE3F', '#B26F0A'], 'Your habits point to some pressure. Sleep, movement and less late-night scrolling tend to help.'],
  [0, 'Struggling', ['#E0707F', '#A32E45'], 'Your answers resemble students who report low wellbeing. Consider talking with someone you trust.'],
];
const panel = $('.panel'), verdict = $('.verdict');

function show(score) {
  const band = BANDS.find((b) => score / MAX_SCORE >= b[0]);
  const orb = $('#orb');
  orb.style.setProperty('--c1', band[2][0]);
  orb.style.setProperty('--c2', band[2][1]);
  $('#ring').style.stroke = band[2][1];
  $('#ring').style.strokeDashoffset = C * (1 - Math.min(score / MAX_SCORE, 1));
  $('#vtitle').textContent = band[1];
  $('#vtext').textContent = band[3];
  verdict.classList.remove('err');
  const t0 = performance.now(), dur = 1600;
  (function tick(t) {
    const k = Math.min((t - t0) / dur, 1), e = 1 - Math.pow(1 - k, 3);
    $('#score').textContent = (score * e).toFixed(2);
    if (k < 1) requestAnimationFrame(tick);
  })(t0);
}
function fail(msg) {
  verdict.classList.add('err');
  $('#vtitle').textContent = 'Couldn’t get a score';
  $('#vtext').textContent = msg;
  $('#score').textContent = '–';
  $('#ring').style.strokeDashoffset = C;
}

function payload() {
  const o = Object.fromEntries(new FormData(form));
  ['age', 'daily_unlocks'].forEach((k) => (o[k] = parseInt(o[k], 10)));
  ['avg_daily_usage_hours', 'study_hours', 'physical_activity_hours', 'sleep_hours_per_night'].forEach((k) => (o[k] = parseFloat(o[k])));
  return o;
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = $('#go');
  btn.disabled = true; btn.textContent = 'Estimating…';
  panel.classList.add('busy');
  if (matchMedia('(max-width:900px)').matches) panel.scrollIntoView({ behavior: 'smooth', block: 'center' });
  try {
    const [res] = await Promise.all([
      fetch('/predict', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload()) }),
      new Promise((r) => setTimeout(r, 900)), // short beat so the orb’s change is visible
    ]);
    if (!res.ok) throw new Error(res.status === 422 ? 'One of your answers is outside the accepted range. Check the age and sliders.' : 'The server returned an error. Try again in a moment.');
    const data = await res.json();
    show(data.predicted_mental_health_score);
  } catch (err) {
    fail(err.message.includes('fetch') ? 'Can’t reach the server. Check your connection and try again.' : err.message);
  } finally {
    btn.disabled = false; btn.textContent = 'Estimate again';
    panel.classList.remove('busy');
  }
});