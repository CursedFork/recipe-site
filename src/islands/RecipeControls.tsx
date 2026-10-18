/* ---------------------------------------------------------------------------
   The recipe page controls, and the ingredients and instructions they rewrite.

   One island, because the servings scaler, the unit toggle and the checkboxes
   all act on the same text. Splitting them would mean three components fighting
   over one list.

   Nothing here talks to a server. Every control is local state, so everything
   responds on the same frame you press it.
   --------------------------------------------------------------------------- */

import { useCallback, useEffect, useRef, useState } from "react";

import type { Ingredient } from "../lib/parse-recipe";
import {
  convertTemperatures,
  renderIngredient,
  type UnitSystem,
} from "../lib/units";

/* The Screen Wake Lock API is not in every TypeScript DOM library yet, and it
   is not in every browser either, so it is described narrowly here and always
   reached for defensively. */
interface WakeLockSentinelLike {
  release: () => Promise<void>;
  addEventListener: (type: "release", listener: () => void) => void;
}

interface Props {
  ingredients: Ingredient[];
  instructions: string[];
  /** The servings the recipe was written for. */
  baseServings: number;
}

const UNITS_STORAGE_KEY = "units";
const MIN_SERVINGS = 1;
const MAX_SERVINGS = 99;

export default function RecipeControls({
  ingredients,
  instructions,
  baseServings,
}: Props) {
  const [servings, setServings] = useState(baseServings);
  const [system, setSystem] = useState<UnitSystem>("us");
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const [cookMode, setCookMode] = useState(false);

  /**
   * Whether the screen is actually being held awake right now.
   *
   * Deliberately separate from cookMode. The spec is explicit that we must not
   * show a control claiming the screen will stay on when it will not, and the
   * Wake Lock API needs HTTPS and is missing from several browsers. So cook
   * mode always works for the large text, and the promise about the screen is
   * only made once the lock has actually been granted.
   */
  const [screenHeldAwake, setScreenHeldAwake] = useState(false);
  const wakeLock = useRef<WakeLockSentinelLike | null>(null);

  /* ---- The unit choice persists ---------------------------------------- */

  useEffect(() => {
    // Read on mount rather than in a state initialiser, because the server
    // rendered "us" and reading during hydration would not match it.
    try {
      const stored = localStorage.getItem(UNITS_STORAGE_KEY);
      if (stored === "us" || stored === "metric") setSystem(stored);
    } catch {
      /* localStorage throws outright in some private browsing modes. */
    }
  }, []);

  const chooseSystem = (next: UnitSystem) => {
    setSystem(next);
    try {
      localStorage.setItem(UNITS_STORAGE_KEY, next);
    } catch {
      /* The choice will not survive a reload. Everything else still works. */
    }
  };

  /* ---- Cook mode and the wake lock -------------------------------------- */

  const releaseWakeLock = useCallback(async () => {
    const lock = wakeLock.current;
    wakeLock.current = null;
    setScreenHeldAwake(false);
    if (lock) {
      try {
        await lock.release();
      } catch {
        /* Already gone. Nothing to do. */
      }
    }
  }, []);

  const requestWakeLock = useCallback(async () => {
    const api = (navigator as Navigator & {
      wakeLock?: { request: (type: "screen") => Promise<WakeLockSentinelLike> };
    }).wakeLock;

    if (!api) return; // Not supported. Cook mode still works, it just says nothing.

    try {
      const lock = await api.request("screen");
      wakeLock.current = lock;
      setScreenHeldAwake(true);
      // The browser drops the lock on its own when the tab is hidden, or on
      // low battery. When that happens, stop claiming the screen stays on.
      lock.addEventListener("release", () => setScreenHeldAwake(false));
    } catch {
      // Refused, usually because the page is not on HTTPS. Degrade quietly.
      setScreenHeldAwake(false);
    }
  }, []);

  const toggleCookMode = () => {
    const next = !cookMode;
    setCookMode(next);
    if (next) void requestWakeLock();
    else void releaseWakeLock();
  };

  // Re-acquire the lock when you come back to the tab, since the browser
  // released it while you were away.
  useEffect(() => {
    if (!cookMode) return;

    const onVisible = () => {
      if (document.visibilityState === "visible" && wakeLock.current === null) {
        void requestWakeLock();
      }
    };

    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [cookMode, requestWakeLock]);

  // Never leave a lock held after the component goes away.
  useEffect(() => () => void releaseWakeLock(), [releaseWakeLock]);

  /* ---- Scaling ----------------------------------------------------------- */

  const factor = servings / baseServings;
  const scaled = servings !== baseServings;

  const rendered = ingredients.map((ingredient) =>
    renderIngredient(ingredient, factor, system),
  );

  // The note about units we deliberately did not convert. Shown once, under
  // the list, not on every line.
  const keptSomething = system === "metric" && rendered.some((line) => line.keptOriginalUnit);

  const toggleChecked = (index: number) => {
    setChecked((current) => {
      const next = new Set(current);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const changeServings = (next: number) => {
    setServings(Math.min(MAX_SERVINGS, Math.max(MIN_SERVINGS, next)));
  };

  return (
    <div className={`recipe${cookMode ? " is-cook-mode" : ""}`}>
      <div className="recipe__controls">
        <div className="recipe__control">
          <span className="recipe__control-label" id="servings-label">
            Servings
          </span>
          <div className="stepper" role="group" aria-labelledby="servings-label">
            <button
              type="button"
              className="icon-button stepper__button"
              onClick={() => changeServings(servings - 1)}
              disabled={servings <= MIN_SERVINGS}
              aria-label="One fewer serving"
              data-tooltip="One fewer serving"
            >
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>

            {/*
              The one live region for this control. <output> already carries an
              implicit status role, so the new number is announced after each
              press without having to go looking for it.

              The "Scaled from X to Y" line below is deliberately NOT a live
              region: two of them firing on one button press means hearing the
              change announced twice.
            */}
            <output className="stepper__value">{servings}</output>

            <button
              type="button"
              className="icon-button stepper__button"
              onClick={() => changeServings(servings + 1)}
              disabled={servings >= MAX_SERVINGS}
              aria-label="One more serving"
              data-tooltip="One more serving"
            >
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M12 5v14M5 12h14"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>

          {scaled && (
            <button
              type="button"
              className="recipe__reset"
              onClick={() => setServings(baseServings)}
            >
              Reset to {baseServings}
            </button>
          )}
        </div>

        <fieldset className="recipe__control recipe__units">
          <legend className="recipe__control-label">Units</legend>
          <div className="recipe__chips">
            <button
              type="button"
              className={`chip${system === "us" ? " is-active" : ""}`}
              aria-pressed={system === "us"}
              onClick={() => chooseSystem("us")}
            >
              US
            </button>
            <button
              type="button"
              className={`chip${system === "metric" ? " is-active" : ""}`}
              aria-pressed={system === "metric"}
              onClick={() => chooseSystem("metric")}
            >
              Metric
            </button>
          </div>
        </fieldset>

        <div className="recipe__control recipe__actions">
          <button
            type="button"
            className={`chip${cookMode ? " is-active" : ""}`}
            aria-pressed={cookMode}
            onClick={toggleCookMode}
          >
            Cook mode
          </button>

          <button type="button" className="chip" onClick={() => window.print()}>
            Print
          </button>
        </div>
      </div>

      {cookMode && (
        <p className="recipe__cook-note text-small" role="status">
          Cook mode is on, so the text is larger.{" "}
          {/* Only claimed when the lock was actually granted. */}
          {screenHeldAwake
            ? "Your screen will stay awake while this page is open."
            : "Your browser will not let this page keep the screen awake, so it may still dim."}
        </p>
      )}

      <div className="recipe__columns">
        <section className="recipe__section" aria-labelledby="ingredients-heading">
          <h2 id="ingredients-heading">Ingredients</h2>

          {scaled && (
            <p className="recipe__scaled text-small">
              Scaled from {baseServings} to {servings} servings.
            </p>
          )}

          <ul className="ingredients">
            {ingredients.map((ingredient, index) => {
              const line = rendered[index];

              if (ingredient.isHeading) {
                return (
                  <li key={index} className="ingredients__heading">
                    <h3>{line.text.replace(/:$/, "")}</h3>
                  </li>
                );
              }

              const isChecked = checked.has(index);

              return (
                <li key={index} className="ingredients__item">
                  {/* The label wraps the control, so the whole row is one hit
                      target with no dead zone beside the box. */}
                  <label className="ingredients__label">
                    <input
                      type="checkbox"
                      className="ingredients__box"
                      checked={isChecked}
                      onChange={() => toggleChecked(index)}
                    />
                    <span className={isChecked ? "ingredients__text is-checked" : "ingredients__text"}>
                      {line.text}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>

          {keptSomething && (
            <p className="recipe__unit-note text-small text-muted">
              Some ingredients are still in cups and spoons. Converting a dry
              ingredient from volume to grams needs a different density for
              every one of them, so guessing would do more harm than leaving
              it alone.
            </p>
          )}
        </section>

        <section className="recipe__section" aria-labelledby="instructions-heading">
          <h2 id="instructions-heading">Instructions</h2>
          <ol className="instructions">
            {instructions.map((step, index) => (
              <li key={index} className="instructions__step">
                {convertTemperatures(step, system)}
              </li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  );
}
