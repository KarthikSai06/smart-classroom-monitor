/* ============================================================
   SMART CLASSROOM — Firebase / Google Cloud Integration
   Uses: Firebase Firestore via Compat SDK (CDN, no npm needed)
   ============================================================

   ⚠️  SETUP REQUIRED — Replace the placeholder values below
   with YOUR Firebase project config:

   1. Go to https://console.firebase.google.com
   2. Create project → Add web app → copy the config object
   3. Enable Firestore in asia-south1 (or your nearest region)
   4. Set Firestore rules to allow read/write
   ============================================================ */

const firebaseConfig = {
  apiKey:            "AIzaSyA_FXzI1S2BLavcaG9Ri7S-jJr9-_uMTrw",
  authDomain:        "classroom-monitor-ed9b7.firebaseapp.com",
  projectId:         "classroom-monitor-ed9b7",
  storageBucket:     "classroom-monitor-ed9b7.firebasestorage.app",
  messagingSenderId: "612880185204",
  appId:             "1:612880185204:web:b1debb13e18f610e679e21",
  measurementId:     "G-T3LWTV62TQ",
};

/* ---- Initialise (guard against double-init) ---- */
let _fbApp;
try {
  _fbApp = firebase.apps.length
    ? firebase.apps[0]
    : firebase.initializeApp(firebaseConfig);

  window.SmartClassDB  = firebase.firestore();
  window.SmartClassGA  = firebase.analytics();   // Google Analytics
  window.SC_FB_READY   = true;
  console.log('[SmartClassDB] ✅ Firebase Firestore + Analytics connected');
} catch (e) {
  window.SC_FB_READY = false;
  console.warn('[SmartClassDB] ⚠️ Firebase init failed — running in offline mode.', e.message);
}

/* ============================================================
   PUBLIC API (attached to window so all pages can use them)
   ============================================================ */

/**
 * Save an NLP report document to Firestore → "reports" collection.
 * @param {Object} reportObj - { query, responseKey, summary, students, savedAt, timestamp }
 * @returns {string|undefined} Firestore document ID
 */
window.SC_saveReport = async (reportObj) => {
  if (!window.SC_FB_READY) return;
  try {
    const docRef = await window.SmartClassDB.collection('reports').add({
      ...reportObj,
      _serverTime: firebase.firestore.FieldValue.serverTimestamp(),
    });
    console.log('[SmartClassDB] 📄 Report saved to cloud:', docRef.id);
    return docRef.id;
  } catch (e) {
    console.warn('[SmartClassDB] Write failed:', e.message);
  }
};

/**
 * Load the last N reports from Firestore → "reports" collection.
 * @param {number} n - Number of reports to fetch (default 20)
 * @returns {Array} Array of report objects
 */
window.SC_loadReports = async (n = 20) => {
  if (!window.SC_FB_READY) return [];
  try {
    const snap = await window.SmartClassDB
      .collection('reports')
      .orderBy('timestamp', 'desc')
      .limit(n)
      .get();
    return snap.docs.map(d => ({ _id: d.id, ...d.data() }));
  } catch (e) {
    console.warn('[SmartClassDB] Read failed:', e.message);
    return [];
  }
};

/**
 * Save a camera session summary to Firestore → "sessions" collection.
 * @param {Object} sessionObj - { avgAttention, dominantEmotion, emotionShare, durationSeconds, ... }
 * @returns {string|undefined} Firestore document ID
 */
window.SC_saveSession = async (sessionObj) => {
  if (!window.SC_FB_READY) return;
  try {
    const docRef = await window.SmartClassDB.collection('sessions').add({
      ...sessionObj,
      _serverTime: firebase.firestore.FieldValue.serverTimestamp(),
    });
    console.log('[SmartClassDB] 📷 Session saved to cloud:', docRef.id);
    return docRef.id;
  } catch (e) {
    console.warn('[SmartClassDB] Session write failed:', e.message);
  }
};

/**
 * Load the last N camera sessions from Firestore → "sessions" collection.
 * @param {number} n - Number of sessions to fetch (default 10)
 * @returns {Array} Array of session objects
 */
window.SC_loadSessions = async (n = 10) => {
  if (!window.SC_FB_READY) return [];
  try {
    const snap = await window.SmartClassDB
      .collection('sessions')
      .orderBy('_serverTime', 'desc')
      .limit(n)
      .get();
    return snap.docs.map(d => ({ _id: d.id, ...d.data() }));
  } catch (e) {
    console.warn('[SmartClassDB] Sessions read failed:', e.message);
    return [];
  }
};
