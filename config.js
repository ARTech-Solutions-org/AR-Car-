// ============================================================
//  MG7 Photobooth + WebAR — Global Configuration
//  Edit this file to configure your deployment.
// ============================================================

const CONFIG = {
  // ── Gemini Imagen API ───────────────────────────────────────
  // Note: Loaded from environment variables (.env) when available
  GEMINI_API_KEY: (typeof process !== "undefined" && process.env && process.env.GEMINI_API_KEY)
    ? process.env.GEMINI_API_KEY
    : "AIzaSyBQzMKQ0BX0DlP_hqPzrBxzywo8kYJOBaE",

  // ── TEST MODE ────────────────────────────────────────────────
  // Set to true to skip the AI call and always show the test portrait.
  // Set back to false when you are done testing.
  TEST_MODE: false,

  // ── Gemini Models ───────────────────────────────────────────
  // Image generation model. Options:
  // "imagen-4.0-fast-generate-001" (Fastest, default)
  // "imagen-4.0-generate-001"      (Highest quality, slower)
  IMAGE_MODEL: (typeof process !== "undefined" && process.env && process.env.IMAGE_MODEL)
    ? process.env.IMAGE_MODEL
    : "imagen-4.0-fast-generate-001",

  // ── AR Experience URL ───────────────────────────────────────
  get AR_URL() {
    if (typeof window !== "undefined" && window.location && window.location.origin && window.location.origin !== "null") {
      return `${window.location.origin}/ar/index.html`;
    }
    return (typeof process !== "undefined" && process.env && process.env.AR_URL)
      ? process.env.AR_URL
      : "https://10.10.8.236:8443/ar/index.html";
  },

  // ── Car / Event Config ──────────────────────────────────────
  CAR_MODEL: "MG7",
  EVENT_NAME: "MG Experience",

  // ── Image Prompt ───────────────────────────────────────────
  // The person's photo is sent as a SUBJECT reference — Imagen will keep
  // their exact face, hair, and clothing and place them in this new scene.
  get IMAGE_PROMPT() {
    return `Hyper-realistic futuristic luxury automotive tech showroom background.

BACKGROUND SCENE: 
- A sleek ${this.CAR_MODEL} sedan in pearl metallic silver is positioned prominently in the center at a slight 3/4 angle. The MG logo is clearly visible on the front grille. Realistic metallic paint, sharp LED headlights, premium body lines.
- Floor: ultra-glossy dark reflective tiles showing perfect mirror reflections of the car and ceiling lights with warm amber glow
- Ceiling: structural black industrial grid ceiling with bright cool-white LED strip lights arranged in parallel lines and dome security cameras mounted at corners
- Left and right background walls: large glowing holographic digital screens displaying car blueprint schematics, aerodynamic telemetry data graphs, and car design wireframes in cyan-blue color on dark panels. Multiple alloy wheels and exhaust parts mounted on side walls as display pieces.
- Vertical structural pillars with warm amber/gold neon accent lines running along edges
- Dramatic wide-angle depth perspective making the space feel large and impressive
- Overall color mood: dark background, cool cyan-blue holographic lighting, warm amber floor reflections

LIGHTING: Professional studio lighting highlighting the car with warm amber accent backlighting. Sharp defined shadows. 
CAMERA: 24mm wide-angle lens, vertical 9:16 composition (1080x1920), cinematic color grade with cool blue-teal shadows and warm amber-gold highlights. Empty scene, NO people in the image.`;
  }
};
