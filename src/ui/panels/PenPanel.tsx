import { getPen } from '../../content';
import { animalStatus, itemCount, nextAnimalCost, penSummary, type GameState, type PenObject } from '../../core';
import { animalName, fmt, formatDuration, itemName, objectName, s } from '../../i18n';
import { Icon } from '../Icon';
import { Sheet } from './Sheet';

export function PenPanel({
  state,
  pen,
  onFeed,
  onCollect,
  onBuyAnimal,
  onClose,
}: {
  state: GameState;
  pen: PenObject;
  onFeed: () => void;
  onCollect: () => void;
  onBuyAnimal: () => void;
  onClose: () => void;
}) {
  const def = getPen(pen.def);
  if (!def) return null;
  const summary = penSummary(state, pen);
  const feedHave = itemCount(state, def.feed.item);
  const canFeed = summary.hungry > 0 && feedHave >= def.feed.qty;
  const animalCost = nextAnimalCost(pen);

  return (
    <Sheet title={objectName(def.id)} onClose={onClose}>
      <p class="recipe-line">
        <span class="muted">{s.pen.eats}</span>
        <span class="want">
          <Icon name={`items/${def.feed.item}`} />
          {def.feed.qty}
        </span>
        <span class="muted">{s.pen.makes}</span>
        <span class="want">
          <Icon name={`items/${def.product}`} />1
        </span>
        <span class="chip">
          <Icon name="ui/clock" />
          {formatDuration(def.produceMs)}
        </span>
      </p>

      <ul class="animal-row">
        {def.animalCosts.map((_, index) => {
          const animal = pen.animals[index];
          if (!animal) {
            const isNext = index === pen.animals.length && animalCost !== null;
            return (
              <li key={index}>
                {isNext ? (
                  <button
                    class="animal-slot animal-add"
                    disabled={state.coins < animalCost}
                    aria-label={fmt(s.pen.add, { animal: animalName(def.animal) })}
                    onClick={onBuyAnimal}
                  >
                    <Icon name="ui/plus" class="animal-plus" />
                    <span class="reward">
                      <Icon name="ui/coin" />
                      {animalCost}
                    </span>
                  </button>
                ) : (
                  <div class="animal-slot animal-empty" />
                )}
              </li>
            );
          }
          const status = animalStatus(state, def, animal);
          return (
            <li key={index}>
              <div class={`animal-slot animal-${status.mood}`}>
                <Icon name={`animals/${def.animal}`} class="animal-face" label={animalName(def.animal)} />
                {status.mood === 'ready' ? (
                  <span class="chip chip-ready">
                    <Icon name={`items/${def.product}`} />
                    {s.pen.ready}
                  </span>
                ) : status.mood === 'busy' ? (
                  <span class="chip">
                    <Icon name="ui/clock" />
                    {formatDuration(status.remainingMs)}
                  </span>
                ) : (
                  <span class="chip chip-hungry">{s.pen.hungry}</span>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {summary.hungry > 0 && !canFeed && (
        <p class="note">{fmt(s.pen.noFeed, { item: itemName(def.feed.item) })}</p>
      )}

      <div class="button-row button-row-even">
        <button class="button" disabled={!canFeed} onClick={onFeed}>
          {s.pen.feed}
          <span class="reward">
            <Icon name={`items/${def.feed.item}`} />
            {feedHave}
          </span>
        </button>
        <button class="button button-go" disabled={summary.ready === 0} onClick={onCollect}>
          {s.pen.collect}
          {summary.ready > 0 && (
            <span class="reward">
              <Icon name={`items/${def.product}`} />
              {summary.ready}
            </span>
          )}
        </button>
      </div>
    </Sheet>
  );
}
