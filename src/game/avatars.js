const AVATAR_BASE = `${import.meta.env.BASE_URL}assets/avatars/`;

export const AVATARS = [
  "saymyname.png",
  "cho.png",
  "ravi.png",
  "subhu.png",
  "house.png",
  "lawyer.png",
  "girl.png",
  "what.png",
  "jane.png",
  "wojack.png",
  "poet.png",
  "dexter.png"
];

export function avatarMarkup(avatar, className = "avatar-svg") {
  if (typeof avatar === "string") {
    const safeName = avatar.split("/").pop();
    const extension = safeName.split(".").pop().toLowerCase();

    const supportedFormats = [
      "svg",
      "jpg",
      "jpeg",
      "png",
      "gif",
      "webp"
    ];

    if (
      supportedFormats.includes(extension) &&
      AVATARS.includes(safeName)
    ) {
      return `
        <img
          class="${className}"
          src="${AVATAR_BASE}${safeName}"
          alt=""
          draggable="false"
        >
      `;
    }
  }

  return `<span class="${className} avatar-fallback">${avatar || "?"}</span>`;
}