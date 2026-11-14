import type { PatchDef } from '../../content';
import type { GameState } from '../../core';
import { fmt, s } from '../../i18n';
import { Icon } from '../Icon';
import { Sheet } from './Sheet';

/** Asks before buying a cloud patch, or says at which level it opens. */
export function PatchPanel({
  state,
  patch,
  onBuy,
  onClose,
}: {
  state: GameState;
  patch: PatchDef;
  onBuy: () => void;
  onClose: () => void;
}) {
  const locked = state.level < patch.unlockLevel;
  return (
    <Sheet title={s.patch.title} onClose={onClose} small>
      <div class="level-up">
        <Icon name="world/cloud" class="patch-cloud" />
        <p class="confirm-text">{locked ? fmt(s.patch.lockedText, { n: patch.unlockLevel }) : s.patch.text}</p>
        {locked ? (
          <button class="button button-wide" onClick={onClose}>
            {s.patch.ok}
          </button>
        ) : (
          <button class="button button-go button-wide" disabled={state.coins < patch.cost} onClick={onBuy}>
            {s.patch.buy}
            <span class="reward">
              <Icon name="ui/coin" />
              {patch.cost}
            </span>
          </button>
        )}
      </div>
    </Sheet>
  );
}
