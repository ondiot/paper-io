import {
  IMAGE_ASSETS,
  AUDIO_ASSETS,
  FONT_ASSETS,
} from "./assets";

/*
 * Load one image.
 */
function preloadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();

    img.onload = () => {
      resolve({
        src,
        type: "image",
        success: true,
      });
    };

    img.onerror = () => {
      console.warn(
        `Could not preload image: ${src}`
      );

      resolve({
        src,
        type: "image",
        success: false,
      });
    };

    img.src = src;
  });
}


/*
 * Load one audio file.
 *
 * We use preload="auto", but don't attempt
 * to play anything because browsers can block
 * autoplay.
 */
function preloadAudio(src) {
  return new Promise((resolve) => {
    const audio = new Audio();

    audio.preload = "auto";

    const done = (success) => {
      resolve({
        src,
        type: "audio",
        success,
      });
    };

    audio.addEventListener(
      "canplaythrough",
      () => done(true),
      { once: true }
    );

    audio.addEventListener(
      "error",
      () => {
        console.warn(
          `Could not preload audio: ${src}`
        );

        done(false);
      },
      { once: true }
    );

    audio.src = src;
    audio.load();
  });
}


/*
 * Load one font.
 */
async function preloadFont(src) {
  if (!document.fonts) {
    return {
      src,
      type: "font",
      success: true,
    };
  }

  try {
    const font = new FontFace(
      `paperio-preload-${src}`,
      `url("${src}")`
    );

    await font.load();

    document.fonts.add(font);

    return {
      src,
      type: "font",
      success: true,
    };
  } catch (error) {
    console.warn(
      `Could not preload font: ${src}`
    );

    return {
      src,
      type: "font",
      success: false,
    };
  }
}


/*
 * Preload EVERYTHING.
 *
 * onProgress receives:
 *
 * {
 *   loaded: 5,
 *   total: 20,
 *   percent: 25
 * }
 */
export async function preloadAllAssets(
  onProgress
) {
  const total =
    IMAGE_ASSETS.length +
    AUDIO_ASSETS.length +
    FONT_ASSETS.length;

  if (total === 0) {
    onProgress?.({
      loaded: 0,
      total: 0,
      percent: 100,
    });

    return;
  }

  let loaded = 0;

  const updateProgress = () => {
    loaded += 1;

    onProgress?.({
      loaded,
      total,
      percent: Math.round(
        (loaded / total) * 100
      ),
    });
  };

  const tasks = [
    ...IMAGE_ASSETS.map((src) =>
      preloadImage(src).then(updateProgress)
    ),

    ...AUDIO_ASSETS.map((src) =>
      preloadAudio(src).then(updateProgress)
    ),

    ...FONT_ASSETS.map((src) =>
      preloadFont(src).then(updateProgress)
    ),
  ];

  await Promise.all(tasks);

  onProgress?.({
    loaded: total,
    total,
    percent: 100,
  });
}