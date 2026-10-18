/* ---------------------------------------------------------------------------
   One recipe card.

   The no-photo version is the design; the photo is an enhancement layered on
   top. A card with nothing to show must look deliberate, not like a card whose
   image failed to load, so there is no empty frame and no grey rectangle
   standing in for a picture. The title simply gets to be the whole card.
   --------------------------------------------------------------------------- */

import type { RecipeCardData } from "./recipe-types";

function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours} hr` : `${hours} hr ${rest} min`;
}

export default function RecipeCard({ recipe }: { recipe: RecipeCardData }) {
  const total = recipe.prep + recipe.cook;

  return (
    <li className="card">
      <a className="card__link" href={`/recipes/${recipe.slug}`}>
        {recipe.photo && (
          <img
            className="card__photo"
            src={recipe.photo.src}
            srcSet={recipe.photo.srcSet}
            sizes="(min-width: 64em) 22rem, (min-width: 40em) 45vw, 92vw"
            width={recipe.photo.width}
            height={recipe.photo.height}
            alt=""
            loading="lazy"
            decoding="async"
          />
        )}

        <div className="card__body">
          <h2 className="card__title">{recipe.title}</h2>

          <p className="card__meta text-small text-muted">
            {recipe.cuisine}
            {recipe.meals.length > 0 && <> &middot; {recipe.meals.join(", ")}</>}
          </p>

          <div className="card__times text-small">
            {/* The total is what you actually want to know when choosing what
                to cook, so it leads. The breakdown sits under it on its own
                line, because inline it wraps badly on anything long. */}
            <span className="card__total">{formatMinutes(total)} total</span>
            <span className="text-muted">
              prep {formatMinutes(recipe.prep)}
              {recipe.cook > 0 && <>, cook {formatMinutes(recipe.cook)}</>}
            </span>
          </div>

          {recipe.healthy && (
            // A word, not a coloured dot, so it does not depend on colour.
            <p className="card__healthy text-small">Healthy</p>
          )}
        </div>
      </a>
    </li>
  );
}
