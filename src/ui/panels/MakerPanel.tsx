import { getMaker, recipesOf } from '../../content';
import { itemCount, jobStatus, makerSummary, nextSlotCost, type GameState, type MakerObject } from '../../core';
import { fmt, formatDuration, itemName, objectName, s } from '../../i18n';
import { Icon } from '../Icon';
import { Sheet } from './Sheet';

export function MakerPanel({
  state,
  maker,
  onMake,
  onCollect,
  onBuySlot,
  onClose,
}: {
  state: GameState;
  maker: MakerObject;
  onMake: (recipeId: string) => void;
  onCollect: () => void;
  onBuySlot: () => void;
  onClose: () => void;
}) {
  const def = getMaker(maker.def);
  if (!def) return null;
  const summary = makerSummary(state, maker);
  const slotCost = nextSlotCost(maker);
  const emptySlots = Math.max(0, maker.slots - maker.jobs.length);

  return (
    <Sheet title={objectName(def.id)} onClose={onClose}>
      <ul class="queue" aria-label={s.maker.queue}>
        {maker.jobs.map((job, index) => {
          const status = jobStatus(state, job);
          return (
            <li class={`queue-slot queue-${status.stage}`} key={index}>
              <Icon name={`items/${job.recipe}`} label={itemName(job.recipe)} />
              {status.stage === 'done' ? (
                <Icon name="ui/check" class="queue-check" />
              ) : (
                <small>{formatDuration(status.remainingMs)}</small>
              )}
            </li>
          );
        })}
        {Array.from({ length: emptySlots }, (_, index) => (
          <li class="queue-slot queue-empty" key={`empty-${index}`}>
            <small>{s.maker.emptySlot}</small>
          </li>
        ))}
        {slotCost !== null && (
          <li>
            <button
              class="queue-slot queue-add"
              disabled={state.coins < slotCost}
              aria-label={s.maker.moreSpace}
              onClick={onBuySlot}
            >
              <Icon name="ui/plus" />
              <span class="reward">
                <Icon name="ui/coin" />
                {slotCost}
              </span>
            </button>
          </li>
        )}
      </ul>

      {summary.done > 0 && (
        <button class="button button-go button-wide" onClick={onCollect}>
          {s.maker.collect}
        </button>
      )}
      {summary.free === 0 && summary.done === 0 && <p class="note">{s.maker.queueFull}</p>}

      <ul class="recipe-list">
        {recipesOf(def.id).map((recipe) => {
          const locked = state.level < recipe.unlockLevel;
          const hasAll = recipe.ingredients.every((need) => itemCount(state, need.item) >= need.qty);
          return (
            <li class={locked ? 'recipe recipe-locked' : 'recipe'} key={recipe.id}>
              <div class="recipe-head">
                <Icon name={`items/${recipe.id}`} class="recipe-icon" />
                <span class="recipe-name">{itemName(recipe.id)}</span>
                <span class="chip">
                  <Icon name="ui/clock" />
                  {formatDuration(recipe.timeMs)}
                </span>
              </div>
              <div class="recipe-foot">
                <ul class="order-wants">
                  {recipe.ingredients.map((need) => {
                    const have = Math.min(itemCount(state, need.item), need.qty);
                    return (
                      <li
                        class={have >= need.qty ? 'want want-ok' : 'want'}
                        key={need.item}
                        aria-label={`${itemName(need.item)}: ${fmt(s.orders.have, { have, need: need.qty })}`}
                      >
                        <Icon name={`items/${need.item}`} />
                        <span>
                          {have}/{need.qty}
                        </span>
                      </li>
                    );
                  })}
                </ul>
                {locked ? (
                  <span class="chip chip-locked">
                    <Icon name="ui/lock" />
                    {fmt(s.maker.atLevel, { n: recipe.unlockLevel })}
                  </span>
                ) : (
                  <button class="button" disabled={!hasAll || summary.free === 0} onClick={() => onMake(recipe.id)}>
                    {s.maker.make}
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </Sheet>
  );
}
