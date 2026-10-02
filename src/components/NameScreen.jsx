import {
  useCallback,
  useEffect,
  useRef,
  useState
} from "react";

import AvatarPicker from "./AvatarPicker";


/* =========================================
   TEXT SCRAMBLE
========================================= */

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
      let {
        from,
        to,
        start,
        end,
        char
      } = this.queue[i];


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

          this.queue[i].char =
            char;
        }


        output +=
          `<span class="paper-scramble-dud">${char}</span>`;

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


/* =========================================
   NAME SCREEN
========================================= */

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


  /* =========================================
     MATRIX CHARACTERS
  ========================================= */

  const createCharacters =
    useCallback(() => {

      const allChars =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:,.<>?";

      const charCount = 300;

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
            0.1 +
            Math.random() * 0.3

        });
      }


      return newCharacters;

    }, []);


  useEffect(() => {

    setCharacters(
      createCharacters()
    );

  }, [createCharacters]);


  /* =========================================
     FLICKERING CHARACTERS
  ========================================= */

  useEffect(() => {

    if (!characters.length) {
      return;
    }


    const updateActiveIndices =
      () => {

        const newActiveIndices =
          new Set();


        const numActive =
          Math.floor(
            Math.random() * 4
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
      };


    const flickerInterval =
      setInterval(
        updateActiveIndices,
        50
      );


    return () => {
      clearInterval(
        flickerInterval
      );
    };

  }, [characters.length]);


  /* =========================================
     MATRIX MOVEMENT
  ========================================= */

  useEffect(() => {

    let animationFrameId;


    const updatePositions =
      () => {

        setCharacters(
          previousCharacters =>

            previousCharacters.map(
              character => {

                let y =
                  character.y +
                  character.speed;


                let x =
                  character.x;


                let char =
                  character.char;


                if (
                  y >= 100
                ) {

                  y = -5;

                  x =
                    Math.random() * 100;


                  const allChars =
                    "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:,.<>?";


                  char =
                    allChars[
                      Math.floor(
                        Math.random() *
                        allChars.length
                      )
                    ];
                }


                return {
                  ...character,

                  y,

                  x,

                  char
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


  /* =========================================
     INITIALIZE SCRAMBLER
  ========================================= */

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


  /* =========================================
     SCRAMBLE PHRASES
  ========================================= */

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

    let stopped = false;

    let timeout;


    const next = () => {

      if (
        stopped ||
        !scramblerRef.current
      ) {
        return;
      }


      scramblerRef.current
        .setText(
          phrases[counter]
        )
        .then(() => {

          if (stopped) {
            return;
          }


          timeout =
            setTimeout(
              () => {

                counter =
                  (counter + 1) %
                  phrases.length;

                next();

              },
              2000
            );

        });

    };


    next();


    return () => {

      stopped = true;

      clearTimeout(timeout);


      if (
        scramblerRef.current
      ) {

        cancelAnimationFrame(
          scramblerRef.current
            .frameRequest
        );

      }

    };

  }, [mounted]);


  /* =========================================
     UI
  ========================================= */

  return (

    <div className="paper-name-page">


      {/* MATRIX BACKGROUND */}

      <div className="paper-name-background" />


      <div className="paper-name-rain">

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
                    ? "paper-rain-char paper-rain-active"
                    : "paper-rain-char"
                }

                style={{

                  left:
                    `${character.x}%`,

                  top:
                    `${character.y}%`,

                  transform:
                    `translate(-50%, -50%) ${
                      active
                        ? "scale(1.25)"
                        : "scale(1)"
                    }`,

                  textShadow:
                    active
                      ? "0 0 8px rgba(0,255,0,0.9), 0 0 18px rgba(0,255,0,0.5)"
                      : "none"

                }}
              >

                {character.char}

              </span>

            );

          }
        )}

      </div>


      {/* DARK OVERLAY */}

      <div className="paper-name-vignette" />


      {/* MAIN CONTENT */}

      <main className="paper-name-content">


        {/* SCRAMBLED CENTER TEXT */}

        <div className="paper-scramble-container">

          <h1
            ref={titleRef}
            className="paper-scramble-title"
          >
            RAINING LETTERS
          </h1>

        </div>


        {/* NAME BOX */}

        <div className="paper-name-card">


          <h2>
            Enter your name
          </h2>


          <p>
            Choose your avatar and join the game.
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
            type="button"
            onClick={onContinue}
            disabled={!name.trim()}
          >
            Continue
          </button>


        </div>


      </main>


      <style>{`

        /* =====================================
           FULL SCREEN
        ===================================== */

        .paper-name-page {
          position: fixed;

          inset: 0;

          width: 100vw;

          height: 100vh;

          overflow: hidden;

          background: #000;

          isolation: isolate;
        }


        /* =====================================
           BACKGROUND
        ===================================== */

        .paper-name-background {
          position: absolute;

          inset: 0;

          background: #000;

          z-index: 0;
        }


        /* =====================================
           MATRIX RAIN
        ===================================== */

        .paper-name-rain {
          position: absolute;

          inset: 0;

          overflow: hidden;

          pointer-events: none;

          z-index: 1;
        }


        .paper-rain-char {
          position: absolute;

          color:
            rgba(80, 120, 90, 0.42);

          font-family:
            "Courier New",
            monospace;

          font-size:
            1.8rem;

          font-weight: 500;

          line-height: 1;

          opacity: 0.4;

          user-select: none;

          pointer-events: none;

          transition:
            color 0.1s ease,
            transform 0.1s ease,
            opacity 0.1s ease;

          will-change:
            transform,
            top;
        }


        .paper-rain-active {
          color: #00ff00;

          opacity: 1;

          font-weight: 800;

          z-index: 10;

          text-shadow:
            0 0 8px #00ff00,
            0 0 18px
            rgba(0,255,0,0.6);
        }


        /* =====================================
           VIGNETTE
        ===================================== */

        .paper-name-vignette {
          position: absolute;

          inset: 0;

          z-index: 2;

          pointer-events: none;

          background:
            radial-gradient(
              ellipse at center,

              rgba(0,0,0,0.05)
              0%,

              rgba(0,0,0,0.28)
              50%,

              rgba(0,0,0,0.82)
              100%
            );
        }


        /* =====================================
           CONTENT
        ===================================== */

        .paper-name-content {
          position: relative;

          z-index: 20;

          width: 100%;

          height: 100%;

          box-sizing: border-box;

          display: flex;

          flex-direction: column;

          align-items: center;

          justify-content: center;

          gap: 34px;

          padding:
            60px 20px 40px;
        }


        /* =====================================
           SCRAMBLED TITLE
        ===================================== */

        .paper-scramble-container {
          width: 100%;

          display: flex;

          align-items: center;

          justify-content: center;

          text-align: center;

          z-index: 30;

          pointer-events: none;
        }


        .paper-scramble-title {
          margin: 0;

          color: #fff;

          font-family:
            "Courier New",
            monospace;

          font-size:
            clamp(
              32px,
              5vw,
              64px
            );

          font-weight: 700;

          letter-spacing:
            0.08em;

          line-height: 1.2;

          text-align: center;

          white-space: nowrap;

          text-shadow:
            0 0 10px
            rgba(255,255,255,0.65),

            0 0 25px
            rgba(0,255,102,0.2);
        }


        .paper-scramble-dud {
          color: #00ff00;

          opacity: 0.8;

          text-shadow:
            0 0 8px #00ff00,

            0 0 15px
            rgba(0,255,0,0.6);
        }


        /* =====================================
           NAME CARD
        ===================================== */

        .paper-name-card {
          position: relative;

          z-index: 25;

          width:
            min(
              420px,
              calc(100vw - 40px)
            );

          padding: 30px;

          box-sizing: border-box;

          border-radius: 18px;

          background:
            rgba(10,10,10,0.48);

          border:
            1px solid
            rgba(255,255,255,0.12);

          box-shadow:
            0 20px 70px
            rgba(0,0,0,0.45);

          backdrop-filter:
            blur(6px);

          -webkit-backdrop-filter:
            blur(6px);

          text-align: center;

          flex-shrink: 0;
        }


        .paper-name-card h2 {
          margin:
            0 0 8px;

          color: #fff;

          font-size: 24px;
        }


        .paper-name-card p {
          margin:
            0 0 20px;

          color:
            rgba(255,255,255,0.55);

          font-size: 13px;
        }


        /* =====================================
           INPUT
        ===================================== */

        .paper-name-card input {
          width: 100%;

          height: 46px;

          margin-top: 18px;

          padding:
            0 14px;

          box-sizing: border-box;

          border-radius: 10px;

          border:
            1px solid
            rgba(255,255,255,0.15);

          outline: none;

          background:
            rgba(255,255,255,0.06);

          color: #fff;

          font-size: 14px;
        }


        .paper-name-card input::placeholder {
          color:
            rgba(255,255,255,0.35);
        }


        .paper-name-card input:focus {
          border-color:
            rgba(0,255,102,0.6);

          box-shadow:
            0 0 0 2px
            rgba(0,255,102,0.08);
        }


        /* =====================================
           BUTTON
        ===================================== */

        .paper-name-card button {
          width: 100%;

          height: 46px;

          margin-top: 12px;

          border: none;

          border-radius: 10px;

          background: #fff;

          color: #000;

          font-size: 14px;

          font-weight: 700;

          cursor: pointer;

          transition:
            transform 0.15s ease,
            opacity 0.15s ease;
        }


        .paper-name-card button:hover:not(:disabled) {
          transform:
            translateY(-2px);
        }


        .paper-name-card button:active:not(:disabled) {
          transform:
            scale(0.98);
        }


        .paper-name-card button:disabled {
          opacity: 0.3;

          cursor: not-allowed;
        }


        /* =====================================
           MOBILE
        ===================================== */

        @media (max-width: 600px) {

          .paper-name-content {
            gap: 24px;

            padding:
              40px 15px 25px;
          }


          .paper-scramble-title {
            font-size: 26px;

            white-space: normal;
          }


          .paper-name-card {
            width:
              calc(100vw - 30px);

            padding: 22px;
          }


          .paper-rain-char {
            font-size: 1.3rem;
          }

        }


        /* =====================================
           SHORT SCREENS
        ===================================== */

        @media (max-height: 700px) {

          .paper-name-content {
            gap: 18px;

            padding:
              30px 20px 20px;
          }


          .paper-scramble-title {
            font-size: 30px;
          }


          .paper-name-card {
            padding: 20px;
          }

        }

      `}</style>

    </div>
  );
}


export default NameScreen;