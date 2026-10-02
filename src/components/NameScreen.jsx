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


    for (let i = 0; i < length; i++) {

      const from =
        oldText[i] || "";

      const to =
        newText[i] || "";

      const start =
        Math.floor(
          Math.random() * 35
        );

      const end =
        start +
        Math.floor(
          Math.random() * 35
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


      if (this.frame >= end) {

        complete++;

        output += to;

      } else if (
        this.frame >= start
      ) {

        if (
          !char ||
          Math.random() < 0.3
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
          `<span class="paper-name-dud">${char}</span>`;

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

  const [scramblerReady, setScramblerReady] =
    useState(false);

  const [characters, setCharacters] =
    useState([]);

  const [activeCharacters, setActiveCharacters] =
    useState(new Set());


  /*
   * ----------------------------------------
   * CREATE CHARACTERS
   * ----------------------------------------
   */

  const createCharacters =
    useCallback(() => {

      const chars =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*+-=[]{}<>?";

      const result = [];

      for (let i = 0; i < 240; i++) {

        result.push({

          char:
            chars[
              Math.floor(
                Math.random() *
                chars.length
              )
            ],

          x:
            Math.random() * 100,

          y:
            Math.random() * 100,

          speed:
            0.04 +
            Math.random() * 0.14
        });
      }

      return result;

    }, []);


  /*
   * ----------------------------------------
   * INITIAL CHARACTERS
   * ----------------------------------------
   */

  useEffect(() => {

    setCharacters(
      createCharacters()
    );

  }, [createCharacters]);


  /*
   * ----------------------------------------
   * RAIN ANIMATION
   * ----------------------------------------
   */

  useEffect(() => {

    let animationFrame;


    function animate() {

      setCharacters(
        previous =>
          previous.map(character => {

            let y =
              character.y +
              character.speed;

            let x =
              character.x;

            let char =
              character.char;


            if (y > 105) {

              y = -5;

              x =
                Math.random() * 100;


              const chars =
                "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*+-=[]{}<>?";


              char =
                chars[
                  Math.floor(
                    Math.random() *
                    chars.length
                  )
                ];
            }


            return {
              ...character,
              x,
              y,
              char
            };
          })
      );


      animationFrame =
        requestAnimationFrame(
          animate
        );
    }


    animationFrame =
      requestAnimationFrame(
        animate
      );


    return () => {

      cancelAnimationFrame(
        animationFrame
      );

    };

  }, []);


  /*
   * ----------------------------------------
   * RANDOM FLICKER
   * ----------------------------------------
   */

  useEffect(() => {

    if (!characters.length) {
      return;
    }


    const interval =
      setInterval(() => {

        const active =
          new Set();

        for (
          let i = 0;
          i < 6;
          i++
        ) {

          active.add(
            Math.floor(
              Math.random() *
              characters.length
            )
          );
        }


        setActiveCharacters(
          active
        );

      }, 80);


    return () => {
      clearInterval(interval);
    };

  }, [characters.length]);


  /*
   * ----------------------------------------
   * SCRAMBLE TITLE
   * ----------------------------------------
   */

  useEffect(() => {

    if (
      !titleRef.current ||
      scramblerRef.current
    ) {
      return;
    }


    scramblerRef.current =
      new TextScramble(
        titleRef.current
      );


    setScramblerReady(true);

  }, []);


  /*
   * ----------------------------------------
   * TITLE LOOP
   * ----------------------------------------
   */

  useEffect(() => {

    if (
      !scramblerReady ||
      !scramblerRef.current
    ) {
      return;
    }


    const phrases = [
      "PAPER.IO",
      "A FUN-FILLED GAME",
      "CAN WE GUESS THE PAPER?"
    ];


    let index = 0;

    let stopped = false;

    let timeout;


    function next() {

      if (
        stopped ||
        !scramblerRef.current
      ) {
        return;
      }


      scramblerRef.current
        .setText(
          phrases[index]
        )
        .then(() => {

          if (stopped) {
            return;
          }


          timeout =
            setTimeout(() => {

              index =
                (index + 1) %
                phrases.length;

              next();

            }, 1800);

        });
    }


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

  }, [scramblerReady]);


  return (

    <div className="paper-name-page">


      {/* ==================================
          BLACK BACKGROUND
          ================================== */}

      <div className="paper-name-background" />


      {/* ==================================
          RAINING CHARACTERS
          ================================== */}

      <div className="paper-name-rain">

        {characters.map(
          (character, index) => {

            const active =
              activeCharacters.has(
                index
              );


            return (

              <span
                key={index}
                className={
                  active
                    ? "paper-rain-char paper-rain-char-active"
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
                        ? "scale(1.35)"
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


      {/* ==================================
          DARK CENTER VIGNETTE
          ================================== */}

      <div className="paper-name-vignette" />


      {/* ==================================
          ANIMATED TITLE
          ================================== */}

      <div className="paper-name-title">

        <h1 ref={titleRef}>
          PAPER.IO
        </h1>

      </div>


      {/* ==================================
          NAME CARD
          ================================== */}

      <div className="paper-name-card">

        <h2>
          Enter your name
        </h2>

        <p>
          Choose your avatar and join the game.
        </p>


        <AvatarPicker
          selectedAvatar={selectedAvatar}
          setSelectedAvatar={setSelectedAvatar}
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


      {/* ==================================
          STYLES
          ================================== */}

      <style>{`

        * {
          box-sizing: border-box;
        }


        .paper-name-page {
          position: fixed;
          inset: 0;

          width: 100vw;
          height: 100vh;

          overflow: hidden;

          background: #000;

          display: flex;
          align-items: center;
          justify-content: center;

          isolation: isolate;
        }


        .paper-name-background {
          position: absolute;

          inset: 0;

          background: #000;

          z-index: -10;
        }


        .paper-name-rain {
          position: absolute;

          inset: 0;

          width: 100%;
          height: 100%;

          overflow: hidden;

          pointer-events: none;

          z-index: 1;
        }


        .paper-rain-char {
          position: absolute;

          display: block;

          color: #34383d;

          font-family:
            "Courier New",
            monospace;

          font-size: 22px;

          font-weight: 400;

          line-height: 1;

          opacity: 0.4;

          user-select: none;

          white-space: nowrap;

          transition:
            color 0.08s ease,
            opacity 0.08s ease,
            transform 0.08s ease;

          will-change:
            top,
            transform;
        }


        .paper-rain-char-active {
          color: #00ff66;

          opacity: 1;

          font-weight: 700;

          text-shadow:
            0 0 6px #00ff66,
            0 0 15px rgba(0,255,102,0.65),
            0 0 30px rgba(0,255,102,0.25);
        }


        .paper-name-vignette {
          position: absolute;

          inset: 0;

          z-index: 2;

          pointer-events: none;

          background:
            radial-gradient(
              ellipse at center,
              rgba(0,0,0,0.05) 0%,
              rgba(0,0,0,0.45) 55%,
              rgba(0,0,0,0.9) 100%
            );
        }


        .paper-name-title {
          position: absolute;

          top: 10%;

          left: 0;

          width: 100%;

          z-index: 5;

          text-align: center;

          pointer-events: none;

          padding: 0 20px;
        }


        .paper-name-title h1 {
          margin: 0;

          color: white;

          font-family:
            "Courier New",
            monospace;

          font-size:
            clamp(
              32px,
              5vw,
              72px
            );

          font-weight: 700;

          letter-spacing:
            0.12em;

          line-height: 1.2;

          text-shadow:
            0 0 10px rgba(255,255,255,0.25),
            0 0 30px rgba(255,255,255,0.1);
        }


        .paper-name-dud {
          color: #00ff66 !important;

          opacity: 0.8;
        }


        .paper-name-card {
          position: relative;

          z-index: 10;

          width: min(
            420px,
            calc(100vw - 40px)
          );

          padding: 32px;

          border-radius: 18px;

          background:
            rgba(10,10,10,0.88);

          border:
            1px solid
            rgba(255,255,255,0.12);

          box-shadow:
            0 20px 70px
            rgba(0,0,0,0.65);

          backdrop-filter:
            blur(18px);

          -webkit-backdrop-filter:
            blur(18px);

          text-align: center;
        }


        .paper-name-card h2 {
          margin:
            0 0 8px;

          color: white;

          font-size: 24px;
        }


        .paper-name-card p {
          margin:
            0 0 22px;

          color:
            rgba(255,255,255,0.55);

          font-size: 13px;
        }


        .paper-name-card input {
          width: 100%;

          height: 46px;

          margin-top: 18px;

          padding:
            0 14px;

          border-radius: 10px;

          border:
            1px solid
            rgba(255,255,255,0.15);

          outline: none;

          background:
            rgba(255,255,255,0.06);

          color: white;

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


        .paper-name-card button {
          width: 100%;

          height: 46px;

          margin-top: 12px;

          border: none;

          border-radius: 10px;

          background: white;

          color: black;

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


        @media (max-width: 600px) {

          .paper-name-title {
            top: 7%;
          }


          .paper-name-title h1 {
            font-size: 28px;
          }


          .paper-name-card {
            padding: 24px;
          }


          .paper-rain-char {
            font-size: 16px;
          }

        }

      `}</style>

    </div>
  );
}


export default NameScreen;