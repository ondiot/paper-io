import { IMAGE_ASSETS, AUDIO_ASSETS, FONT_ASSETS } from "./assets";

const imageCache = new Map();
const audioCache = new Map();

function preloadImage(src) {
  if (imageCache.has(src)) return Promise.resolve({ src, type: "image", success: true });

  return new Promise((resolve) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => {
      imageCache.set(src, img);
      resolve({ src, type: "image", success: true });
    };
    img.onerror = () => resolve({ src, type: "image", success: false });
    img.src = src;
  });
}

function preloadAudio(src) {
  if (audioCache.has(src)) return Promise.resolve({ src, type: "audio", success: true });

  return new Promise((resolve) => {
    const audio = new Audio();
    audio.preload = "auto";
    const finish = (success) => {
      if (success) audioCache.set(src, audio);
      resolve({ src, type: "audio", success });
    };
    audio.addEventListener("canplaythrough", () => finish(true), { once: true });
    audio.addEventListener("error", () => finish(false), { once: true });
    audio.src = src;
    audio.load();
  });
}

async function preloadFont(src) {
  if (!document.fonts) return { src, type: "font", success: true };
  try {
    const font = new FontFace(`paperio-preload-${src}`, `url("${src}")`);
    await font.load();
    document.fonts.add(font);
    return { src, type: "font", success: true };
  } catch {
    return { src, type: "font", success: false };
  }
}

export async function preloadAllAssets(onProgress) {
  const tasks = [
    ...IMAGE_ASSETS.map((src) => () => preloadImage(src)),
    ...AUDIO_ASSETS.map((src) => () => preloadAudio(src)),
    ...FONT_ASSETS.map((src) => () => preloadFont(src)),
  ];

  if (!tasks.length) {
    onProgress?.({ loaded: 0, total: 0, percent: 100 });
    return;
  }

  let loaded = 0;
  const total = tasks.length;
  const update = () => {
    loaded += 1;
    onProgress?.({ loaded, total, percent: Math.round((loaded / total) * 100) });
  };

  /* Small batches avoid a burst of decoding work on low-end devices. */
  const batchSize = 6;
  for (let i = 0; i < tasks.length; i += batchSize) {
    await Promise.all(tasks.slice(i, i + batchSize).map((task) => task().then(update)));
  }

  onProgress?.({ loaded: total, total, percent: 100 });
}
