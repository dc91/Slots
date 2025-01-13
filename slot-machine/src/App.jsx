import React, { useState, useEffect, useRef } from "react";
import "./assets/styles/SlotMachine.css";
import btnIMG from "./assets/ButtonArrow.svg";
import btnSFX from "./assets/click.mp3";
import winSFX from "./assets/win.mp3";

const NR_REELS = 5;
const MAX_BET = 5;
const MAX_LINES = 3;
const SPIN_TIME = 100;

/** Symbols and a function to generate reels */
const SYMBOLS = ["🔺", "🔶", "⭐", "⚪", "🍀", "🍋", "🍒", "💎", "🍇", "🔔", "💰", "🍎", "🍍"];

function generateReel() {
  const reel = [];
  for (let i = 0; i < 13; i++) {
    reel.push(SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]);
  }
  return reel;
}

export default function App() {
  const [reels, setReels] = useState(() => Array.from({ length: NR_REELS }, generateReel));
  const [visibleIndices, setVisibleIndices] = useState(
    () => Array.from({ length: NR_REELS }, () => [0, 1, 2])
  );
  const [spinningReels, setSpinningReels] = useState(
    () => Array.from({ length: NR_REELS }, () => false)
  );
  const [credits, setCredits] = useState(100);
  const [bet, setBet] = useState(1);
  const [lines, setLines] = useState(1);
  const [gameOver, setGameOver] = useState(false);
  const isSpinning = spinningReels.includes(true);
  const [winningPositions, setWinningPositions] = useState([]);

  const btnAudioRef = useRef(null);
  useEffect(() => {
    btnAudioRef.current = new Audio(btnSFX);
  }, []);

  const btnPlayAudioRef = useRef(null);
  useEffect(() => {
    btnPlayAudioRef.current = new Audio(winSFX);
  }, []);

  const spinIntervalsRef = useRef(Array(NR_REELS).fill(null));
  
  useEffect(() => {
    const lineElems = document.querySelectorAll(".line");
    if (lineElems.length === 0) return;

    lineElems.forEach((line) => line.classList.add("changed-lines"));
    // 2. Force a reflow
    void document.body.offsetHeight;

    lineElems.forEach((line) => line.classList.remove("changed-lines"));
  }, [lines]);

  const handleMaxBet = () => {
    let b = MAX_BET;
    let l = MAX_LINES;

    if (credits < b * l) {
      if (credits > b * (l - 1)) {
        b = Math.floor(credits / l);
      } else if (credits > b) {
        l = l - 1;
        b = Math.floor(credits / 2);
      } else {
        l = 1;
        b = credits;
      }
    }
    setBet(b);
    setLines(l);
  };

  /** ========================
   *   SPIN LOGIC
   *  ========================
   */
  const handleSpin = () => {
    btnAudioRef.current.play();
    document.getElementById("result-header").innerHTML = "";
    setWinningPositions([]);

    const totalCost = bet * lines;
    if (credits < totalCost) {
      alert("Not enough credits!");
      return;
    }

    setCredits((prev) => prev - totalCost);

    // Generate fresh symbols for all reels
    const newReels = Array.from({ length: 5 }, generateReel);
    setReels(newReels);

    // Mark all reels as spinning
    setSpinningReels([true, true, true, true, true]);

    // Simulate stopping each reel in a staggered fashion
    for (let r = 0; r < NR_REELS; r++) {
      setTimeout(() => {
        stopReel(r, newReels);
      }, r * SPIN_TIME * 4);
      // ^ you can tweak the multiplier so the reels stop at different times
    }
  };

  /**
   * Stop a specific reel: 
   *  1) Mark spinningReels[reelIndex] = false
   *  2) Clear the interval that’s animating that reel
   *  3) Fix the final visible indices to something (e.g. [0,1,2])
   *  4) If it’s the last reel, check wins
   */
  const stopReel = (reelIndex, newReels) => {
    setSpinningReels((prev) => {
      const updated = [...prev];
      updated[reelIndex] = false;

      // Now that we’ve set spinningReels[reelIndex] = false, 
      // check if *all* reels are done:
      const allStopped = !updated.includes(true);

      if (allStopped) {
        const { winnings, winningPositions: positions } = checkForWin(newReels, lines, bet);
        setWinningPositions(positions);
        setCredits(oldCredits => {
          const finalCredits = oldCredits + winnings;
          if (finalCredits <= 0) {
            setGameOver(true);
          }
          return finalCredits;
        });
      }
      return updated;
    });

    // Clear that reel's spin interval
    if (spinIntervalsRef.current[reelIndex]) {
      clearInterval(spinIntervalsRef.current[reelIndex]);
      spinIntervalsRef.current[reelIndex] = null;
    }

    setVisibleIndices((prev) => {
      const updated = [...prev];
      updated[reelIndex] = [0, 1, 2];
      return updated;
    });

  };

  const checkForWin = (allReels, lines, bet) => {
    let winnings = 0;
    const winningPositions = [];

    // top=0, middle=1, bottom=2
    const linesPlayed =
      lines === 1
        ? [1]
        : lines === 2
          ? [0, 1]
          : [0, 1, 2];

    linesPlayed.forEach((row) => {
      const lineSymbols = allReels.map((reel) => reel[row]);
      const count = {};
      lineSymbols.forEach((sym) => {
        count[sym] = (count[sym] || 0) + 1;
      });
      for (let sym in count) {
        if (count[sym] >= 3) {
          winnings += 10 * count[sym] * bet;
          lineSymbols.forEach((currentSym, reelIndex) => {
            if (currentSym === sym) {
              winningPositions.push({ reelIndex, row });
            }
          });
        }
      }
    });

    if (winnings > 0) {
      btnPlayAudioRef.current.play();
      document.getElementById("result-header").innerHTML = `You won ${winnings} credits!`;
    } else {
      document.getElementById("result-header").innerHTML = "Better luck next time!";
    }
    return { winnings, winningPositions };
  };

  const handleRestart = () => {
    setCredits(100);
    setBet(1);
    setLines(1);
    setReels(Array.from({ length: 5 }, generateReel));
    setSpinningReels([false, false, false, false, false]);
    setVisibleIndices(Array.from({ length: 5 }, () => [0, 1, 2]));
    setGameOver(false);
  };

  /** ========================
   *   SPINNING ANIMATION
   *  ========================
   *  Whenever a reel is marked “spinningReels[reelIndex] = true”, we start an 
   *  interval that repeatedly shifts its visible indices. When spinning stops, 
   *  we clear that interval.
   */
  useEffect(() => {
    spinningReels.forEach((spinning, reelIndex) => {
      if (spinning && !spinIntervalsRef.current[reelIndex]) {
        // Start an interval for that reel
        const intervalId = setInterval(() => {
          setVisibleIndices((prev) => {
            const updated = [...prev];
            // Shift each of the 3 visible rows downward by 1, wrapping around the reel length
            updated[reelIndex] = updated[reelIndex].map(
              (i) => (i + 1) % reels[reelIndex].length
            );
            return updated;
          });
        }, 100); // how fast you want the symbol to "scroll"

        spinIntervalsRef.current[reelIndex] = intervalId;
      }
      else if (!spinning && spinIntervalsRef.current[reelIndex]) {
        // Reel is no longer spinning -> clear its interval
        clearInterval(spinIntervalsRef.current[reelIndex]);
        spinIntervalsRef.current[reelIndex] = null;
      }
    });
  }, [spinningReels, reels]);

  return (
    <div className="slot-machine">
      <h1 className="main-title">Slot Machine</h1>
      <div className="credits-div">
        <h2>Credits: {credits}</h2>
      </div>

      <div className="reels-container">
        {/* Reels themselves */}
        <div className="reels">
          {reels.map((reel, reelIndex) => (
            <div
              className="reel"
              key={reelIndex}
            >
              {visibleIndices[reelIndex].map((symbolIndex) => {
                const row = symbolIndex;
                const isWinner = winningPositions.some(
                  (pos) => pos.reelIndex === reelIndex && pos.row === row
                );
                return (
                  <div
                    key={symbolIndex}
                    className={`symbol ${isWinner ? "winning" : ""}`}
                  >
                    {reel[row]}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Lines Overlay */}
        <div className={`lines-overlay ${isSpinning ? "hide" : ""}`}>
          {lines >= 2 && (
            <div className="line top-line">
              <img 
                className="line-arrow line-arrow-left"
                src={btnIMG}
                alt="button"
                style={{ transform: "rotate(90deg)" }}
              />
              <img
                className="line-arrow line-arrow-right"
                src={btnIMG}
                alt="button"
                style={{ transform: "rotate(270deg)" }}
              />
            </div>
          )}
          {lines >= 1 && (
            <div className="line middle-line">
              <img
                className="line-arrow line-arrow-left"
                src={btnIMG}
                alt="button"
                style={{ transform: "rotate(90deg)" }}
              />
              <img
                className="line-arrow line-arrow-right"
                src={btnIMG}
                alt="button"
                style={{ transform: "rotate(270deg)" }}
              />
            </div>
          )}
          {lines >= 3 && (
            <div className="line bottom-line">
              <img
                className="line-arrow line-arrow-left"
                src={btnIMG}
                alt="button"
                style={{ transform: "rotate(90deg)" }}
              />
              <img
                className="line-arrow line-arrow-right" 
                src={btnIMG}
                alt="button"
                style={{ transform: "rotate(270deg)" }}
              />
            </div>
          )}
        </div>
      </div>

      <div className="controls">
        <span className="bet-screen screen">{bet}</span>
        <div className="bet-controls">
          <label>Bet</label>
          <div>
            <button
              className="arrow-btn"
              disabled={isSpinning || gameOver}
              onClick={() => setBet((prev) => Math.min(5, prev + 1))}
            >
              <img src={btnIMG} alt="button" />
            </button>
            <button
              className="arrow-btn"
              disabled={isSpinning || gameOver}
              onClick={() => setBet((prev) => Math.max(1, prev - 1))}
            >
              <img src={btnIMG} alt="button" style={{ transform: "rotate(180deg)" }}/>
            </button>
          </div>
        </div>

        <button
          className="mid-btns max-bet-btn"
          disabled={isSpinning || gameOver}
          onClick={handleMaxBet}
        >
          MAX<br />BET
        </button>
        <button
          className="mid-btns spin-btn"
          disabled={isSpinning || gameOver}
          onClick={handleSpin}
        >
          SPIN
        </button>

        <div className="line-controls">
          <label>Lines</label>
          <div>
            <button
              className="arrow-btn"
              disabled={isSpinning || gameOver}
              onClick={() => setLines((prev) => Math.min(3, prev + 1))}
            >
              <img src={btnIMG} alt="button" />
            </button>
            <button
              className="arrow-btn"
              disabled={isSpinning || gameOver}
              onClick={() => setLines((prev) => Math.max(1, prev - 1))}
            >
              <img src={btnIMG} alt="button" style={{ transform: "rotate(180deg)" }}/>
            </button>
          </div>
        </div>
        <span className="line-screen screen">{lines}</span>
      </div>

      {gameOver && (
        <div className="game-over-div">
          <h1>Game Over!</h1>
          <p>You have run out of credits.</p>
          <button onClick={handleRestart}>Restart</button>
        </div>
      )}
      <div className="results-info">
        <h1 id="result-header"></h1>
      </div>
    </div>
  );
}
