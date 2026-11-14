import type { GameEvent, Unlock } from '../../core';
import { fmt, itemName, objectName, s } from '../../i18n';
import { Icon } from '../Icon';
import { Sheet } from './Sheet';

type LevelUpEvent = Extract<GameEvent, { type: 'level-up' }>;

function unlockLine(unlock: Unlock): { picture: string; kind: string; name: string } {
  switch (unlock.kind) {
    case 'crop':
      return { picture: `items/${unlock.id}`, kind: s.levelUp.crop, name: itemName(unlock.id) };
    case 'recipe':
      return { picture: `items/${unlock.id}`, kind: s.levelUp.recipe, name: itemName(unlock.id) };
    case 'pen':
      return { picture: `buildings/${unlock.id}`, kind: s.levelUp.pen, name: objectName(unlock.id) };
    case 'maker':
      return { picture: `buildings/${unlock.id}`, kind: s.levelUp.maker, name: objectName(unlock.id) };
    case 'deco':
      return { picture: `buildings/${unlock.id}`, kind: s.levelUp.deco, name: objectName(unlock.id) };
    case 'patch':
      return { picture: 'world/cloud', kind: s.levelUp.patch, name: s.levelUp.patchName };
  }
}

export function LevelUp({ event, onClose }: { event: LevelUpEvent; onClose: () => void }) {
  return (
    <Sheet title={fmt(s.levelUp.title, { n: event.level })} small>
      <div class="level-up">
        <div class="level-star">
          <Icon name="ui/star" />
          <span>{event.level}</span>
        </div>
        <p class="reward reward-big">
          <Icon name="ui/coin" />+{event.coins}
        </p>
        {event.unlocks.length > 0 && (
          <ul class="unlock-list">
            {event.unlocks.map((unlock) => {
              const line = unlockLine(unlock);
              return (
                <li key={`${unlock.kind}-${unlock.id}`}>
                  <Icon name={line.picture} />
                  <span>
                    <small class="muted">{line.kind}</small>
                    <strong>{line.name}</strong>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
        <button class="button button-go button-wide" onClick={onClose}>
          {s.levelUp.ok}
        </button>
      </div>
    </Sheet>
  );
}
