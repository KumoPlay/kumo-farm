import { useEffect, useRef, useState } from 'preact/hooks';
import { getDeco, getObjectDef, getPatch, type PatchDef } from '../content';
import {
  buyAnimal,
  buyBlocker,
  buyObject,
  buyPatch,
  buyQueueSlot,
  canPlace,
  collectFromMaker,
  collectFromPen,
  createNewGame,
  defIdOf,
  feedAnimals,
  findFreeSpot,
  findMaker,
  findPen,
  fulfillOrder,
  harvestPlot,
  makerSummary,
  markSeen,
  moveObject,
  penSummary,
  plantCrop,
  plotGrowth,
  removeDecoration,
  sellItems,
  setSound,
  shopOffer,
  skipOrder,
  startRecipe,
  upgradeBarn,
  type FarmObject,
  type GameEvent,
  type GameState,
  type PlotObject,
  type Result,
} from '../core';
import { fmt, itemName, objectName, s } from '../i18n';
import { setSoundEnabled, sfx, unlockAudio } from '../platform/audio';
import { shouldSuggestInstall } from '../platform/install';
import { isUpdateReady, onUpdateReady, updateNow } from '../platform/pwa';
import { askToKeepStorage, eraseGame } from '../platform/storage';
import { FarmView, objectPicture, type FarmMode, type Floater } from './farm/FarmView';
import { BottomBar, TopBar } from './hud/Hud';
import { Icon } from './Icon';
import { InstallHint } from './InstallHint';
import { BarnPanel } from './panels/BarnPanel';
import { LevelUp } from './panels/LevelUp';
import { MakerPanel } from './panels/MakerPanel';
import { OrdersPanel } from './panels/OrdersPanel';
import { PatchPanel } from './panels/PatchPanel';
import { PenPanel } from './panels/PenPanel';
import { SeedPicker } from './panels/SeedPicker';
import { SettingsPanel } from './panels/SettingsPanel';
import { ShopPanel } from './panels/ShopPanel';
import type { GameStore } from './store';
import { useGameState } from './useGameState';

type Panel =
  | null
  | { type: 'orders' | 'barn' | 'settings' | 'shop' }
  | { type: 'seeds'; plotId: number }
  | { type: 'pen' | 'maker'; id: number }
  | { type: 'patch'; id: string };

type LevelUpEvent = Extract<GameEvent, { type: 'level-up' }>;

/** Something being placed on the farm: a purchase, or (with movingId) a thing being moved. */
interface Placing {
  def: string;
  x: number;
  y: number;
  movingId?: number;
}

interface Toast {
  id: number;
  text: string;
  coins?: number;
  xp?: number;
  openBarn?: boolean;
}

let askedToKeepStorage = false;

/** The sound for each thing that can happen. */
function playEventSound(event: GameEvent): void {
  switch (event.type) {
    case 'planted':
      return sfx.plant();
    case 'harvested':
      return event.bonus > 0 ? sfx.lucky() : sfx.harvest();
    case 'collected':
      return sfx.collect();
    case 'fed':
      return sfx.feed();
    case 'job-started':
      return sfx.start();
    case 'sold':
    case 'removed':
      return sfx.coin();
    case 'order-done':
      return sfx.deliver();
    case 'level-up':
      return sfx.levelUp();
    case 'bought':
    case 'moved':
    case 'patch-bought':
    case 'animal-bought':
    case 'slot-bought':
    case 'barn-upgraded':
      return sfx.place();
    default:
      return undefined;
  }
}

export function Game({ store }: { store: GameStore }) {
  const state = useGameState(store);
  const [panel, setPanel] = useState<Panel>(null);
  /** The seed being planted with each tap on an empty plot, or null. */
  const [brush, setBrush] = useState<string | null>(null);
  /** Move mode: tap something on the farm to pick it up. */
  const [picking, setPicking] = useState(false);
  const [placing, setPlacing] = useState<Placing | null>(null);
  const [peekPlotId, setPeekPlotId] = useState<number | null>(null);
  const [floaters, setFloaters] = useState<Floater[]>([]);
  const [levelUps, setLevelUps] = useState<LevelUpEvent[]>([]);
  const [toast, setToast] = useState<Toast | null>(null);
  const [updateReady, setUpdateReady] = useState(isUpdateReady());
  const nextKey = useRef(1);

  // Keep timers moving, and save when the game goes out of sight.
  useEffect(() => {
    const timer = setInterval(() => store.tick(), 1000);
    const onVisibility = (): void => {
      store.tick();
      if (document.hidden) store.save();
    };
    const onPageHide = (): void => store.save();
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', onPageHide);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', onPageHide);
    };
  }, [store]);

  // Sound can only start after a tap; this wakes it up on every tap, which is harmless.
  useEffect(() => {
    window.addEventListener('pointerdown', unlockAudio, true);
    return () => window.removeEventListener('pointerdown', unlockAudio, true);
  }, []);
  useEffect(() => setSoundEnabled(state.settings.sound), [state.settings.sound]);
  useEffect(() => onUpdateReady(() => setUpdateReady(true)), []);

  const showToast = (toastInfo: Omit<Toast, 'id'>): void => setToast({ ...toastInfo, id: nextKey.current++ });

  const addFloater = (x: number, y: number, icon: string, text: string, lucky = false): void => {
    const id = nextKey.current++;
    setFloaters((list) => [...list, { id, x, y, icon, text, lucky }]);
    setTimeout(() => setFloaters((list) => list.filter((entry) => entry.id !== id)), 1100);
  };

  // Turn things that happened into little moments on screen.
  useEffect(
    () =>
      store.onEvent((event) => {
        playEventSound(event);
        if (event.type === 'harvested') {
          const plot = store.getState().objects.find((object) => object.id === event.plotId);
          if (plot) addFloater(plot.x, plot.y, `items/${event.crop}`, `+${event.qty}`, event.bonus > 0);
        } else if (event.type === 'collected') {
          const object = store.getState().objects.find((entry) => entry.id === event.objectId);
          const size = object ? getObjectDef(defIdOf(object)) : undefined;
          if (object) addFloater(object.x + ((size?.w ?? 1) - 1) / 2, object.y, `items/${event.item}`, `+${event.qty}`);
        } else if (event.type === 'level-up') {
          setLevelUps((list) => [...list, event]);
        } else if (event.type === 'order-done') {
          showToast({ text: s.orders.done, coins: event.order.coins, xp: event.order.xp });
        } else if (event.type === 'patch-bought') {
          showToast({ text: s.patch.bought });
        }
      }),
    [store],
  );

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 2800);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (peekPlotId === null) return;
    const timer = setTimeout(() => setPeekPlotId(null), 2600);
    return () => clearTimeout(timer);
  }, [peekPlotId]);

  /** Runs a game action; a refused one gets a soft "nope" sound and, for a full barn, a helpful note. */
  const act = (action: (draft: GameState) => Result): Result => {
    const result = store.run(action);
    if (!result.ok) {
      sfx.nope();
      if (result.reason === 'barn-full') showToast({ text: s.barn.full, openBarn: true });
    }
    return result;
  };

  const openPanel = (next: Panel): void => {
    sfx.tap();
    setBrush(null);
    setPeekPlotId(null);
    setPanel(next);
  };

  const plant = (plotId: number, cropId: string): void => {
    const result = act((draft) => plantCrop(draft, plotId, cropId));
    if (!result.ok) return;
    if (!askedToKeepStorage) {
      askedToKeepStorage = true;
      void askToKeepStorage();
    }
    const anyEmpty = store.getState().objects.some((object) => object.kind === 'plot' && !object.crop);
    setBrush(anyEmpty ? cropId : null);
  };

  const tapPlot = (plot: PlotObject): void => {
    const stage = plotGrowth(store.getState(), plot).stage;
    if (stage === 'ready') {
      setPeekPlotId(null);
      act((draft) => harvestPlot(draft, plot.id));
    } else if (stage === 'empty') {
      setPeekPlotId(null);
      if (brush) plant(plot.id, brush);
      else openPanel({ type: 'seeds', plotId: plot.id });
    } else {
      setPeekPlotId(peekPlotId === plot.id ? null : plot.id);
    }
  };

  const tapObject = (object: FarmObject): void => {
    if (picking) {
      sfx.tap();
      setPlacing({ def: defIdOf(object), x: object.x, y: object.y, movingId: object.id });
      return;
    }
    const now = store.getState();
    switch (object.kind) {
      case 'plot':
        return tapPlot(object);
      case 'barn':
        return openPanel({ type: 'barn' });
      case 'board':
        return openPanel({ type: 'orders' });
      case 'pen':
        // One tap collects when something is ready; otherwise it opens the panel.
        if (penSummary(now, object).ready > 0) act((draft) => collectFromPen(draft, object.id));
        else openPanel({ type: 'pen', id: object.id });
        return;
      case 'maker':
        if (makerSummary(now, object).done > 0) act((draft) => collectFromMaker(draft, object.id));
        else openPanel({ type: 'maker', id: object.id });
        return;
      default:
        return;
    }
  };

  const startBuying = (defId: string): void => {
    const size = getObjectDef(defId);
    const spot = findFreeSpot(store.getState(), defId, 3 - (size?.w ?? 1) / 2, 3 - (size?.h ?? 1) / 2);
    if (!spot) {
      sfx.nope();
      showToast({ text: s.shop.noRoom });
      return;
    }
    sfx.tap();
    setPanel(null);
    setPicking(false);
    setPlacing({ def: defId, ...spot });
  };

  const confirmPlacing = (): void => {
    if (!placing) return;
    const { def, x, y, movingId } = placing;
    if (movingId !== undefined) {
      if (act((draft) => moveObject(draft, movingId, x, y)).ok) setPlacing(null);
      return;
    }
    if (!act((draft) => buyObject(draft, def, x, y)).ok) return;
    // Plots and decorations are often bought a few at a time: offer the next one right away.
    const after = store.getState();
    const again = (def === 'plot' || getDeco(def) !== undefined) && buyBlocker(after, def) === null;
    const spot = again ? findFreeSpot(after, def, x, y) : null;
    setPlacing(spot ? { def, ...spot } : null);
  };

  const startNewFarm = async (): Promise<void> => {
    await eraseGame();
    store.replace(createNewGame(Date.now(), Math.floor(Math.random() * 0xffffffff)));
    setPanel(null);
    setLevelUps([]);
  };

  const loadBackup = (backup: GameState): void => {
    store.replace(backup);
    setPanel(null);
    setLevelUps([]);
    showToast({ text: s.settings.loaded });
  };

  const levelUp = levelUps[0];
  const busy = panel !== null || placing !== null || picking;
  const showHint =
    !brush && !busy && state.stats.harvested === 0 && state.objects.every((o) => o.kind !== 'plot' || !o.crop);
  const showInstallHint =
    !busy && !brush && !levelUp && state.level >= 2 && !state.seen.installHint && shouldSuggestInstall();

  const placingValid = placing ? canPlace(state, placing.def, placing.x, placing.y, placing.movingId) : false;
  const mode: FarmMode = placing
    ? { type: 'place', ...placing, valid: placingValid }
    : picking
      ? { type: 'pick' }
      : { type: 'play' };
  const placingOffer = placing && placing.movingId === undefined ? shopOffer(state, placing.def) : null;
  const movingDeco = placing?.movingId !== undefined ? getDeco(placing.def) : undefined;

  const pen = panel?.type === 'pen' ? findPen(state, panel.id) : undefined;
  const maker = panel?.type === 'maker' ? findMaker(state, panel.id) : undefined;
  const patch: PatchDef | undefined = panel?.type === 'patch' ? getPatch(panel.id) : undefined;

  return (
    <div class="game">
      <FarmView
        state={state}
        mode={mode}
        peekPlotId={peekPlotId}
        floaters={floaters}
        onObject={tapObject}
        onPatch={(next) => openPanel({ type: 'patch', id: next.id })}
        onGhostMove={(x, y) => setPlacing((current) => (current ? { ...current, x, y } : current))}
      />

      <TopBar state={state} onSettings={() => openPanel({ type: 'settings' })} />

      {!placing && !picking && (
        <BottomBar
          state={state}
          onOrders={() => openPanel({ type: 'orders' })}
          onBarn={() => openPanel({ type: 'barn' })}
          onShop={() => openPanel({ type: 'shop' })}
        />
      )}

      {placing && (
        <div class="place-bar">
          <div class="place-info">
            <Icon name={objectPicture(placing.def)} />
            <span>
              <strong>{objectName(placing.def)}</strong>
              <small>
                {!placingValid ? s.place.blocked : placing.movingId === undefined ? s.place.buyHelp : s.place.moveHelp}
              </small>
            </span>
            {placingOffer && (
              <span class="reward">
                <Icon name="ui/coin" />
                {placingOffer.cost}
              </span>
            )}
          </div>
          <div class="place-buttons">
            <button class="button" onClick={() => setPlacing(null)}>
              {s.place.cancel}
            </button>
            {movingDeco && placing.movingId !== undefined && (
              <button
                class="button"
                onClick={() => {
                  const id = placing.movingId;
                  if (id !== undefined && act((draft) => removeDecoration(draft, id)).ok) setPlacing(null);
                }}
              >
                {s.place.sellBack}
                <span class="reward">
                  <Icon name="ui/coin" />+{movingDeco.cost}
                </span>
              </button>
            )}
            <button class="button button-go" disabled={!placingValid} onClick={confirmPlacing}>
              {s.place.place}
            </button>
          </div>
        </div>
      )}

      {picking && !placing && (
        <div class="place-bar place-bar-row">
          <div class="place-info">
            <Icon name="ui/move" />
            <strong>{s.place.pick}</strong>
          </div>
          <button class="button button-go" onClick={() => setPicking(false)}>
            {s.place.done}
          </button>
        </div>
      )}

      {showHint && <p class="float-note hint">{s.farm.hint}</p>}

      {brush && !busy && (
        <div class="float-note brush">
          <Icon name={`items/${brush}`} />
          <span>
            <strong>{fmt(s.farm.planting, { item: itemName(brush) })}</strong>
            <small>{s.farm.plantingHelp}</small>
          </span>
          <button class="button" onClick={() => setBrush(null)}>
            {s.farm.done}
          </button>
        </div>
      )}

      {showInstallHint && <InstallHint onDone={() => store.run((draft) => markSeen(draft, 'installHint'))} />}

      {updateReady && !busy && (
        <div class="update-note" role="status">
          <span>{s.update.ready}</span>
          <button
            class="button"
            onClick={() => {
              store.save();
              updateNow();
            }}
          >
            {s.update.reload}
          </button>
        </div>
      )}

      {toast && (
        <div class="toast" role="status" key={toast.id}>
          <span>{toast.text}</span>
          {toast.coins !== undefined && (
            <span class="reward">
              <Icon name="ui/coin" />+{toast.coins}
            </span>
          )}
          {toast.xp !== undefined && (
            <span class="reward">
              <Icon name="ui/star" />+{toast.xp}
            </span>
          )}
          {toast.openBarn && (
            <button
              class="button"
              onClick={() => {
                setToast(null);
                openPanel({ type: 'barn' });
              }}
            >
              {s.barn.open}
            </button>
          )}
        </div>
      )}

      {panel?.type === 'seeds' && (
        <SeedPicker
          state={state}
          onClose={() => setPanel(null)}
          onPick={(cropId) => {
            const plotId = panel.plotId;
            setPanel(null);
            plant(plotId, cropId);
          }}
        />
      )}
      {panel?.type === 'orders' && (
        <OrdersPanel
          state={state}
          onClose={() => setPanel(null)}
          onDeliver={(slot) => act((draft) => fulfillOrder(draft, slot))}
          onSkip={(slot) => act((draft) => skipOrder(draft, slot))}
        />
      )}
      {panel?.type === 'barn' && (
        <BarnPanel
          state={state}
          onClose={() => setPanel(null)}
          onSell={(item, qty) => act((draft) => sellItems(draft, item, qty))}
          onUpgrade={() => act(upgradeBarn)}
        />
      )}
      {panel?.type === 'shop' && (
        <ShopPanel
          state={state}
          onClose={() => setPanel(null)}
          onBuy={startBuying}
          onMove={() => {
            sfx.tap();
            setPanel(null);
            setPicking(true);
          }}
        />
      )}
      {pen && (
        <PenPanel
          state={state}
          pen={pen}
          onClose={() => setPanel(null)}
          onFeed={() => act((draft) => feedAnimals(draft, pen.id))}
          onCollect={() => act((draft) => collectFromPen(draft, pen.id))}
          onBuyAnimal={() => act((draft) => buyAnimal(draft, pen.id))}
        />
      )}
      {maker && (
        <MakerPanel
          state={state}
          maker={maker}
          onClose={() => setPanel(null)}
          onMake={(recipeId) => act((draft) => startRecipe(draft, maker.id, recipeId))}
          onCollect={() => act((draft) => collectFromMaker(draft, maker.id))}
          onBuySlot={() => act((draft) => buyQueueSlot(draft, maker.id))}
        />
      )}
      {patch && (
        <PatchPanel
          state={state}
          patch={patch}
          onClose={() => setPanel(null)}
          onBuy={() => {
            if (act((draft) => buyPatch(draft, patch.id)).ok) setPanel(null);
          }}
        />
      )}
      {panel?.type === 'settings' && (
        <SettingsPanel
          store={store}
          sound={state.settings.sound}
          onSound={(on) => {
            setSoundEnabled(on);
            store.run((draft) => setSound(draft, on));
            if (on) sfx.coin();
          }}
          onClose={() => setPanel(null)}
          onLoadBackup={loadBackup}
          onNewFarm={() => void startNewFarm()}
        />
      )}

      {levelUp && <LevelUp event={levelUp} onClose={() => setLevelUps((list) => list.slice(1))} />}
    </div>
  );
}
