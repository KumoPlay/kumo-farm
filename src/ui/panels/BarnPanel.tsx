import { useState } from 'preact/hooks';
import { balance, getItem, items } from '../../content';
import { barnCapacity, barnUpgradeCost, barnUsed, itemCount, type GameState } from '../../core';
import { fmt, itemName, s } from '../../i18n';
import { Icon } from '../Icon';
import { Sheet } from './Sheet';

export function BarnPanel({
  state,
  onSell,
  onUpgrade,
  onClose,
}: {
  state: GameState;
  onSell: (item: string, qty: number) => void;
  onUpgrade: () => void;
  onClose: () => void;
}) {
  const [picked, setPicked] = useState<string | null>(null);
  const used = barnUsed(state);
  const capacity = barnCapacity(state);
  const stored = items.filter((item) => itemCount(state, item.id) > 0);
  const pickedCount = picked ? itemCount(state, picked) : 0;
  const pickedDef = picked && pickedCount > 0 ? getItem(picked) : undefined;
  const upgradeCost = barnUpgradeCost(state);
  const nextCapacity = balance.barn.capacities[state.barnLevel];

  return (
    <Sheet title={s.barn.title} onClose={onClose}>
      <div class="barn-space">
        <div
          class={used >= capacity ? 'meter meter-full' : 'meter'}
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={capacity}
          aria-valuenow={used}
        >
          <span style={{ width: `${Math.min(100, (used / capacity) * 100)}%` }} />
        </div>
        <span class="barn-count">{fmt(s.barn.space, { used, cap: capacity })}</span>
      </div>

      {stored.length === 0 ? (
        <p class="muted center">{s.barn.empty}</p>
      ) : (
        <ul class="barn-grid">
          {stored.map((item) => (
            <li key={item.id}>
              <button
                class={picked === item.id ? 'barn-item barn-item-picked' : 'barn-item'}
                aria-pressed={picked === item.id}
                aria-label={`${itemName(item.id)}: ${itemCount(state, item.id)}`}
                onClick={() => setPicked(picked === item.id ? null : item.id)}
              >
                <Icon name={`items/${item.id}`} />
                <span class="barn-qty">{itemCount(state, item.id)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {pickedDef && (
        <div class="sell-row">
          <span class="sell-name">
            <Icon name={`items/${pickedDef.id}`} />
            {itemName(pickedDef.id)}
          </span>
          <button class="button" onClick={() => onSell(pickedDef.id, 1)}>
            {s.barn.sellOne}
            <span class="reward">
              <Icon name="ui/coin" />
              {pickedDef.value}
            </span>
          </button>
          {pickedCount > 1 && (
            <button class="button" onClick={() => onSell(pickedDef.id, pickedCount)}>
              {fmt(s.barn.sellAll, { n: pickedCount })}
              <span class="reward">
                <Icon name="ui/coin" />
                {pickedDef.value * pickedCount}
              </span>
            </button>
          )}
        </div>
      )}

      <div class="upgrade-row">
        {upgradeCost === null || nextCapacity === undefined ? (
          <p class="muted center">{s.barn.biggest}</p>
        ) : (
          <button class="button button-wide" disabled={state.coins < upgradeCost} onClick={onUpgrade}>
            <Icon name="ui/up" />
            {fmt(s.barn.upgrade, { cap: nextCapacity })}
            <span class="reward">
              <Icon name="ui/coin" />
              {upgradeCost}
            </span>
          </button>
        )}
      </div>
    </Sheet>
  );
}
