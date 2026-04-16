/* ============================================================
   SMART CLASSROOM — Real Emotion Detection Engine
   Uses: face-api.js (locally bundled) + browser webcam
   ============================================================ */

const EmotionEngine = (() => {

  /* ---- State ---- */
  let stream       = null;
  let videoEl      = null;
  let canvasEl     = null;
  let running      = false;
  let intervalId   = null;
  let onUpdateCb   = null;
  let frameCount   = 0;
  let sessionData  = {
    frames:       0,
    startTime:    null,
    emotionTotals: { happy: 0, neutral: 0, surprised: 0, fearful: 0, disgusted: 0, angry: 0, sad: 0 },
    attentionHistory: [],  // rolling window of attention scores
    faces:        [],       // last detected faces
  };

  /* ---- Emotion → Attention mapping ---- */
  const ATTENTION_WEIGHTS = {
    happy:     0.85,
    neutral:   0.70,
    surprised: 0.75,
    fearful:   0.40,
    disgusted: 0.20,
    angry:     0.25,
    sad:       0.30,
  };

  const calcAttention = (expressions) => {
    let score = 0;
    for (const [emotion, weight] of Object.entries(ATTENTION_WEIGHTS)) {
      score += (expressions[emotion] || 0) * weight;
    }
    return Math.round(Math.min(score * 100, 100));
  };

  const dominantEmotion = (expressions) =>
    Object.entries(expressions).sort((a, b) => b[1] - a[1])[0][0];

  /* ---- Load models ---- */
  const loadModels = async (modelPath = '/models') => {
    const opts = { ROOT: modelPath };
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(modelPath),
      faceapi.nets.faceExpressionNet.loadFromUri(modelPath),
      faceapi.nets.faceLandmark68TinyNet.loadFromUri(modelPath),
    ]);
    console.log('[EmotionEngine] Models loaded.');
  };

  /* ---- Start webcam ---- */
  const startCamera = async (videoElement, canvasElement) => {
    videoEl  = videoElement;
    canvasEl = canvasElement;

    stream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
      audio: false,
    });

    videoEl.srcObject = stream;

    await new Promise(resolve => {
      videoEl.onloadedmetadata = () => {
        videoEl.play();
        resolve();
      };
    });

    // Match canvas size to video
    canvasEl.width  = videoEl.videoWidth;
    canvasEl.height = videoEl.videoHeight;

    sessionData.startTime = Date.now();
    console.log('[EmotionEngine] Camera started.');
  };

  /* ---- Stop webcam ---- */
  const stopCamera = () => {
    clearInterval(intervalId);
    running = false;
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
      stream = null;
    }
    if (videoEl) videoEl.srcObject = null;
    console.log('[EmotionEngine] Camera stopped.');
  };

  /* ---- Detection loop ---- */
  const startDetection = (intervalMs = 600) => {
    if (running) return;
    running   = true;
    intervalId = setInterval(() => _detectFrame(), intervalMs);
    console.log('[EmotionEngine] Detection loop started.');
  };

  const _detectFrame = async () => {
    if (!videoEl || videoEl.paused || videoEl.ended) return;

    const detectorOpts = new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.4 });

    const detections = await faceapi
      .detectAllFaces(videoEl, detectorOpts)
      .withFaceLandmarks(true)   // tiny landmarks
      .withFaceExpressions();

    /* ---- Draw overlays on canvas ---- */
    const ctx = canvasEl.getContext('2d');
    ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);

    // Resize detections to match canvas dimensions
    const resized = faceapi.resizeResults(detections, {
      width: canvasEl.width, height: canvasEl.height
    });

    resized.forEach(det => {
      const rawBox = det.detection.box;
      // Mirror x to match scaleX(-1) on the video element
      const box = {
        x:      canvasEl.width - rawBox.x - rawBox.width,
        y:      rawBox.y,
        width:  rawBox.width,
        height: rawBox.height,
      };
      const expr = det.expressions;
      const dom  = dominantEmotion(expr);
      const att  = calcAttention(expr);
      const conf = Math.round(det.detection.score * 100);

      /* Box */
      const colourMap = {
        happy: '#22c55e', neutral: '#3b82f6', surprised: '#f59e0b',
        fearful: '#a855f7', disgusted: '#06b6d4', angry: '#ef4444', sad: '#6366f1',
      };
      const colour = colourMap[dom] || '#60a5fa';

      ctx.strokeStyle = colour;
      ctx.lineWidth   = 2.5;
      ctx.shadowColor = colour;
      ctx.shadowBlur  = 8;
      ctx.strokeRect(box.x, box.y, box.width, box.height);
      ctx.shadowBlur  = 0;

      /* Label background */
      const label     = `${dom.toUpperCase()}  ${att}% attention`;
      const fontSize  = Math.max(11, Math.round(box.width * 0.09));
      ctx.font        = `600 ${fontSize}px Inter, sans-serif`;
      const textW     = ctx.measureText(label).width;
      const padX = 10, padY = 6;

      ctx.fillStyle   = colour;
      ctx.globalAlpha = 0.88;
      const rx = box.x, ry = box.y - fontSize - padY * 2 - 2;
      _roundRect(ctx, rx, ry, textW + padX * 2, fontSize + padY * 2, 5);
      ctx.fill();
      ctx.globalAlpha = 1;

      /* Label text */
      ctx.fillStyle = '#ffffff';
      ctx.fillText(label, rx + padX, ry + padY + fontSize - 2);

      /* Attention arc */
      const cx = box.x + box.width - 20;
      const cy = box.y + 20;
      const r  = 16;
      ctx.strokeStyle = 'rgba(255,255,255,0.2)';
      ctx.lineWidth   = 3;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = colour;
      ctx.beginPath(); ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + (att / 100) * Math.PI * 2); ctx.stroke();
    });

    /* ---- Accumulate session stats ---- */
    frameCount++;
    sessionData.frames = frameCount;

    if (detections.length > 0) {
      const aggExpr = {};
      for (const emotion of Object.keys(ATTENTION_WEIGHTS)) aggExpr[emotion] = 0;
      detections.forEach(d => {
        for (const [e, v] of Object.entries(d.expressions)) {
          if (aggExpr[e] !== undefined) aggExpr[e] += v / detections.length;
        }
      });
      for (const emotion of Object.keys(ATTENTION_WEIGHTS)) {
        sessionData.emotionTotals[emotion] += aggExpr[emotion];
      }
      const avgAtt = calcAttention(aggExpr);
      sessionData.attentionHistory.push(avgAtt);
      if (sessionData.attentionHistory.length > 60) sessionData.attentionHistory.shift();
      sessionData.faces = detections;
    }

    /* ---- Emit update ---- */
    if (onUpdateCb) {
      onUpdateCb({
        faceCount:   detections.length,
        faces:       detections.map(d => ({
          dominant:  dominantEmotion(d.expressions),
          attention: calcAttention(d.expressions),
          expressions: d.expressions,
        })),
        avgAttention: sessionData.attentionHistory.length
          ? Math.round(sessionData.attentionHistory.reduce((a, b) => a + b, 0) / sessionData.attentionHistory.length)
          : 0,
        emotionShare: _normaliseTotals(sessionData.emotionTotals, frameCount),
        sessionDuration: Math.round((Date.now() - sessionData.startTime) / 1000),
        frameCount,
      });
    }
  };

  /* ---- Normalise running totals → percentages ---- */
  const _normaliseTotals = (totals, frames) => {
    if (frames === 0) return totals;
    const out = {};
    const sum = Object.values(totals).reduce((a, b) => a + b, 0) || 1;
    for (const [k, v] of Object.entries(totals)) {
      out[k] = Math.round((v / sum) * 100);
    }
    return out;
  };

  /* ---- Rounded rect helper ---- */
  const _roundRect = (ctx, x, y, w, h, r) => {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  };

  /* ---- Get session summary (for NLP) ---- */
  const getSessionSummary = () => {
    const share  = _normaliseTotals(sessionData.emotionTotals, frameCount);
    const avgAtt = sessionData.attentionHistory.length
      ? Math.round(sessionData.attentionHistory.reduce((a, b) => a + b, 0) / sessionData.attentionHistory.length)
      : 0;
    return {
      avgAttention:   avgAtt,
      emotionShare:   share,
      dominantEmotion: Object.entries(share).sort((a,b)=>b[1]-a[1])[0]?.[0] ?? 'unknown',
      durationSeconds: sessionData.startTime ? Math.round((Date.now() - sessionData.startTime) / 1000) : 0,
      totalFrames:    frameCount,
      attentionHistory: [...sessionData.attentionHistory],
    };
  };

  /* ---- Public API ---- */
  return {
    loadModels,
    startCamera,
    stopCamera,
    startDetection,
    stopDetection: () => { clearInterval(intervalId); running = false; },
    onUpdate: (cb) => { onUpdateCb = cb; },
    isRunning: () => running,
    getSessionSummary,
  };

})();
