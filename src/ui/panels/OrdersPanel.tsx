import { canFulfill, itemCount, type GameState } from '../../core';
import { customerName, fmt, formatDuration, itemName, s } from '../../i18n';
import { Icon } from '../Icon';
import { Sheet } from './Sheet';

export function OrdersPanel({
  state,
  onDeliver,
  onSkip,
  onClose,
}: {
  state: GameState;
  onDeliver: (slot: number) => void;
  onSkip: (slot: number) => void;
  onClose: () => void;
}) {
  return (
    <Sheet title={s.orders.title} onClose={onClose}>
      <ul class="order-list">
        {state.orders.map((slot, index) => {
          const order = slot.order;
          if (!order) {
            return (
              <li class="order order-waiting" key={`wait-${index}`}>
                <Icon name="world/cloud" class="order-cloud" />
                <div>
                  <p class="order-wait-title">{s.orders.onTheWay}</p>
                  <p class="muted">
                    {fmt(s.orders.arrivesIn, { time: formatDuration(Math.max(0, slot.readyAt - state.time)) })}
                  </p>
                </div>
              </li>
            );
          }
          const ready = canFulfill(state, order);
          return (
            <li class={ready ? 'order order-ready' : 'order'} key={order.id}>
              <div class="order-who">
                <Icon name={`people/${order.customer}`} class="order-face" />
                <span>{customerName(order.customer)}</span>
              </div>
              <ul class="order-wants">
                {order.wants.map((want) => {
                  const have = Math.min(itemCount(state, want.item), want.qty);
                  const enough = have >= want.qty;
                  return (
                    <li
                      class={enough ? 'want want-ok' : 'want'}
                      key={want.item}
                      aria-label={`${itemName(want.item)}: ${fmt(s.orders.have, { have, need: want.qty })}`}
                    >
                      <Icon name={`items/${want.item}`} />
                      <span>
                        {have}/{want.qty}
                      </span>
                      {enough && <Icon name="ui/check" class="want-check" />}
                    </li>
                  );
                })}
              </ul>
              <div class="order-foot">
                <span class="reward">
                  <Icon name="ui/coin" />
                  {order.coins}
                </span>
                <span class="reward">
                  <Icon name="ui/star" />
                  {order.xp}
                </span>
                <button class="button button-quiet" onClick={() => onSkip(index)}>
                  {s.orders.skip}
                </button>
                <button class="button button-go" disabled={!ready} onClick={() => onDeliver(index)}>
                  {s.orders.deliver}
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </Sheet>
  );
}
