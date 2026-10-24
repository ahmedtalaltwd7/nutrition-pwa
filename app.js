/* UI, i18n, local storage and service-worker registration. */
const T = {
  en: { title:'Nutrition Calculator', name:'Name', gender:'Gender', age:'Age (years)', activity:'Physical activity level',
    height:'Height (cm)', weight:'Weight (kg)', male:'Male', female:'Female', choose:'Select…', calc:'Calculate', reset:'Reset',
    save:'Save record', update:'Update record', print:'Print results', records:'Saved records', clearAll:'Clear all', del:'Delete', edit:'Edit',
    none:'No saved records.', saved:'Record saved on this device.', updated:'Record updated.', confirmDel:'Delete this record?', confirmAll:'Delete ALL saved records?',
    saveNote:'Records are saved only when you press "Save record". They stay on this device (no internet, no upload).',
    online:'Online', offline:'Offline (app works normally)', lang:'العربية',
    sedentary:'Sedentary', light:'Lightly active', moderate:'Moderately active', very:'Very active', extra:'Extra active',
    under:'Underweight', normal:'Normal weight', over:'Overweight', obese:'Obese', severe:'Severe / morbid obesity',
    bmi:'BMI', ibw:'Ideal body weight', bmr:'RMB / BMR', tdee:'Daily energy expenditure (TDEE)', factor:'Multiplier', profile:'Profile',
    eName:'Please enter a name.', eGender:'Please select a gender.', eAge:'Age must be 1–120 years.', eActivity:'Please select an activity level.',
    eHeight:'Height must be 50–250 cm.', eWeight:'Weight must be 10–500 kg.',
    missing:'Some app files are missing from the offline cache. Connect to the internet and reload the page to restore them.',
    disclaimer:'BMI, IBW and calorie figures are estimates for general information only. They are not a medical diagnosis or individualized medical advice. Consult a qualified health professional.' },
  ar: { title:'حاسبة التغذية', name:'الاسم', gender:'الجنس', age:'العمر (سنة)', activity:'النشاط البدني',
    height:'الطول (سم)', weight:'الوزن (كجم)', male:'ذكر', female:'أنثى', choose:'اختر…', calc:'احسب', reset:'إعادة تعيين',
    save:'حفظ السجل', update:'تحديث السجل', print:'طباعة النتائج', records:'السجلات المحفوظة', clearAll:'حذف الكل', del:'حذف', edit:'تعديل',
    none:'لا توجد سجلات محفوظة.', saved:'تم حفظ السجل على هذا الجهاز.', updated:'تم تحديث السجل.', confirmDel:'حذف هذا السجل؟', confirmAll:'حذف جميع السجلات المحفوظة؟',
    saveNote:'لا يتم حفظ السجلات إلا عند الضغط على "حفظ السجل". تبقى على هذا الجهاز فقط (بدون إنترنت أو رفع).',
    online:'متصل', offline:'غير متصل (التطبيق يعمل بشكل طبيعي)', lang:'English',
    sedentary:'خامل', light:'نشاط خفيف', moderate:'نشاط متوسط', very:'نشاط عالٍ', extra:'نشاط عالٍ جداً',
    under:'نحافة', normal:'وزن طبيعي', over:'وزن زائد', obese:'سمنة', severe:'سمنة مفرطة',
    bmi:'مؤشر كتلة الجسم', ibw:'الوزن المثالي', bmr:'معدل الأيض الأساسي (RMB)', tdee:'الطاقة اليومية المقدرة (TDEE)', factor:'المعامل', profile:'البيانات',
    eName:'الرجاء إدخال الاسم.', eGender:'الرجاء اختيار الجنس.', eAge:'العمر يجب أن يكون بين 1 و120 سنة.', eActivity:'الرجاء اختيار مستوى النشاط.',
    eHeight:'الطول يجب أن يكون بين 50 و250 سم.', eWeight:'الوزن يجب أن يكون بين 10 و500 كجم.',
    missing:'بعض ملفات التطبيق غير موجودة في الذاكرة المؤقتة. اتصل بالإنترنت وأعد تحميل الصفحة لاستعادتها.',
    disclaimer:'قيم مؤشر كتلة الجسم والوزن المثالي والسعرات هي تقديرات للمعلومات العامة فقط، وليست تشخيصاً طبياً ولا نصيحة طبية فردية. استشر أخصائي رعاية صحية مؤهلاً.' }
};
const KEY = 'nutri.records.v1', LKEY = 'nutri.lang';
const $ = id => document.getElementById(id);
let lang = localStorage.getItem(LKEY) || ((navigator.language || '').startsWith('ar') ? 'ar' : 'en');
let current = null, editingId = null;
const t = k => T[lang][k] || k;
const nf = (n, d) => new Intl.NumberFormat(lang === 'ar' ? 'ar-EG' : 'en-US', { maximumFractionDigits: d, minimumFractionDigits: d }).format(n);

const store = {
  all() { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { return []; } },
  put(a) { localStorage.setItem(KEY, JSON.stringify(a)); }
};

function applyLang() {
  document.documentElement.lang = lang; document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  document.title = t('title'); $('title').textContent = t('title'); $('lang').textContent = t('lang');
  document.querySelectorAll('[data-t]').forEach(el => el.textContent = t(el.dataset.t));
  fillSelect('gender', [['', 'choose'], ['male', 'male'], ['female', 'female']]);
  fillSelect('activity', [['', 'choose'], ...Object.keys(ACTIVITY).map(k => [k, k])], k => ' (×' + ACTIVITY[k] + ')');
  $('save').textContent = t(editingId ? 'update' : 'save');
  setNet(); renderList(); if (current) renderResults();
}
function fillSelect(id, opts, suffix) {
  const s = $(id), v = s.value; s.innerHTML = '';
  opts.forEach(([val, key]) => { const o = document.createElement('option'); o.value = val;
    o.textContent = t(key) + (val && suffix ? suffix(val) : ''); s.appendChild(o); });
  s.value = v;
}
function readInput() {
  return { name: $('name').value, gender: $('gender').value, age: parseFloat($('age').value),
    activity: $('activity').value, height: parseFloat($('height').value), weight: parseFloat($('weight').value) };
}
function showErrors(e) {
  ['name', 'gender', 'age', 'activity', 'height', 'weight'].forEach(f => {
    $('err-' + f).textContent = e[f] ? t(e[f]) : ''; $(f).setAttribute('aria-invalid', e[f] ? 'true' : 'false'); });
  const first = Object.keys(e)[0]; if (first) $(first).focus();
}
function card(k, v, s, wide) {
  const d = document.createElement('div'); d.className = 'card' + (wide ? ' wide' : '');
  [['k', k], ['v', v], ['s', s]].forEach(([c, x]) => { if (x == null || x === '') return;
    const p = document.createElement('div'); p.className = c; p.textContent = x; d.appendChild(p); });
  return d;
}
function renderResults() {
  const i = current.input, r = current.result, c = $('cards'); c.innerHTML = '';
  c.append(
    card(t('profile'), i.name, `${t(i.gender)} • ${nf(i.age, 0)} • ${nf(i.height, 1)} cm • ${nf(i.weight, 1)} kg`, true),
    card(t('activity'), t(i.activity), `${t('factor')}: ×${r.factor}`, true),
    card(t('bmi'), nf(r.bmi, 1), t(r.cls)),
    card(t('ibw'), nf(r.ibw, 1) + ' kg'),
    card(t('bmr'), nf(r.bmr, 0), 'kcal/day'),
    card(t('tdee'), nf(r.tdee, 0), 'kcal/day'));
  $('results').hidden = false;
}
function calculate(ev) {
  ev.preventDefault();
  const input = readInput(), e = Calc.validate(input); showErrors(e);
  if (Object.keys(e).length) { $('results').hidden = true; current = null; return; }
  current = { input, result: Calc.run(input) }; renderResults();
  $('results').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
function saveRecord() {
  if (!current) return;
  const a = store.all(), rec = { id: editingId || String(Date.now()), date: new Date().toISOString(), input: current.input, result: current.result };
  const idx = a.findIndex(x => x.id === rec.id), upd = idx >= 0;
  if (upd) a[idx] = rec; else a.unshift(rec);
  store.put(a); editingId = null; $('save').textContent = t('save'); renderList(); alert(t(upd ? 'updated' : 'saved'));
}
function renderList() {
  const ul = $('list'), a = store.all(); ul.innerHTML = '';
  $('clear').hidden = !a.length;
  if (!a.length) { const li = document.createElement('li'); li.textContent = t('none'); ul.appendChild(li); return; }
  a.forEach(r => {
    const li = document.createElement('li'), info = document.createElement('div'); info.className = 'info';
    const b = document.createElement('strong'); b.textContent = r.input.name;
    const s = document.createElement('div'); s.className = 'note';
    s.textContent = `${new Date(r.date).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-GB')} • BMI ${nf(r.result.bmi, 1)} • TDEE ${nf(r.result.tdee, 0)} kcal`;
    info.append(b, s);
    const e = document.createElement('button'); e.type = 'button'; e.className = 'secondary'; e.textContent = t('edit');
    e.onclick = () => loadRecord(r);
    const d = document.createElement('button'); d.type = 'button'; d.className = 'danger'; d.textContent = t('del');
    d.onclick = () => { if (confirm(t('confirmDel'))) { store.put(store.all().filter(x => x.id !== r.id)); if (editingId === r.id) editingId = null; renderList(); } };
    li.append(info, e, d); ul.appendChild(li);
  });
}
function loadRecord(r) {
  const i = r.input; $('name').value = i.name; $('gender').value = i.gender; $('age').value = i.age;
  $('activity').value = i.activity; $('height').value = i.height; $('weight').value = i.weight;
  editingId = r.id; current = { input: i, result: Calc.run(i) }; showErrors({}); renderResults();
  $('save').textContent = t('update'); window.scrollTo({ top: 0, behavior: 'smooth' });
}
function setNet() { const n = $('net'), on = navigator.onLine; n.textContent = t(on ? 'online' : 'offline'); n.classList.toggle('off', !on); }

/* Offline support */
const NEEDED = ['./index.html', './style.css', './calc.js', './app.js', './manifest.json', './icons/icon-192.png', './icons/icon-512.png', './offline.html'];
async function verifyCache() {
  if (!('caches' in window) || !navigator.serviceWorker.controller) return;
  try {
    const ok = await Promise.all(NEEDED.map(u => caches.match(u)));
    $('warn').hidden = ok.every(Boolean); $('warn').textContent = t('missing');
  } catch (e) { /* ignore */ }
}
function registerSW() {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.register('service-worker.js').then(() => navigator.serviceWorker.ready).then(verifyCache)
    .catch(() => { $('warn').hidden = false; $('warn').textContent = t('missing'); });
}

$('form').addEventListener('submit', calculate);
$('form').addEventListener('reset', () => { current = null; editingId = null; $('results').hidden = true; showErrors({}); $('save').textContent = t('save'); });
$('save').addEventListener('click', saveRecord);
$('print').addEventListener('click', () => window.print());
$('clear').addEventListener('click', () => { if (confirm(t('confirmAll'))) { store.put([]); renderList(); } });
$('lang').addEventListener('click', () => { lang = lang === 'ar' ? 'en' : 'ar'; localStorage.setItem(LKEY, lang); applyLang(); });
window.addEventListener('online', setNet); window.addEventListener('offline', setNet);
applyLang(); registerSW();
