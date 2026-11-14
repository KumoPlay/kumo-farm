import { balance, decorations, getObjectDef, makers, pens } from '../../content';
import { buyBlocker, shopOffer, type GameState } from '../../core';
import { fmt, objectName, s } from '../../i18n';
import { Icon } from '../Icon';
import { Sheet } from './Sheet';

function ShopCard({ state, defId, onBuy }: { state: GameState; defId: string; onBuy: (defId: string) => void }) {
  const offer = shopOffer(state, defId);
  const def = getObjectDef(defId);
  if (!offer || !def) return null;
  const blocker = buyBlocker(state, defId);
  const picture = defId === 'plot' ? 'tiles/soil' : `buildings/${defId}`;

  let footer;
  if (blocker === 'locked') {
    footer = (
      <span class="chip chip-locked">
        <Icon name="ui/lock" />
        {fmt(s.shop.atLevel, { n: offer.unlockLevel })}
      </span>
    );
  } else if (blocker === 'limit') {
    const nextLevel =
      defId === 'plot' && offer.owned < balance.plots.limitMax
        ? Math.ceil((offer.owned + 1 - balance.plots.limitBase) / balance.plots.limitPerLevel) + 1
        : null;
    footer = <span class="chip">{nextLevel ? fmt(s.shop.moreAtLevel, { n: nextLevel }) : s.shop.haveAll}</span>;
  } else {
    footer = (
      <button class="button" disabled={blocker !== null} onClick={() => onBuy(defId)}>
        {s.shop.buy}
        <span class="reward">
          <Icon name="ui/coin" />
          {offer.cost}
        </span>
      </button>
    );
  }

  return (
    <li class={blocker === 'locked' ? 'shop-card shop-card-locked' : 'shop-card'}>
      <Icon name={picture} class={def.w > def.h ? 'shop-art shop-art-wide' : 'shop-art'} />
      <strong>{objectName(defId)}</strong>
      {blocker !== 'locked' && offer.owned > 0 && (
        <small class="muted">
          {offer.limit === null
            ? fmt(s.shop.owned, { n: offer.owned })
            : fmt(s.shop.ownedOf, { n: offer.owned, limit: offer.limit })}
        </small>
      )}
      {footer}
    </li>
  );
}

export function ShopPanel({
  state,
  onBuy,
  onMove,
  onClose,
}: {
  state: GameState;
  onBuy: (defId: string) => void;
  onMove: () => void;
  onClose: () => void;
}) {
  const sections: { title: string; ids: string[] }[] = [
    { title: s.shop.farm, ids: ['plot'] },
    { title: s.shop.animals, ids: pens.map((pen) => pen.id) },
    { title: s.shop.buildings, ids: makers.map((maker) => maker.id) },
    { title: s.shop.decorations, ids: decorations.map((deco) => deco.id) },
  ];
  return (
    <Sheet title={s.shop.title} onClose={onClose}>
      <button class="button button-wide" onClick={onMove}>
        <Icon name="ui/move" />
        {s.shop.move}
      </button>
      {sections.map((section) => (
        <section class="shop-section" key={section.title}>
          <h3>{section.title}</h3>
          <ul class="shop-grid">
            {section.ids.map((id) => (
              <ShopCard key={id} state={state} defId={id} onBuy={onBuy} />
            ))}
          </ul>
        </section>
      ))}
    </Sheet>
  );
}
