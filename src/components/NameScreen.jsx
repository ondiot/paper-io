import {
  useCallback,
  useEffect,
  useRef,
  useState
} from "react";

import AvatarPicker from "./AvatarPicker";


class TextScramble {

  constructor(element) {
    this.element = element;

    this.chars =
      "!<>-_\\/[]{}—=+*^?#";

    this.queue = [];
    this.frame = 0;
    this.frameRequest = 0;
    this.resolve = () => {};

    this.update =
      this.update.bind(this);
  }


  setText(newText) {

    const oldText =
      this.element.innerText;

    const length =
      Math.max(
        oldText.length,
        newText.length
      );

    const promise =
      new Promise((resolve) => {
        this.resolve = resolve;
      });


    this.queue = [];


    for (
      let i = 0;
      i < length;
      i++
    ) {

      const from =
        oldText[i] || "";

      const to =
        newText[i] || "";

      const start =
        Math.floor(
          Math.random() * 40
        );

      const end =
        start +
        Math.floor(
          Math.random() * 40
        );


      this.queue.push({
        from,
        to,
        start,
        end
      });
    }


    cancelAnimationFrame(
      this.frameRequest
    );

    this.frame = 0;

    this.update();

    return promise;
  }


  update() {

    let output = "";
    let complete = 0;


    for (
      let i = 0;
      i < this.queue.length;
      i++
    ) {

      const item =
        this.queue[i];

      let {
        from,
        to,
        start,
        end,
        char
      } = item;


      if (
        this.frame >= end
      ) {

        complete++;

        output += to;

      } else if (
        this.frame >= start
      ) {

        if (
          !char ||
          Math.random() < 0.28
        ) {

          char =
            this.chars[
              Math.floor(
                Math.random() *
                this.chars.length
              )
            ];

          item.char = char;
        }


        output +=
          `<span class="name-screen-dud">${char}</span>`;

      } else {

        output += from;
      }
    }


    this.element.innerHTML =
      output;


    if (
      complete ===
      this.queue.length
    ) {

      this.resolve();

    } else {

      this.frameRequest =
        requestAnimationFrame(
          this.update
        );

      this.frame++;
    }
  }
}


function NameScreen({
  name,
  setName,
  selectedAvatar,
  setSelectedAvatar,
  onContinue
}) {

  const titleRef =
    useRef(null);

  const scramblerRef =
    useRef(null);

  const [mounted, setMounted] =
    useState(false);


  const [characters, setCharacters] =
    useState([]);


  const [activeIndices, setActiveIndices] =
    useState(new Set());


  /*
   * ========================================
   * CREATE RAINING CHARACTERS
   * ========================================
   */

  const createCharacters =
    useCallback(() => {

      const allChars =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:,.<>?";


      const charCount = 180;

      const newCharacters = [];


      for (
        let i = 0;
        i < charCount;
        i++
      ) {

        newCharacters.push({

          char:
            allChars[
              Math.floor(
                Math.random() *
                allChars.length
              )
            ],

          x:
            Math.random() * 100,

          y:
            Math.random() * 100,

          speed:
            0.035 +
            Math.random() * 0.12
        });
      }


      return newCharacters;

    }, []);


  /*
   * ========================================
   * INITIALIZE CHARACTERS
   * ========================================
   */

  useEffect(() => {

    setCharacters(
      createCharacters()
    );

  }, [
    createCharacters
  ]);


  /*
   * ========================================
   * FLICKERING CHARACTERS
   * ========================================
   */

  useEffect(() => {

    if (!characters.length) {
      return;
    }


    const flickerInterval =
      setInterval(() => {

        const newActiveIndices =
          new Set();

        const numActive =
          Math.floor(
            Math.random() * 5
          ) + 3;


        for (
          let i = 0;
          i < numActive;
          i++
        ) {

          newActiveIndices.add(
            Math.floor(
              Math.random() *
              characters.length
            )
          );
        }


        setActiveIndices(
          newActiveIndices
        );

      }, 100);


    return () => {
      clearInterval(
        flickerInterval
      );
    };

  }, [
    characters.length
  ]);


  /*
   * ========================================
   * ANIMATE RAIN
   * ========================================
   */

  useEffect(() => {

    let animationFrameId;


    const updatePositions =
      () => {

        setCharacters(
          (previous) =>
            previous.map(
              (character) => {

                let newY =
                  character.y +
                  character.speed;

                let newX =
                  character.x;

                let newChar =
                  character.char;


                if (
                  newY >= 105
                ) {

                  newY = -5;

                  newX =
                    Math.random() * 100;


                  const allChars =
                    "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:,.<>?";


                  newChar =
                    allChars[
                      Math.floor(
                        Math.random() *
                        allChars.length
                      )
                    ];
                }


                return {

                  ...character,

                  x: newX,

                  y: newY,

                  char: newChar
                };
              }
            )
        );


        animationFrameId =
          requestAnimationFrame(
            updatePositions
          );
      };


    animationFrameId =
      requestAnimationFrame(
        updatePositions
      );


    return () => {

      cancelAnimationFrame(
        animationFrameId
      );
    };

  }, []);


  /*
   * ========================================
   * TEXT SCRAMBLE SETUP
   * ========================================
   */

  useEffect(() => {

    if (
      titleRef.current &&
      !scramblerRef.current
    ) {

      scramblerRef.current =
        new TextScramble(
          titleRef.current
        );

      setMounted(true);
    }

  }, []);


  /*
   * ========================================
   * TEXT SCRAMBLE LOOP
   * ========================================
   */

  useEffect(() => {

    if (
      !mounted ||
      !scramblerRef.current
    ) {
      return;
    }


    const phrases = [

      "PAPER.IO",

      "A FUN-FILLED GAME",

      "CAN WE GUESS THE PAPER?"

    ];


    let counter = 0;

    let cancelled = false;

    let timeoutId;


    const next = () => {

      if (
        cancelled ||
        !scramblerRef.current
      ) {
        return;
      }


      scramblerRef.current
        .setText(
          phrases[counter]
        )
        .then(() => {

          if (cancelled) {
            return;
          }


          timeoutId =
            setTimeout(() => {

              counter =
                (counter + 1) %
                phrases.length;

              next();

            }, 1800);

        });
    };


    next();


    return () => {

      cancelled = true;

      clearTimeout(
        timeoutId
      );

      if (
        scramblerRef.current
      ) {

        cancelAnimationFrame(
          scramblerRef.current
            .frameRequest
        );
      }
    };

  }, [
    mounted
  ]);


  /*
   * ========================================
   * UI
   * ========================================
   */

  return (

    <section className="name-screen">

      {/* RAINING BACKGROUND */}

      <div
        className="name-screen-rain"
        aria-hidden="true"
      >

        {characters.map(
          (character, index) => {

            const active =
              activeIndices.has(
                index
              );


            return (

              <span
                key={index}
                className={
                  active
                    ? "name-rain-character active"
                    : "name-rain-character"
                }
                style={{
                  left:
                    `${character.x}%`,

                  top:
                    `${character.y}%`,

                  transform:
                    `translate(-50%, -50%) ${
                      active
                        ? "scale(1.3)"
                        : "scale(1)"
                    }`
                }}
              >
                {character.char}
              </span>

            );
          }
        )}

      </div>


      {/* DARK OVERLAY */}

      <div
        className="name-screen-overlay"
        aria-hidden="true"
      />


      {/* SCRAMBLED BACKGROUND TITLE */}

      <div
        className="name-screen-scramble"
        aria-hidden="true"
      >

        <h1
          ref={titleRef}
        >
          PAPER.IO
        </h1>

      </div>


      {/* ACTUAL NAME CARD */}

      <div className="name-card">

        <h1>
          PAPER.IO
        </h1>


        <p>
          Enter your name to continue
        </p>


        <AvatarPicker
          selectedAvatar={
            selectedAvatar
          }
          setSelectedAvatar={
            setSelectedAvatar
          }
        />


        <input
          type="text"
          value={name}
          onChange={(event) =>
            setName(
              event.target.value
            )
          }
          placeholder="Your name"
          maxLength={20}
        />


        <button
          onClick={onContinue}
          disabled={!name.trim()}
        >
          Continue
        </button>

      </div>


      {/* COMPONENT STYLES */}

      <style>{`

        .name-screen {
          position: relative;
          width: 100%;
          min-height: 100vh;
          overflow: hidden;
          background: #000;
          display: flex;
          align-items: center;
          justify-content: center;
        }


        .name-screen-rain {
          position: absolute;
          inset: 0;
          overflow: hidden;
          pointer-events: none;
          z-index: 0;
          background: #000;
        }


        .name-rain-character {
          position: absolute;
          color: #3f464f;
          opacity: 0.32;
          font-family: monospace;
          font-size: 1.25rem;
          font-weight: 400;
          line-height: 1;
          user-select: none;
          transition:
            color 0.1s ease,
            opacity 0.1s ease,
            transform 0.1s ease;
          will-change:
            transform,
            top;
        }


        .name-rain-character.active {
          color: #fff;
          opacity: 0.95;
          font-weight: 700;
          text-shadow:
            0 0 7px rgba(255,255,255,0.9),
            0 0 15px rgba(255,255,255,0.5);
        }


        .name-screen-overlay {
          position: absolute;
          inset: 0;
          z-index: 1;
          pointer-events: none;

          background:
            radial-gradient(
              circle at center,
              rgba(0,0,0,0.18) 0%,
              rgba(0,0,0,0.55) 55%,
              rgba(0,0,0,0.88) 100%
            );
        }


        .name-screen-scramble {
          position: absolute;
          left: 50%;
          top: 17%;
          transform: translateX(-50%);
          width: 90%;
          z-index: 3;
          pointer-events: none;
          text-align: center;
        }


        .name-screen-scramble h1 {
          margin: 0;
          color: #fff;
          font-family: monospace;
          font-size: clamp(
            2rem,
            5vw,
            4.5rem
          );
          font-weight: 700;
          letter-spacing: 0.12em;
          line-height: 1.1;

          text-shadow:
            0 0 10px rgba(255,255,255,0.25),
            0 0 30px rgba(255,255,255,0.08);
        }


        .name-screen-dud {
          color: #00ff00;
          opacity: 0.72;
        }


        .name-card {
          position: relative;
          z-index: 10;
        }

      `}</style>

    </section>
  );
}


export default NameScreen;