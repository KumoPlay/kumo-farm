import { barnCapacity, barnUsed, canFulfill, xpToNext, type GameState } from '../../core';
import { fmt, s } from '../../i18n';
import { Icon } from '../Icon';

export function TopBar({ state, onSettings }: { state: GameState; onSettings: () => void }) {
  const goal = xpToNext(state.level);
  return (
    <header class="top-bar">
      <div class="level" aria-label={`${fmt(s.hud.level, { n: state.level })}. ${fmt(s.hud.xp, { xp: state.xp, goal })}`}>
        <div class="level-badge">
          <Icon name="ui/star" />
          <span>{state.level}</span>
        </div>
        <div class="xp-bar">
          <span style={{ width: `${Math.min(100, (state.xp / goal) * 100)}%` }} />
          <em>
            {state.xp}/{goal}
          </em>
        </div>
      </div>
      <div class="coins" aria-label={fmt(s.hud.coins, { n: state.coins })}>
        <Icon name="ui/coin" />
        <span>{state.coins}</span>
      </div>
      <button class="round-button" onClick={onSettings} aria-label={s.hud.settings}>
        <Icon name="ui/gear" />
      </button>
    </header>
  );
}

export function BottomBar({
  state,
  onOrders,
  onBarn,
  onShop,
}: {
  state: GameState;
  onOrders: () => void;
  onBarn: () => void;
  onShop: () => void;
}) {
  const readyOrders = state.orders.filter((slot) => slot.order && canFulfill(state, slot.order)).length;
  const used = barnUsed(state);
  const capacity = barnCapacity(state);
  return (
    <nav class="bottom-bar">
      <button class="bar-button" onClick={onOrders}>
        <Icon name="ui/orders" />
        <span>{s.hud.orders}</span>
        {readyOrders > 0 && <b class="badge">{readyOrders}</b>}
      </button>
      <button class={used >= capacity ? 'bar-button bar-button-full' : 'bar-button'} onClick={onBarn}>
        <Icon name="buildings/barn" />
        <span>
          {s.hud.barn}
          <small>
            {used}/{capacity}
          </small>
        </span>
      </button>
      <button class="bar-button" onClick={onShop}>
        <Icon name="ui/shop" />
        <span>{s.hud.shop}</span>
      </button>
    </nav>
  );
}
