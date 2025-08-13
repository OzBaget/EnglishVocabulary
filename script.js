
const THEME_KEY = 'vocab-theme';
function setTheme(t){
  const b = document.body;
  b.classList.remove('theme-abstract','theme-dark','theme-light','theme-code');
  b.classList.add(t);
  localStorage.setItem(THEME_KEY,t);
}
function initThemeSelect(){
  const sel = document.getElementById('theme');
  if(!sel) return;
  const cur = localStorage.getItem(THEME_KEY) || 'theme-abstract';
  setTheme(cur);
  sel.value = cur;
  sel.addEventListener('change',()=> setTheme(sel.value));
}

async function loadLevels(){
  try{
    const res = await fetch('data/levels.json', {cache:'no-store'});
    if(!res.ok) throw new Error('levels.json missing');
    return await res.json();
  }catch(e){
    console.warn('Using embedded defaults', e);
    return DEFAULT_LEVELS;
  }
}
function saveProgress(level, stats){ localStorage.setItem('vocab-lv-'+level, JSON.stringify(stats)); }
function loadProgress(level){
  try{ return JSON.parse(localStorage.getItem('vocab-lv-'+level)) || {known:0,partial:0,unknown:0,total:0}; }
  catch(_){ return {known:0,partial:0,unknown:0,total:0}; }
}

async function initIndex(){
  initThemeSelect();
  const levels = await loadLevels();
  const wrap = document.getElementById('levels');
  wrap.innerHTML='';
  Object.keys(levels).forEach(k => {
    const stats = loadProgress(k);
    const div = document.createElement('a');
    div.href = 'level.html?level='+k;
    div.className = 'level';
    div.innerHTML = `
      <h3>רמה ${k}</h3>
      <div>${stats.known} ידוע • ${stats.partial} חלקי • ${stats.unknown} לא ידוע</div>
      <div class="progress"><span style="width:${stats.total? Math.round((stats.known/stats.total)*100):0}%"></span></div>
    `;
    wrap.appendChild(div);
  });
}

function posClass(pos){
  if(!pos) return 'pos-verb';
  pos = pos.toLowerCase();
  if(pos.includes('noun')) return 'pos-noun';
  if(pos.includes('adj')) return 'pos-adj';
  return 'pos-verb';
}

function speakWord(word){
  // Try MP3 first
  const audioPath = `assets/audio/${word.toLowerCase()}.mp3`;
  const audio = new Audio(audioPath);
  return new Promise((resolve) => {
    let usedWebSpeech = false;
    audio.oncanplay = () => { audio.play(); resolve(); };
    audio.onerror = () => {
      // Fallback: Web Speech API
      usedWebSpeech = true;
      try{
        const u = new SpeechSynthesisUtterance(word);
        u.lang = 'en-US';
        u.rate = 0.95; u.pitch = 1;
        speechSynthesis.cancel(); speechSynthesis.speak(u);
      }catch(_){}
      resolve();
    };
  });
}

function qs(key){
  const p = new URLSearchParams(location.search);
  return p.get(key);
}

async function initLevelFromQuery(){ const l = qs('level') || '1'; await initLevel(l); }

async function initLevel(level){
  setTheme(localStorage.getItem(THEME_KEY) || 'theme-abstract');
  const data = await loadLevels();
  const words = data[level] || [];
  document.getElementById('title').textContent = 'רמה ' + level;
  const card = document.getElementById('card');
  const statusLayer = document.getElementById('status');
  const wordEl = document.getElementById('word');
  const posEl = document.getElementById('pos');
  const defEl = document.getElementById('definition');
  const trEl = document.getElementById('translation');
  const audioBtn = document.getElementById('audioBtn');
  const bar = document.getElementById('bar');
  document.getElementById('reset').addEventListener('click',()=>{
    localStorage.removeItem('vocab-lv-'+level);
    location.reload();
  });

  let idx = 0;
  let known=0, partial=0, unknown=0;
  const total = words.length;
  function updateBar(){ bar.style.width = Math.round(((known+partial+unknown)/total)*100)+'%'; }

  function render(){
    const item = words[idx];
    if(!item){ // finished
      document.querySelector('.card-wrap').innerHTML = `<div class="card" style="display:grid;place-items:center;height:200px"><div>סיימת את רמה ${level}! ✔</div></div>`;
      saveProgress(level,{known,partial,unknown,total});
      return;
    }
    wordEl.textContent = item.word;
    posEl.textContent = item.pos || '';
    posEl.className = 'pos-chip ' + posClass(item.pos);
    defEl.textContent = 'Definition: ' + (item.definition || '');
    trEl.textContent = 'תרגום: ' + (item.translation || '');
    card.classList.remove('is-flipped');
  }
  render(); updateBar();

  // Flip on click
  card.addEventListener('click', (e)=>{
    if(e.target === audioBtn) return;
    card.classList.toggle('is-flipped');
  });

  // Audio
  audioBtn.addEventListener('click', async ()=>{
    audioBtn.classList.add('playing');
    await speakWord(words[idx]?.word || '');
    setTimeout(()=> audioBtn.classList.remove('playing'), 700);
  });

  // Swipe handling (pointer events)
  let startX=0, startY=0, dx=0, dy=0, dragging=false;
  const threshold = 80;
  card.addEventListener('pointerdown', (e)=>{
    dragging=true; startX=e.clientX; startY=e.clientY;
    card.setPointerCapture(e.pointerId);
    card.classList.add('dragging');
  });
  card.addEventListener('pointermove', (e)=>{
    if(!dragging) return;
    dx = e.clientX - startX; dy = e.clientY - startY;
    card.style.transform = `translate(${dx}px, ${dy}px) rotate(${dx*0.03}deg)`;
  });
  function endDrag(resultClass){
    dragging=false;
    card.style.transform='';
    card.classList.remove('dragging');
    if(!resultClass){ return; }
    statusLayer.className = 'status show ' + resultClass;
    card.style.animation = resultClass==='good' ? 'swipeRight .35s forwards' :
                           resultClass==='bad' ? 'swipeLeft .35s forwards' :
                           'swipeDown .35s forwards';
    setTimeout(()=>{
      statusLayer.className='status';
      card.style.animation='none';
      if(resultClass==='good') known++;
      else if(resultClass==='partial') partial++;
      else unknown++;
      idx++; updateBar();
      saveProgress(level,{known,partial,unknown,total});
      render();
    }, 360);
  }
  card.addEventListener('pointerup', ()=>{
    if(!dragging) return;
    const absX = Math.abs(dx), absY = Math.abs(dy);
    if(absX>threshold && absX>absY) endDrag(dx>0?'good':'bad');
    else if(absY>threshold) endDrag('partial');
    else endDrag(null);
  });
  card.addEventListener('pointercancel', ()=>{ dragging=false; card.style.transform=''; card.classList.remove('dragging'); });

  // Keyboard fallback
  window.addEventListener('keydown', (e)=>{
    if(e.key==='ArrowRight') endDrag('good');
    if(e.key==='ArrowLeft') endDrag('bad');
    if(e.key==='ArrowDown') endDrag('partial');
    if(e.key===' ') card.classList.toggle('is-flipped');
  });
}

// Embedded default levels (fallback if json missing)
const DEFAULT_LEVELS = {
  "1": [
  {
    "word": "anticipate",
    "translation": "לצפות מראש",
    "definition": "expect or predict",
    "pos": "verb"
  },
  {
    "word": "approximate",
    "translation": "משוער",
    "definition": "close but not exact",
    "pos": "adj"
  },
  {
    "word": "coherent",
    "translation": "עקבי, קוהרנטי",
    "definition": "logical and consistent",
    "pos": "adj"
  },
  {
    "word": "compile",
    "translation": "לקבץ, לאסוף",
    "definition": "gather information into one source",
    "pos": "verb"
  },
  {
    "word": "comprise",
    "translation": "כולל, מורכב מ",
    "definition": "consist of; be made up of",
    "pos": "verb"
  },
  {
    "word": "conduct",
    "translation": "לנהל, לבצע",
    "definition": "organize and carry out",
    "pos": "verb"
  },
  {
    "word": "constrain",
    "translation": "להגביל",
    "definition": "restrict or limit",
    "pos": "verb"
  },
  {
    "word": "contradict",
    "translation": "לסתור",
    "definition": "deny the truth of; oppose",
    "pos": "verb"
  },
  {
    "word": "converse",
    "translation": "הפוך; לשוחח",
    "definition": "opposite; talk informally",
    "pos": "verb"
  },
  {
    "word": "convey",
    "translation": "להעביר, למסור",
    "definition": "communicate or transport",
    "pos": "verb"
  },
  {
    "word": "derive",
    "translation": "להפיק, להסיק",
    "definition": "obtain from a source; infer",
    "pos": "verb"
  },
  {
    "word": "differentiate",
    "translation": "להבחין בין",
    "definition": "recognize what makes different",
    "pos": "verb"
  },
  {
    "word": "elaborate",
    "translation": "מפורט; להרחיב",
    "definition": "involving many details; expand",
    "pos": "adj"
  },
  {
    "word": "embark",
    "translation": "להתחיל, לצאת לדרך",
    "definition": "begin a course of action",
    "pos": "verb"
  },
  {
    "word": "emphasize",
    "translation": "להדגיש",
    "definition": "give special importance to",
    "pos": "verb"
  },
  {
    "word": "evolve",
    "translation": "להתפתח",
    "definition": "develop gradually",
    "pos": "verb"
  },
  {
    "word": "feasible",
    "translation": "בר-ביצוע",
    "definition": "possible to do easily",
    "pos": "adj"
  },
  {
    "word": "fluctuate",
    "translation": "להתנדנד",
    "definition": "rise and fall irregularly",
    "pos": "verb"
  },
  {
    "word": "formulate",
    "translation": "לנסח",
    "definition": "express methodically",
    "pos": "verb"
  },
  {
    "word": "gauge",
    "translation": "למדוד, לאמוד",
    "definition": "measure precisely",
    "pos": "verb"
  },
  {
    "word": "hypothesis",
    "translation": "השערה",
    "definition": "proposed explanation",
    "pos": "noun"
  },
  {
    "word": "implement",
    "translation": "ליישם",
    "definition": "put into effect",
    "pos": "verb"
  },
  {
    "word": "incentive",
    "translation": "תמריץ",
    "definition": "thing that motivates",
    "pos": "noun"
  },
  {
    "word": "inhibit",
    "translation": "לעכב, לדכא",
    "definition": "hinder or restrain",
    "pos": "verb"
  },
  {
    "word": "insight",
    "translation": "תובנה",
    "definition": "deep understanding",
    "pos": "noun"
  },
  {
    "word": "integrate",
    "translation": "לשלב",
    "definition": "combine into a whole",
    "pos": "verb"
  },
  {
    "word": "interpret",
    "translation": "לפרש",
    "definition": "explain the meaning of",
    "pos": "verb"
  },
  {
    "word": "mitigate",
    "translation": "להפחית, למתן",
    "definition": "make less severe",
    "pos": "verb"
  },
  {
    "word": "notion",
    "translation": "רעיון, תפיסה",
    "definition": "belief or idea",
    "pos": "noun"
  },
  {
    "word": "plausible",
    "translation": "סביר",
    "definition": "seeming reasonable",
    "pos": "adj"
  },
  {
    "word": "precede",
    "translation": "להקדים",
    "definition": "come before in time",
    "pos": "verb"
  },
  {
    "word": "precise",
    "translation": "מדויק",
    "definition": "exact and accurate",
    "pos": "adj"
  },
  {
    "word": "predominant",
    "translation": "דומיננטי",
    "definition": "present as the strongest",
    "pos": "adj"
  },
  {
    "word": "qualitative",
    "translation": "איכותי",
    "definition": "relating to quality",
    "pos": "adj"
  },
  {
    "word": "quantitative",
    "translation": "כמותי",
    "definition": "relating to quantity",
    "pos": "adj"
  },
  {
    "word": "refine",
    "translation": "לזקק, לשפר",
    "definition": "improve by making small changes",
    "pos": "verb"
  },
  {
    "word": "relevant",
    "translation": "רלוונטי",
    "definition": "closely connected",
    "pos": "adj"
  },
  {
    "word": "substantiate",
    "translation": "לבסס בטיעון",
    "definition": "provide evidence to support",
    "pos": "verb"
  },
  {
    "word": "sufficient",
    "translation": "מספיק",
    "definition": "adequate",
    "pos": "adj"
  },
  {
    "word": "sustain",
    "translation": "לקיים, להחזיק",
    "definition": "strengthen or support",
    "pos": "verb"
  },
  {
    "word": "synthesize",
    "translation": "לסנתז, לשלב",
    "definition": "combine into a coherent whole",
    "pos": "verb"
  }
]
};
