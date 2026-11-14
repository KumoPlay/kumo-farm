import { crops } from '../../content';
import type { GameState } from '../../core';
import { fmt, formatDuration, itemName, s } from '../../i18n';
import { Icon } from '../Icon';
import { Sheet } from './Sheet';

export function SeedPicker({
  state,
  onPick,
  onClose,
}: {
  state: GameState;
  onPick: (cropId: string) => void;
  onClose: () => void;
}) {
  return (
    <Sheet title={s.seeds.title} onClose={onClose}>
      <ul class="seed-list">
        {crops.map((crop) => {
          const locked = state.level < crop.unlockLevel;
          return (
            <li key={crop.id}>
              <button class="seed" disabled={locked} onClick={() => onPick(crop.id)}>
                <Icon name={`items/${crop.id}`} class="seed-icon" />
                <span class="seed-name">{itemName(crop.id)}</span>
                {locked ? (
                  <span class="chip chip-locked">
                    <Icon name="ui/lock" />
                    {fmt(s.seeds.atLevel, { n: crop.unlockLevel })}
                  </span>
                ) : (
                  <span class="chip">
                    <Icon name="ui/clock" />
                    {formatDuration(crop.growMs)}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </Sheet>
  );
}
