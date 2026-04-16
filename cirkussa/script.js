const rouletteItems = [
  {
    code: '01',
    law: '[3/2018] + [32/2021] + [43/2021]',
    label: 'Obec 60/90',
    text: '"Obec" snižuje rychlost na 60. Hranice obce? To už si domysli sám, klaune.',
    bullets: ['v obci 60, mimo obec 90', 'Los Santos, San Fierro, Las Venturas a Angel Pine jsou obce', 'v terénu to často vypadá jako právní mlha']
  },
  {
    code: '02',
    law: '[47/2021] Zákon o trestu smrti',
    label: 'Trest smrti',
    text: 'Trest smrti s "neprolomitelnou argumentací" zní jako finále právní fantasy ságy.',
    bullets: ['smrtící třísl. injekce', 'trest pro "morálně neakceptovatelné" činy', 'čisté legislativní melodrama']
  },
  {
    code: '03',
    law: '[69/2021] Psychologická činnost a AMKP',
    label: 'AMKP monopol',
    text: 'Jedna instituce jako jediný poskytovatel psychologické činnosti? To není zdravotnictví, to je úřední fanfikce.',
    bullets: ['AMKP jako jediný poskytovatel', 'psychologickou činnost směl dělat jen zaměstnanec AMKP', 'malý administrativní kult v bílém plášti']
  },
  {
    code: '04',
    law: '[78/2022] Usnesení o výkonu psychologické činnosti',
    label: '400k psycho',
    text: 'Psychologický úkon až za 400 000 Kč, protože proč by absurdita měla mít strop vkusu?',
    bullets: ['strop 400 000 Kč', 'spodní hranice neurčena', 'cenotvorba ve stylu "uvidíme"']
  },
  {
    code: '05',
    law: '[101/2023] Zákon o provozování a užívání internetových služeb',
    label: 'Obsah patří všem',
    text: 'Obsah uživatelů je zároveň majetek platformy. Vítejte v digitálním feudálu.',
    bullets: ['uživatelský obsah padá i platformě', 'provozovatel má hlídat obsah', 'věk se má ověřovat "přiměřeně"']
  },
  {
    code: '06',
    law: '[223/2024] Zákon o vlastnictví a vedení psů',
    label: 'Psí techničák',
    text: 'Psí známka s obcí a statusem nebezpečnosti má víc administrativní elegance než půlka státu.',
    bullets: ['psí evidence a známka', 'na známce i obec a nebezpečnost', 'kompletní byrokracie pro hafany']
  },
  {
    code: '07',
    law: '[28/2021] Parkování firemních vozidel',
    label: '5 mega parking',
    text: '5 000 000 Kč za fake parkovací povolení je úžasný moment, kdy se satira píše sama.',
    bullets: ['milionové sankce', 'papír "Parkování povoleno dle 28/2021"', 'ekonomický horor na kolech']
  },
  {
    code: '08',
    law: '[65/2021] Oprávněný vstup policie do objektu',
    label: 'Důvodné podezření',
    text: '"Důvodné podezření" je v těchto textech občas univerzální klíč od všeho.',
    bullets: ['vstup bez souhlasu vlastníka', 'velmi široké podmínky', 'téměř prohlídka, ale "vlastně ne"']
  },
  {
    code: '09',
    law: '[169/2024] vs [170/2024] Veřejné zdraví',
    label: 'Zombie zákon',
    text: 'Dva skoro stejné zákony o veřejném zdraví, jeden mrtvý a jeden živý. Legislativní zombie show.',
    bullets: ['jeden neplatný, druhý platný', 'ideální zdroj chaosu v citacích', 'právní deja vu jako služba']
  },
  {
    code: '10',
    law: '[223/2024] Zákon o vlastnictví a vedení psů',
    label: 'Psí byro',
    text: 'Když i pes dostane evidenci, známku a úřední status, víš, že ses ztratil v krásné právní grotesce.',
    bullets: ['evidenční známka', 'archivace dokumentů', 'pes skoro jako instituce']
  },
  {
    code: '11',
    law: '[120/2023] Usnesení o omezení volební agitace',
    label: '10 mega agitka',
    text: 'Deset milionů pokuta za volební agitaci? Někdo si spletl volební dohled s finanční gilotinou.',
    bullets: ['až 10 000 000 Kč', 'agitace v objektu i kolem něj', 'boss-level přepal sankce']
  },
  {
    code: '12',
    law: '[30/2021] Usnesení o platnosti chybně uhrazených poplatků',
    label: 'Špatný poplatek',
    text: 'Samostatné usnesení o tom, že lidi posílají poplatky špatně, je čistá administrativní groteska.',
    bullets: ['řeší chybný název příjemce', 'typicky "vlada san andreas" místo "Vláda San Andreas"', 'stát bojuje s překlepy samostatným předpisem']
  },
  {
    code: '13',
    law: '[38/2021] Usnesení o obnově činnosti soudu',
    label: 'Soud po útoku',
    text: 'Když zákon řeší soud zničený teroristickým útokem, víš, že fantazie už dávno přejela zdravý rozum.',
    bullets: ['nouzové fungování justice', 'soud mimo původní budovu', 'čistá katastrofická energie']
  },
  {
    code: '14',
    law: '[158/2023] Usnesení o navýšení platů pro kongresmany',
    label: 'Platy kongresu',
    text: 'Usnesení o navýšení platů kongresmanů je evergreen, který v cirkusu nikdy nezklame.',
    bullets: ['nejdřív navýšit', 'pak zase měnit', 'klasika moci a kasičky']
  }
];

const rouletteBtn = document.getElementById('rouletteBtn');
const rouletteText = document.getElementById('rouletteText');
const rouletteViewport = document.getElementById('rouletteViewport');
const rouletteTrack = document.getElementById('rouletteTrack');
const modalElement = document.getElementById('lawResultModal');
const modalLaw = document.getElementById('modalLaw');
const modalLead = document.getElementById('modalLead');
const modalBullets = document.getElementById('modalBullets');
const modalCode = document.getElementById('modalCode');
const modalLabel = document.getElementById('modalLabel');
const modalVerdict = document.getElementById('modalVerdict');

let spinning = false;
let currentCellIndex = 0;
let segmentWidth = 160;
const repetitions = 32;
let audioCtx;
let lawModal = null;

function getAudioCtx() {
  if (!audioCtx) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    audioCtx = new Ctx();
  }
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

function tone({ frequency = 440, type = 'sine', duration = 0.1, volume = 0.03, start = 0, attack = 0.005, release = 0.05, endFrequency = null }) {
  const ctx = getAudioCtx();
  if (!ctx) return;
  const now = ctx.currentTime + start;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, now);
  if (endFrequency !== null) osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFrequency), now + duration);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(volume, now + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration + release);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + duration + release + 0.02);
}

function noiseSweep({ duration = 0.4, volume = 0.02, start = 0 }) {
  const ctx = getAudioCtx();
  if (!ctx) return;
  const bufferSize = Math.max(1, Math.floor(ctx.sampleRate * duration));
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
  const source = ctx.createBufferSource();
  const filter = ctx.createBiquadFilter();
  const gain = ctx.createGain();
  source.buffer = buffer;
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(1800, ctx.currentTime + start);
  filter.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + start + duration);
  gain.gain.setValueAtTime(0.0001, ctx.currentTime + start);
  gain.gain.exponentialRampToValueAtTime(volume, ctx.currentTime + start + 0.04);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + start + duration);
  source.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  source.start(ctx.currentTime + start);
}

function playSpinSound(totalDuration = 5.4) {
  noiseSweep({ duration: 0.45, volume: 0.012, start: 0 });
  tone({ frequency: 280, endFrequency: 120, type: 'sawtooth', duration: 0.35, volume: 0.018, start: 0 });
  const tickCount = 18;
  for (let i = 0; i < tickCount; i += 1) {
    const t = i / (tickCount - 1);
    const start = 0.12 + Math.pow(t, 1.7) * (totalDuration - 0.45);
    const pitch = 1200 - t * 500;
    tone({ frequency: pitch, type: 'square', duration: 0.018, volume: 0.012 + t * 0.004, start });
  }
}

function playWinSound() {
  tone({ frequency: 740, type: 'triangle', duration: 0.09, volume: 0.03, start: 0 });
  tone({ frequency: 987, type: 'triangle', duration: 0.11, volume: 0.026, start: 0.08 });
  tone({ frequency: 1318, type: 'triangle', duration: 0.16, volume: 0.03, start: 0.16 });
}

function clearActiveSegments() {
  rouletteTrack?.querySelectorAll('.roulette-segment-active').forEach((el) => el.classList.remove('roulette-segment-active'));
}

function buildTrack() {
  if (!rouletteTrack) return;
  rouletteTrack.innerHTML = '';
  for (let r = 0; r < repetitions; r += 1) {
    rouletteItems.forEach((item, itemIndex) => {
      const cell = document.createElement('div');
      cell.className = 'roulette-segment';
      cell.dataset.itemIndex = String(itemIndex);
      cell.innerHTML = `<span class="roulette-segment-code">${item.code}</span><span class="roulette-segment-label">${item.label}</span>`;
      rouletteTrack.appendChild(cell);
    });
  }
}

function measureSegmentWidth() {
  const first = rouletteTrack?.querySelector('.roulette-segment');
  if (!first) return 160;
  return first.getBoundingClientRect().width;
}

function setTrackPosition(cellIndex, withTransition = false) {
  if (!rouletteTrack || !rouletteViewport) return;
  const viewportWidth = rouletteViewport.clientWidth;
  const offset = cellIndex * segmentWidth - (viewportWidth / 2 - segmentWidth / 2);
  rouletteTrack.style.transition = withTransition ? 'transform 5.4s cubic-bezier(.08,.82,.16,1)' : 'none';
  rouletteTrack.style.transform = `translate3d(${-offset}px,0,0)`;
}

function getCenteredSegment() {
  if (!rouletteViewport || !rouletteTrack) return null;
  const viewportRect = rouletteViewport.getBoundingClientRect();
  const centerX = viewportRect.left + viewportRect.width / 2;
  let winner = null;
  let minDistance = Infinity;
  rouletteTrack.querySelectorAll('.roulette-segment').forEach((cell, absoluteIndex) => {
    const rect = cell.getBoundingClientRect();
    const cellCenter = rect.left + rect.width / 2;
    const distance = Math.abs(cellCenter - centerX);
    if (distance < minDistance) {
      minDistance = distance;
      winner = { element: cell, absoluteIndex, itemIndex: Number(cell.dataset.itemIndex) || 0 };
    }
  });
  return winner;
}

function renderRouletteResult(item) {
  if (!rouletteText) return;
  rouletteText.innerHTML = `<span class="roulette-result-tag">${item.label}</span><span>${item.text}</span>`;
}

function openLawModal(item) {
  if (!modalElement || !modalLaw || !modalLead || !modalBullets || !modalCode || !modalLabel || !modalVerdict || !window.bootstrap) return;
  modalLaw.textContent = item.law;
  modalLead.textContent = item.text;
  modalCode.textContent = `Los #${item.code}`;
  modalLabel.textContent = item.label;
  modalBullets.innerHTML = item.bullets.map((bullet) => `<li>${bullet}</li>`).join('');
  modalVerdict.textContent = `Tahle položka tu je proto, že se tváří jako pravidlo, ale zní spíš jako nápad sepsaný ve chvíli, kdy už všem dávno došla trpělivost.`;
  if (!lawModal) lawModal = new window.bootstrap.Modal(modalElement);
  lawModal.show();
}

function snapToCenteredSegment(centered) {
  if (!centered) return;
  currentCellIndex = centered.absoluteIndex;
  setTrackPosition(currentCellIndex, false);
}

function setupRoulette() {
  if (!rouletteTrack || !rouletteViewport) return;
  buildTrack();
  segmentWidth = measureSegmentWidth();
  currentCellIndex = rouletteItems.length * 4;
  setTrackPosition(currentCellIndex, false);
  clearActiveSegments();
}

function spinRoulette() {
  if (!rouletteBtn || !rouletteTrack || !rouletteViewport || spinning) return;
  spinning = true;
  rouletteBtn.disabled = true;
  rouletteTrack.classList.add('roulette-track-spinning');
  clearActiveSegments();
  getAudioCtx();
  playSpinSound(5.4);

  segmentWidth = measureSegmentWidth();
  const targetItemIndex = Math.floor(Math.random() * rouletteItems.length);
  const jumps = 30 + Math.floor(Math.random() * 12);
  const targetCellIndex = currentCellIndex + jumps + ((targetItemIndex - (currentCellIndex % rouletteItems.length) + rouletteItems.length) % rouletteItems.length);

  requestAnimationFrame(() => setTrackPosition(targetCellIndex, true));

  window.setTimeout(() => {
    const centered = getCenteredSegment();
    if (centered) {
      centered.element.classList.add('roulette-segment-active');
      snapToCenteredSegment(centered);
      const picked = rouletteItems[centered.itemIndex];
      renderRouletteResult(picked);
      playWinSound();
      rouletteTrack.classList.remove('roulette-track-spinning');
      rouletteBtn.disabled = false;
      spinning = false;
      window.setTimeout(() => openLawModal(picked), 220);
      return;
    }

    // fallback if geometry lookup fails
    currentCellIndex = targetCellIndex;
    const picked = rouletteItems[targetItemIndex];
    renderRouletteResult(picked);
    playWinSound();
    rouletteTrack.classList.remove('roulette-track-spinning');
    rouletteBtn.disabled = false;
    spinning = false;
    window.setTimeout(() => openLawModal(picked), 220);
  }, 5500);
}

if (rouletteTrack && rouletteViewport) {
  setupRoulette();
  window.addEventListener('resize', setupRoulette);
}

if (rouletteBtn) rouletteBtn.addEventListener('click', spinRoulette);

const revealTargets = document.querySelectorAll('.section-intro, .law-card, .quote-card, .evidence-panel, .timeline-shell, .roulette-box, .accordion-item, .hero-poster, .hero-stats .stat-card, .freak-card');
revealTargets.forEach((el) => el.classList.add('reveal-up'));
const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.14 });
revealTargets.forEach((el) => observer.observe(el));
