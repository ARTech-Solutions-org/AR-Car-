// ============================================================
//  MG7 Photobooth + WebAR — Global Configuration
//  Edit this file to configure your deployment.
// ============================================================

const CONFIG = {
  // ── Gemini Imagen API ───────────────────────────────────────
  // Loaded server-side from environment variables (.env) for security
  GEMINI_API_KEY: (typeof process !== "undefined" && process.env && process.env.GEMINI_API_KEY)
    ? process.env.GEMINI_API_KEY
    : "",

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

  // ── Product / Event Config ──────────────────────────────────
  CAR_MODEL: "Flagship Smartphone",
  EVENT_NAME: "Mobile Experience",
  MODEL_PATH: "/mobile.glb", // ← Put your 3D mobile GLB file in the root folder and set its filename here

  // ── Image Prompt ───────────────────────────────────────────
  // The person's photo is sent as a SUBJECT reference — Gemini will keep
  // their exact face, hair, and clothing and render them holding a phone in a selfie pose.
  get IMAGE_PROMPT() {
    return `Hyper-realistic futuristic luxury mobile technology showroom background.

SUBJECT & POSE:
- The person from the photo is standing confidently in the center of the frame, holding a sleek modern mobile smartphone in a natural selfie position, angled towards the camera.
- Preserve their exact facial features, skin tone, hair color and style, face shape, and clothing with perfect 100% accuracy.

BACKGROUND SCENE: 
- Futuristic flagship mobile tech showroom with glowing neon accents.
- Floor: ultra-glossy dark reflective tiles showing mirror reflections of ambient lights.
- Walls: large glowing holographic screens displaying mobile UI schematics, microchip circuit diagrams, and futuristic tech wireframes in cyan-blue and violet colors.
- Dramatic wide-angle depth perspective making the tech space feel large and impressive.

LIGHTING: Professional studio lighting with cool cyan-blue shadows and warm ambient highlights.
CAMERA: 24mm wide-angle lens, vertical 9:16 composition (1080x1920), cinematic color grade.`;
  }
};
