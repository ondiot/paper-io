import { useState } from "react";
import { AVATARS } from "../game/avatars";

function AvatarPicker({
  selectedAvatar,
  setSelectedAvatar
}) {
  const [index, setIndex] = useState(() => {
    const found = AVATARS.indexOf(selectedAvatar);
    return found >= 0 ? found : 0;
  });

  function previous() {
    const nextIndex =
      (index - 1 + AVATARS.length) % AVATARS.length;

    setIndex(nextIndex);
    setSelectedAvatar(AVATARS[nextIndex]);
  }

  function next() {
    const nextIndex =
      (index + 1) % AVATARS.length;

    setIndex(nextIndex);
    setSelectedAvatar(AVATARS[nextIndex]);
  }

  const avatar = AVATARS[index];

  const avatarUrl = `${import.meta.env.BASE_URL}assets/avatars/${avatar}`;

  return (
    <div className="avatar-picker">
      <button
        type="button"
        onClick={previous}
        className="avatar-arrow"
      >
        ‹
      </button>

      <div className="avatar-preview">
        <img
          src={avatarUrl}
          alt="Selected avatar"
          draggable="false"
        />
      </div>

      <button
        type="button"
        onClick={next}
        className="avatar-arrow"
      >
        ›
      </button>
    </div>
  );
}

export default AvatarPicker;
