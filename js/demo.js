/* ============================================================
   SMART CLASSROOM — NLP Demo Engine  (demo.html)
   ============================================================ */

/* ---- Mock data bank ---- */
const MOCK_RESPONSES = {
  disengaged: {
    summary: "3 students showed significant disengagement during today's session (2nd period, 10:00–11:00 AM). Disengagement peaked during the 30-minute lecture block around 10:25 AM.",
    students: [
      { name: 'Riya Sharma',   metric: '12% attention',  badge: 'low',    color: '#ef4444' },
      { name: 'Arjun Mehta',   metric: '18% attention',  badge: 'low',    color: '#f97316' },
      { name: 'Priya Patel',   metric: '27% attention',  badge: 'medium', color: '#facc15' },
    ]
  },
  attention: {
    summary: "Average class attention was 68% today — 5% above baseline. Attention peaked during the group activity (10:45 AM) and dipped during the video playback segment.",
    students: [
      { name: 'Aryan Kumar',   metric: '94% attention',  badge: 'high',   color: '#22c55e' },
      { name: 'Sneha Rao',     metric: '89% attention',  badge: 'high',   color: '#22c55e' },
      { name: 'Dev Nair',      metric: '71% attention',  badge: 'medium', color: '#facc15' },
      { name: 'Kriti Verma',   metric: '63% attention',  badge: 'medium', color: '#facc15' },
    ]
  },
  emotion: {
    summary: "Dominant emotions detected: Focused (42%), Neutral (31%), Confused (15%), Bored (12%). Confusion spiked during the algebra explanation — consider revisiting that topic.",
    students: [
      { name: 'Aditya Joshi',  metric: 'Confused (high)',  badge: 'low',    color: '#a855f7' },
      { name: 'Meera Singh',   metric: 'Focused (high)',   badge: 'high',   color: '#22c55e' },
      { name: 'Raj Patel',     metric: 'Bored (medium)',   badge: 'medium', color: '#f97316' },
    ]
  },
  participation: {
    summary: "12 students participated verbally today. Top participants spoke for an average of 4.2 minutes. 8 students had zero verbal participation — these students may need additional encouragement.",
    students: [
      { name: 'Priya Das',     metric: '7.1 min speaking',  badge: 'high',   color: '#22c55e' },
      { name: 'Rohan Gupta',   metric: '5.8 min speaking',  badge: 'high',   color: '#22c55e' },
      { name: 'Tanvi Shah',    metric: '0 min speaking',    badge: 'low',    color: '#ef4444' },
      { name: 'Karan Mehta',   metric: '0 min speaking',    badge: 'low',    color: '#ef4444' },
    ]
  },
  summary: {
    summary: "Today's session (Class 10-B, Mathematics) ran for 58 minutes. Engagement score: 72/100 — Good. Key highlights: strong participation in group work, confusion around quadratic equations, 3 students chronically disengaged.",
    students: [
      { name: 'Overall Class',  metric: '72% engagement',    badge: 'high',   color: '#3b82f6' },
      { name: 'Engagement',     metric: '68% attention',     badge: 'medium', color: '#facc15' },
      { name: 'Participation',  metric: '60% verbal',        badge: 'medium', color: '#f97316' },
    ]
  }
};

/* Map keyword → response key */
const KEYWORD_MAP = [
  { keys: ['disengage', 'disengaged', 'disengagement', 'lost', 'off task', 'distracted'], key: 'disengaged' },
  { keys: ['attention', 'attentive', 'focus', 'focused', 'paying attention'],              key: 'attention'  },
  { keys: ['emotion', 'feel', 'feeling', 'mood', 'confused', 'bored', 'happy'],           key: 'emotion'    },
  { keys: ['participat', 'speak', 'verbal', 'talk', 'answer', 'raise'],                   key: 'participation' },
  { keys: ['summary', 'overview', 'report', 'today', 'overall', 'class'],                 key: 'summary'    },
];

const resolveQuery = (query) => {
  const q = query.toLowerCase();
  for (const { keys, key } of KEYWORD_MAP) {
    if (keys.some(k => q.includes(k))) return key;
  }
  return 'summary'; // default
};

/* ---- DOM references ---- */
const queryInput    = document.getElementById('queryInput');
const getReportBtn  = document.getElementById('getReportBtn');
const clearBtn      = document.getElementById('clearBtn');
const resultStatus  = document.getElementById('resultStatus');
const resultEmpty   = document.getElementById('resultEmpty');
const resultLoading = document.getElementById('resultLoading');
const resultContent = document.getElementById('resultContent');
const resultSummaryText  = document.getElementById('resultSummaryText');
const studentRowsEl = document.getElementById('studentRows');
const historyList   = document.getElementById('historyList');

let queryHistory = [
  { q: 'Which students were disengaged today?',     time: '10:42 AM' },
  { q: 'What was the average attention score?',     time: '10:38 AM' },
  { q: 'Show me emotions for Period 2.',            time: '10:30 AM' },
];

/* ---- Render history ---- */
const renderHistory = () => {
  if (!historyList) return;
  historyList.innerHTML = queryHistory.map(h => `
    <div class="history-item" onclick="useHistoryQuery(${JSON.stringify(h.q)})">
      <div class="history-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
        </svg>
      </div>
      <div>
        <div class="history-q">${h.q}</div>
        <div class="history-time">${h.time}</div>
      </div>
    </div>
  `).join('');
};
renderHistory();

window.useHistoryQuery = (q) => {
  if (queryInput) queryInput.value = q;
  queryInput?.focus();
};

/* ---- Render result (accepts a data object directly) ---- */
const BADGE_LABELS = { low: 'Low', medium: 'Medium', high: 'High' };

const renderResult = (data) => {
  resultSummaryText.textContent = data.summary;

  studentRowsEl.innerHTML = data.students.map(s => `
    <div class="student-row">
      <div class="student-avatar" style="background:${s.color}">
        ${s.name.split(' ').map(w => w[0]).join('').slice(0,2)}
      </div>
      <div class="student-name">${s.name}</div>
      <div class="student-metric">${s.metric}</div>
      <div class="student-badge badge-${s.badge}">${BADGE_LABELS[s.badge]}</div>
    </div>
  `).join('');
};

/* ---- Set loading / done status ---- */
const setStatus = (state) => {
  resultStatus.className = `result-status ${state}`;
  const dot = '<div class="result-status-dot"></div>';
  const labels = { idle: 'Idle', loading: 'Processing…', done: 'Report Ready' };
  resultStatus.innerHTML = `${dot} ${labels[state]}`;
};

/* ---- localStorage helpers ---- */
const REPORTS_KEY = 'smartclass_saved_reports';

const saveReportToStorage = (query, responseKey, data) => {
  try {
    const reports = JSON.parse(localStorage.getItem(REPORTS_KEY) || '[]');
    const now = new Date();
    reports.unshift({
      id:       Date.now(),
      query,
      responseKey,
      summary:  data.summary,
      students: data.students || [],
      savedAt:  now.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }),
      timestamp: now.getTime(),
    });
    // Keep last 20 reports
    if (reports.length > 20) reports.pop();
    localStorage.setItem(REPORTS_KEY, JSON.stringify(reports));
    // Notify page to re-render saved reports list
    if (typeof window.onReportSaved === 'function') window.onReportSaved();
  } catch (e) {
    console.warn('[demo] Could not save report:', e);
  }
};

/* ---- Read camera session from localStorage ---- */
const loadCameraSession = () => {
  try {
    const raw = localStorage.getItem('smartclass_camera_session');
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
};

/* ---- Build response using real camera session if available ---- */
const buildResponse = (responseKey) => {
  const camSession = loadCameraSession();
  if (!camSession) return MOCK_RESPONSES[responseKey];

  // Enrich mock response summary with real numbers
  const dom    = camSession.dominantEmotion || 'neutral';
  const att    = camSession.avgAttention    || 0;
  const dur    = Math.round((camSession.durationSeconds || 0) / 60);
  const share  = camSession.emotionShare    || {};

  const enrichedSummaries = {
    disengaged:    `Based on your ${dur}-min live session: average attention was ${att}%. Dominant emotion detected: ${dom}. ${att < 50 ? '⚠️ Significant disengagement detected — see breakdown below.' : 'Engagement levels were acceptable.'}`,
    attention:     `Live session (${dur} min): overall average attention score was ${att}%. Dominant detected emotion: ${dom}. ${att >= 70 ? '🟢 Strong engagement.' : att >= 45 ? '🟡 Moderate — consider breaking up lecture.' : '🔴 Low attention — immediate intervention recommended.'}`,
    emotion:       `Live emotion breakdown from your ${dur}-min session — dominant: ${dom} (${share[dom] || 0}%). Happy: ${share.happy||0}%, Neutral: ${share.neutral||0}%, Sad: ${share.sad||0}%, Angry: ${share.angry||0}%, Surprised: ${share.surprised||0}%.`,
    participation: `Session ran for ${dur} minutes. Avg attention ${att}%. Dominant emotion: ${dom}. Participation analysis is pending voice transcription integration — verbal data not yet captured.`,
    summary:       `Live session summary (${dur} min): Avg attention ${att}% • Dominant emotion: ${dom} • Happy: ${share.happy||0}% • Neutral: ${share.neutral||0}% • Sad: ${share.sad||0}%. ${att >= 70 ? 'Overall: Good engagement.' : att >= 45 ? 'Overall: Moderate engagement.' : 'Overall: Low engagement — action needed.'}`,
  };

  const base = MOCK_RESPONSES[responseKey];
  return {
    summary:  enrichedSummaries[responseKey] || base.summary,
    students: base.students,  // still mock until face-ID per student is implemented
  };
};

/* ---- Run query ---- */
const runQuery = () => {
  const raw = queryInput?.value.trim();
  if (!raw) { queryInput?.focus(); return; }

  const responseKey = resolveQuery(raw);

  // Update button to loading state
  getReportBtn.disabled = true;
  getReportBtn.innerHTML = '<div class="spinner"></div> Analyzing…';

  // Show loading
  resultEmpty.style.display   = 'none';
  resultContent.classList.remove('visible');
  resultLoading.classList.add('visible');
  setStatus('loading');

  setTimeout(() => {
    // Done
    resultLoading.classList.remove('visible');
    const responseData = buildResponse(responseKey);
    renderResult(responseData);
    resultContent.classList.add('visible');
    setStatus('done');
    getReportBtn.disabled = false;
    getReportBtn.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
      </svg>
      Get Report`;

    // ✅ Save report to localStorage
    saveReportToStorage(raw, responseKey, responseData);

    // Push to in-session history
    const now = new Date();
    const time = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    queryHistory.unshift({ q: raw, time });
    if (queryHistory.length > 6) queryHistory.pop();
    renderHistory();
  }, 1400);
};


/* ---- Event listeners ---- */
window.runQuery = runQuery; // expose for inline onclick handlers
getReportBtn?.addEventListener('click', runQuery);

queryInput?.addEventListener('keydown', e => {
  if (e.key === 'Enter') runQuery();
});

clearBtn?.addEventListener('click', () => {
  if (queryInput) queryInput.value = '';
  resultEmpty.style.display   = '';
  resultContent.classList.remove('visible');
  resultLoading.classList.remove('visible');
  setStatus('idle');
  queryInput?.focus();
});

/* ---- Suggestion chips ---- */
document.querySelectorAll('.suggestion-chip').forEach(chip => {
  chip.addEventListener('click', () => {
    if (queryInput) queryInput.value = chip.dataset.query;
    queryInput?.focus();
  });
});
