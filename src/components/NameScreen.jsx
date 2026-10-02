import {
  useEffect,
  useRef,
  useState
} from "react";

import AvatarPicker from "./AvatarPicker";


function scrambleText(text) {
  const chars = "!<>-_\\/[]{}—=+*^?#";
  
  return text
    .split("")
    .map((char) => {
      if (char === " ") return " ";

      return chars[
        Math.floor(
          Math.random() * chars.length
        )
      ];
    })
    .join("");
}


function NameScreen({
  name,
  setName,
  selectedAvatar,
  setSelectedAvatar,
  onContinue
}) {

  const phrases = [
    "PAPER.IO",
    "A FUN-FILLED GAME",
    "CAN WE GUESS THE PAPER?"
  ];


  const [title, setTitle] =
    useState("PAPER.IO");

  const [characters, setCharacters] =
    useState([]);


  /* =====================================
     MATRIX CHARACTERS
  ===================================== */

  useEffect(() => {

    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:,.<>?";

    const result = [];

    for (let i = 0; i < 320; i++) {

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
          0.08 +
          Math.random() * 0.22
      });

    }

    setCharacters(result);

  }, []);


  /* =====================================
     MATRIX ANIMATION
  ===================================== */

  useEffect(() => {

    let frame;

    const animate = () => {

      setCharacters((previous) =>
        previous.map((item) => {

          let newY =
            item.y + item.speed;

          let newChar =
            item.char;

          let newX =
            item.x;


          if (newY > 105) {

            newY = -5;

            newX =
              Math.random() * 100;


            const chars =
              "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:,.<>?";


            newChar =
              chars[
                Math.floor(
                  Math.random() *
                  chars.length
                )
              ];
          }


          return {
            ...item,
            x: newX,
            y: newY,
            char: newChar
          };

        })
      );


      frame =
        requestAnimationFrame(
          animate
        );
    };


    frame =
      requestAnimationFrame(
        animate
      );


    return () => {
      cancelAnimationFrame(frame);
    };

  }, []);


  /* =====================================
     SCRAMBLED TITLE
  ===================================== */

  useEffect(() => {

    let phraseIndex = 0;

    let timeout;

    let stopped = false;


    const animatePhrase = () => {

      if (stopped) {
        return;
      }


      const target =
        phrases[phraseIndex];


      let step = 0;

      const totalSteps = 18;


      const interval =
        setInterval(() => {

          if (stopped) {
            clearInterval(interval);
            return;
          }


          step++;


          if (
            step >= totalSteps
          ) {

            clearInterval(interval);

            setTitle(target);


            timeout =
              setTimeout(() => {

                phraseIndex =
                  (phraseIndex + 1) %
                  phrases.length;

                animatePhrase();

              }, 1800);


            return;
          }


          const progress =
            step / totalSteps;


          const visibleCount =
            Math.floor(
              target.length *
              progress
            );


          let output = "";


          for (
            let i = 0;
            i < target.length;
            i++
          ) {

            if (
              target[i] === " "
            ) {

              output += " ";

            } else if (
              i < visibleCount
            ) {

              output += target[i];

            } else {

              output +=
                scrambleText(
                  target[i]
                );
            }

          }


          setTitle(output);

        }, 45);

    };


    animatePhrase();


    return () => {

      stopped = true;

      clearTimeout(timeout);

    };

  }, []);


  return (
    <div className="paper-name-page">


      {/* ================================
          MATRIX
      ================================= */}

      <div className="paper-name-rain">

        {characters.map(
          (item, index) => (

            <span
              key={index}
              className="paper-matrix-char"

              style={{
                left:
                  `${item.x}%`,

                top:
                  `${item.y}%`
              }}
            >
              {item.char}
            </span>

          )
        )}

      </div>


      {/* ================================
          SCRAMBLED TITLE
      ================================= */}

      <div className="paper-title-layer">

        <div className="paper-title">
          {title}
        </div>

      </div>


      {/* ================================
          NAME CARD
      ================================= */}

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


      <style>{`

        /* ================================
           PAGE
        ================================= */

        .paper-name-page {
          position: fixed;

          inset: 0;

          width: 100vw;

          height: 100vh;

          overflow: hidden;

          background: #000;

          z-index: 0;
        }


        /* ================================
           MATRIX
        ================================= */

        .paper-name-rain {
          position: absolute;

          inset: 0;

          overflow: hidden;

          pointer-events: none;

          z-index: 1;
        }


        .paper-matrix-char {
          position: absolute;

          color:
            rgba(90, 130, 100, 0.38);

          font-family:
            "Courier New",
            monospace;

          font-size: 27px;

          font-weight: 700;

          line-height: 1;

          user-select: none;

          text-shadow:
            0 0 5px
            rgba(0,255,80,0.15);
        }


        /* ================================
           TITLE
        ================================= */

        .paper-title-layer {
          position: absolute;

          top: 23%;

          left: 0;

          width: 100%;

          display: flex;

          justify-content: center;

          align-items: center;

          z-index: 20;

          pointer-events: none;
        }


        .paper-title {
          color: #fff;

          font-family:
            "Courier New",
            monospace;

          font-size:
            clamp(
              32px,
              5vw,
              68px
            );

          font-weight: 700;

          letter-spacing:
            0.08em;

          line-height: 1.2;

          text-align: center;

          min-height: 82px;

          display: flex;

          align-items: center;

          justify-content: center;

          text-shadow:
            0 0 10px
            rgba(255,255,255,0.65),

            0 0 30px
            rgba(0,255,100,0.25);
        }


        /* ================================
           NAME CARD
        ================================= */

        .paper-name-card {
          position: absolute;

          top: 52%;

          left: 50%;

          transform:
            translate(-50%, -50%);

          width:
            min(
              420px,
              calc(100vw - 40px)
            );

          box-sizing: border-box;

          padding: 30px;

          border-radius: 18px;

          background:
            rgba(10,10,10,0.48);

          border:
            1px solid
            rgba(255,255,255,0.14);

          backdrop-filter:
            blur(6px);

          -webkit-backdrop-filter:
            blur(6px);

          box-shadow:
            0 20px 70px
            rgba(0,0,0,0.5);

          text-align: center;

          z-index: 30;
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


        /* ================================
           INPUT
        ================================= */

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


        /* ================================
           BUTTON
        ================================= */

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
        }


        .paper-name-card button:hover:not(:disabled) {
          transform:
            translateY(-2px);
        }


        .paper-name-card button:disabled {
          opacity: 0.3;

          cursor: not-allowed;
        }


        /* ================================
           MOBILE
        ================================= */

        @media (max-width: 600px) {

          .paper-title-layer {
            top: 18%;
          }


          .paper-title {
            font-size: 27px;

            padding:
              0 15px;

            white-space:
              normal;
          }


          .paper-name-card {
            width:
              calc(100vw - 30px);

            top: 55%;

            padding: 22px;
          }


          .paper-matrix-char {
            font-size: 20px;
          }

        }

      `}</style>

    </div>
  );
}


export default NameScreen;