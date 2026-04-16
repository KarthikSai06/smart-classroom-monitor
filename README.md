<div align="center">

<img src="https://img.shields.io/badge/AI-Powered-2563eb?style=for-the-badge&logo=openai&logoColor=white" alt="AI Powered" />
<img src="https://img.shields.io/badge/face--api.js-Real--Time-22c55e?style=for-the-badge&logo=javascript&logoColor=white" alt="face-api.js" />
<img src="https://img.shields.io/badge/Privacy-FERPA%20%26%20GDPR-a855f7?style=for-the-badge&logo=shield&logoColor=white" alt="Privacy" />
<img src="https://img.shields.io/badge/License-MIT-f59e0b?style=for-the-badge" alt="MIT License" />

# 🎓 Smart Classroom Engagement Analyzer

**An AI-powered, browser-native platform that turns a webcam into a real-time student engagement engine — giving teachers instant, actionable insights without disrupting the learning experience.**

[Live Demo](https://karthiksai06.github.io/smart-classroom-monitor) · [Features](#-features) · [Models](#-ai-models--how-they-work) · [Architecture](#-architecture) · [Getting Started](#-getting-started)

</div>

---

## 📸 Screenshots

| Landing Page | Live Camera Engine | NLP Query Demo |
|:---:|:---:|:---:|
| Real-time dashboard with engagement overview | Webcam emotion detection with bounding boxes | Natural language teacher query interface |

---

## ✨ Overview

Smart Classroom Engagement Analyzer is a fully **client-side** web application that uses three lightweight, pre-trained neural networks (bundled locally) to:

1. **Detect faces** in a live webcam stream
2. **Predict facial expressions** (7 emotion classes) in real time
3. **Compute per-frame attention scores** from emotion weights
4. **Persist session data** to `localStorage` so the NLP Demo can enrich reports with real numbers

No server required. No data ever leaves the browser. Works offline after initial load.

---

## 🚀 Features

| Feature | Description |
|---|---|
| 🎥 **Live Camera Engine** | Real-time webcam processing at ~600 ms intervals with bounding-box overlays |
| 😊 **7-Emotion Classification** | happy · neutral · surprised · fearful · disgusted · angry · sad |
| 📊 **Attention Scoring** | Weighted emotion-to-attention formula gives a 0–100% score per face |
| 💬 **NLP Query Interface** | Plain-English questions return structured engagement reports |
| 🧠 **Session Memory** | Camera session exported to `localStorage`; NLP Demo ingests live data |
| 📝 **Report Persistence** | Last 20 NLP reports saved to `localStorage` for later review |
| 🔒 **Privacy-First** | All processing is on-device; no video/audio ever transmitted |
| 📱 **Responsive Design** | Mobile-friendly dark/light UI with smooth micro-animations |

---

## 🤖 AI Models & How They Work

The platform bundles **three neural network models** from the [`face-api.js`](https://github.com/justadudewhohacks/face-api.js) library. All weights are stored locally in the `/models` directory — no CDN or API key required.

---

### 1. 🔍 Tiny Face Detector — `tiny_face_detector_model`

| Property | Value |
|---|---|
| **Architecture** | Lightweight single-shot CNN (custom MobileNet-inspired) |
| **Task** | Locate all faces in a video frame and return bounding boxes |
| **Input Size** | 224 × 224 px (configurable) |
| **Score Threshold** | 0.4 (filters low-confidence detections) |
| **Model Size** | ~190 KB (shard1) |
| **Files** | `tiny_face_detector_model-shard1`, `tiny_face_detector_model-weights_manifest.json` |

**How it works:**

The Tiny Face Detector is a compact convolutional neural network trained to perform **object detection** for human faces. It divides the input frame into a grid and predicts the probability and bounding-box coordinates of a face in each cell. Unlike heavier models (e.g., SSD with ResNet-34), it sacrifices some accuracy for dramatic speed improvements — making it suitable for real-time browser inference at 15–30 fps.

```
Input Frame (224×224)
       │
  ┌────▼────────────────────┐
  │  Conv Layers (feature   │
  │  extraction backbone)   │
  └────┬────────────────────┘
       │ Feature Map
  ┌────▼────────────────────┐
  │  Detection Head         │
  │  (class prob + bbox)    │
  └────┬────────────────────┘
       │
  Bounding Boxes + Scores → filter by scoreThreshold (0.4)
```

---

### 2. 🗺️ Face Landmark 68 Tiny Net — `face_landmark_68_tiny_model`

| Property | Value |
|---|---|
| **Architecture** | Tiny CNN regression network |
| **Task** | Predict 68 facial landmark keypoints (eyes, nose, mouth, jaw) |
| **Output** | 68 × (x, y) coordinate pairs, normalised to bounding box |
| **Model Size** | ~75 KB (shard1) |
| **Files** | `face_landmark_68_tiny_model-shard1`, `face_landmark_68_tiny_model-weights_manifest.json` |

**How it works:**

Once a face bounding box is detected, this model takes the **cropped face region** as input and regresses to the locations of 68 standard facial landmarks following the iBUG 300-W scheme. These keypoints mark the corners of the eyes, eyebrow arches, nostril tips, lip borders, and jaw outline.

In this application, landmarks are used to:
- **Align** the face before expression classification (improves accuracy)
- Enable future features like **gaze estimation** (where is the student looking?)
- Enable future **head-pose detection** (is the student turned away?)

```
Cropped Face (from detector)
       │
  ┌────▼────────────────────┐
  │  CNN regression layers  │
  └────┬────────────────────┘
       │
  68 (x, y) landmarks
  e.g. left_eye_outer = (0.22, 0.34)
```

---

### 3. 😊 Face Expression Net — `face_expression_model`

| Property | Value |
|---|---|
| **Architecture** | Compact CNN classifier (inspired by MobileNetV2) |
| **Task** | Multi-class emotion classification from aligned face crops |
| **Output Classes** | neutral · happy · sad · angry · fearful · disgusted · surprised |
| **Output** | Probability distribution (softmax) summing to 1.0 |
| **Model Size** | ~330 KB (shard1) |
| **Files** | `face_expression_model-shard1`, `face_expression_model-weights_manifest.json` |

**How it works:**

The Expression Net receives a **68-landmark-aligned** face crop and passes it through a series of convolutional, batch normalisation, and pooling layers. The final fully connected layer + softmax activation produces a probability for each of the 7 emotion categories.

Example output for an attentive student:
```json
{
  "neutral":    0.61,
  "happy":      0.27,
  "surprised":  0.07,
  "sad":        0.03,
  "fearful":    0.01,
  "disgusted":  0.01,
  "angry":      0.00
}
```

---

### 🧮 Attention Score Formula

The raw expression probabilities are converted to a single **attention score (0–100%)** using a handcrafted weighting table that maps emotions to engagement likelihood:

```javascript
const ATTENTION_WEIGHTS = {
  happy:     0.85,   // engaged, positive affect
  neutral:   0.70,   // default attentive state
  surprised: 0.75,   // reacting to content
  fearful:   0.40,   // anxious, partially disengaged
  disgusted: 0.20,   // strong disengagement signal
  angry:     0.25,   // frustration, disengaged
  sad:       0.30,   // low energy, likely disengaged
};

attentionScore = Σ (expression_probability × weight) × 100
```

This is applied **per-face per-frame**, averaged across all detected faces, and tracked in a rolling 60-frame window to produce a smooth session timeline.

---

### 🔗 Full Inference Pipeline

```
Webcam Frame (every 600 ms)
         │
         ▼
┌─────────────────────┐
│  Tiny Face Detector │  → bounding boxes [x, y, w, h]
└─────────────────────┘
         │
         ▼
┌─────────────────────────┐
│  Face Landmark 68 Tiny  │  → 68 keypoints per face
└─────────────────────────┘
         │ (aligned crop)
         ▼
┌─────────────────────┐
│  Face Expression    │  → {happy: 0.27, neutral: 0.61, ...}
│  Net                │
└─────────────────────┘
         │
         ▼
┌──────────────────────────────────────┐
│  Attention Score Engine (JS)         │
│  score = Σ(prob × weight) × 100      │
│  Rolling 60-frame average            │
└──────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────┐
│  Canvas Overlay Renderer             │
│  • Coloured bounding box             │
│  • Emotion label + score             │
│  • Arc-style attention meter         │
└──────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────┐
│  Session Summary → localStorage      │
│  {avgAttention, emotionShare, ...}   │
└──────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────┐
│  NLP Demo — enriched report          │
│  "Live session (8 min): avg attn 74% │
│   · Dominant: happy · 🟢 Good"       │
└──────────────────────────────────────┘
```

---

## 🏗️ Architecture

```
smart-classroom-monitor/
├── index.html          # Landing page — hero, how-it-works, stats
├── features.html       # Feature showcase with tech stack pills
├── camera.html         # Live webcam emotion detection engine
├── demo.html           # NLP natural language query interface
│
├── css/
│   ├── style.css       # Full design system (tokens, components, layouts)
│   └── animations.css  # Micro-animations, reveal transitions
│
├── js/
│   ├── main.js         # Navbar scroll, mobile menu, scroll-reveal, counters
│   ├── emotion.js      # EmotionEngine module (face-api.js wrapper)
│   └── demo.js         # NLP Demo engine (keyword resolution, report rendering)
│
├── libs/
│   └── face-api.min.js # Bundled face-api.js v0.22 (offline-capable)
│
└── models/             # Pre-trained neural network weights (local, no CDN)
    ├── tiny_face_detector_model-shard1
    ├── tiny_face_detector_model-weights_manifest.json
    ├── face_landmark_68_tiny_model-shard1
    ├── face_landmark_68_tiny_model-weights_manifest.json
    ├── face_expression_model-shard1
    └── face_expression_model-weights_manifest.json
```

---

## 🛠️ Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| **UI Framework** | Vanilla HTML5 + CSS3 | Zero-dependency, fast load |
| **Styling** | Custom CSS Design System | Tokens, dark mode, glassmorphism |
| **Animations** | CSS `@keyframes` + Intersection Observer | Scroll-reveal, micro-interactions |
| **CV Runtime** | [face-api.js](https://github.com/justadudewhohacks/face-api.js) v0.22 | TensorFlow.js-based face AI |
| **Face Detection** | Tiny Face Detector (CNN) | Real-time bounding boxes |
| **Emotion AI** | Face Expression Net (CNN) | 7-class emotion classification |
| **Landmarks** | Face Landmark 68 Tiny Net | Face alignment for accuracy |
| **Data Layer** | Browser `localStorage` | Session persistence, report history |
| **Fonts** | Google Fonts — Inter, Outfit | Modern, premium typography |
| **Icons** | Hand-crafted SVG | No icon library dependency |

---

## ⚡ Getting Started

### Option 1 — Open directly (recommended for demo)

Since this is a pure client-side app, simply open `index.html` in any modern browser. **No build step. No npm. No server required.**

> ⚠️ For the **Live Camera** page to work, you must serve the files via HTTP (not `file://`) due to browser security restrictions on `getUserMedia`. Use one of the options below.

### Option 2 — Local development server

**Using VS Code Live Server:**
1. Install the [Live Server extension](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer)
2. Right-click `index.html` → **Open with Live Server**

**Using Python:**
```bash
# Python 3
python -m http.server 3000
# Then open http://localhost:3000
```

**Using Node.js:**
```bash
npx serve .
# or
npx http-server . -p 3000
```

### Option 3 — GitHub Pages

The repository is configured for [GitHub Pages](https://pages.github.com/). Enable it under **Settings → Pages → Branch: main → / (root)** and your app will be live at:

```
https://karthiksai06.github.io/smart-classroom-monitor
```

---

## 📖 Pages & Navigation

| Page | URL | Description |
|---|---|---|
| **Home** | `index.html` | Hero, how-it-works steps, stats, CTA |
| **Features** | `features.html` | Detailed feature cards with tech stack |
| **Live Camera** | `camera.html` | Real-time webcam emotion detection |
| **NLP Demo** | `demo.html` | Natural language teacher query interface |

---

## 🔒 Privacy & Compliance

- ✅ **Zero data transmission** — all inference runs in the browser
- ✅ **No raw video stored** — webcam frames are processed in memory and discarded
- ✅ **No cookies** — only anonymous engagement metrics in `localStorage`
- ✅ **FERPA & GDPR aligned** — no personally identifiable biometric data leaves the device
- ✅ **Offline capable** — all models and libraries are bundled locally

---

## 🗺️ Roadmap

- [ ] Per-student face-ID tracking (assign emotion timeline per individual)
- [ ] Whisper ASR integration for verbal participation analysis
- [ ] Export PDF session reports
- [ ] Teacher dashboard with weekly trend charts
- [ ] GPT-4o powered NLP query resolution (replace keyword matching)
- [ ] Multi-classroom cloud aggregator (opt-in)

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

---

## 📄 License

Distributed under the **MIT License**. See `LICENSE` for more information.

---

## 👨‍💻 Author

**KarthikSai06**  
GitHub: [@KarthikSai06](https://github.com/KarthikSai06)

---

<div align="center">

Built with ❤️ for better education

*Empowering teachers with AI-driven classroom insights — improving student outcomes through data, not guesswork.*

</div>
