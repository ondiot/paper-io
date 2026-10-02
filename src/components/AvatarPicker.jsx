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
    const next =
      (index - 1 + AVATARS.length) %
      AVATARS.length;

    setIndex(next);
    setSelectedAvatar(AVATARS[next]);
  }

  function next() {
    const nextIndex =
      (index + 1) % AVATARS.length;

    setIndex(nextIndex);
    setSelectedAvatar(AVATARS[nextIndex]);
  }

  const avatar = AVATARS[index];

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
          src={`/assets/avatars/${avatar}`}
          alt="Selected avatar"
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