import { useLayoutEffect, useRef, useState } from 'preact/hooks';
import { art } from '../../art';
import { getObjectDef, getPatch, getPen, type PatchDef } from '../../content';
import {
  barnFree,
  canFulfill,
  defIdOf,
  jobStatus,
  makerSummary,
  nextPatches,
  penSummary,
  plotGrowth,
  type FarmObject,
  type GameState,
  type MakerObject,
  type PenObject,
  type PlotObject,
} from '../../core';
import { fmt, formatDuration, itemName, objectName, s } from '../../i18n';
import { Icon } from '../Icon';

/** A little number that floats up from a tile, for example "+1" after a harvest. */
export interface Floater {
  id: number;
  x: number;
  y: number;
  icon: string;
  text: string;
  lucky: boolean;
}

/** What the farm is being used for right now. */
export type FarmMode =
  | { type: 'play' }
  /** Tap something to pick it up. */
  | { type: 'pick' }
  /** Something is being placed: a new purchase, or (with movingId) a thing being moved. */
  | { type: 'place'; def: string; x: number; y: number; valid: boolean; movingId?: number };

/** How many tiles should fit across the screen: the home patch plus a little cloud. */
const FIT_TILES = 7.1;
const MIN_TILE = 46;
const MAX_TILE = 96;
/** How far the cloud sticks out past the tiles, in tiles. */
const CLOUD_RIM = 0.85;
/** How far the grass sticks out past the tiles on a free side, in tiles. */
const GRASS_RIM = 1 / 6;
/** A press that moves less than this many pixels is a tap, not a drag. */
const DRAG_START = 8;

/** Screen space taken by the bars, so the farm is centred in what is left. Matches main.css. */
function barSpace(width: number, height: number): { top: number; right: number; bottom: number } {
  const sideBar = width > height && height < 520;
  return sideBar ? { top: 60, right: 100, bottom: 8 } : { top: 68, right: 0, bottom: 104 };
}

function box(x: number, y: number, w: number, h: number): Record<string, string> {
  return { '--x': String(x), '--y': String(y), '--w': String(w), '--h': String(h) };
}

function sizeOf(defId: string): { w: number; h: number } {
  const def = getObjectDef(defId);
  return { w: def?.w ?? 1, h: def?.h ?? 1 };
}

/** The picture for something on the farm (plots use the soil tile). */
export function objectPicture(defId: string): string {
  return defId === 'plot' ? 'tiles/soil' : `buildings/${defId}`;
}

function PlotTile({ state, plot, onTap }: { state: GameState; plot: PlotObject; onTap: () => void }) {
  const growth = plotGrowth(state, plot);
  const name = plot.crop ? itemName(plot.crop) : '';
  const label =
    growth.stage === 'empty'
      ? s.farm.emptyPlot
      : growth.stage === 'ready'
        ? fmt(s.farm.ready, { item: name })
        : fmt(s.farm.growing, { item: name, time: formatDuration(growth.remainingMs) });
  const picture =
    growth.stage === 'empty' || !plot.crop
      ? null
      : growth.stage === 'sprout'
        ? 'crops/sprout'
        : `crops/${plot.crop}-${growth.stage}`;

  return (
    <button class={`tile-box thing plot plot-${growth.stage}`} style={box(plot.x, plot.y, 1, 1)} aria-label={label} onClick={onTap}>
      <img class="soil" src={art('tiles/soil')} alt="" draggable={false} />
      {picture && <img class="crop" key={picture} src={art(picture)} alt="" draggable={false} />}
      {(growth.stage === 'sprout' || growth.stage === 'growing') && (
        <span class="grow-bar">
          <span style={{ width: `${Math.round(growth.progress * 100)}%` }} />
        </span>
      )}
      {growth.stage === 'ready' && <img class="ready-spark" src={art('ui/sparkle')} alt="" draggable={false} />}
    </button>
  );
}

function PenTile({ state, pen, onTap }: { state: GameState; pen: PenObject; onTap: () => void }) {
  const def = getPen(pen.def);
  const summary = penSummary(state, pen);
  const name = objectName(pen.def);
  const label =
    summary.ready > 0
      ? fmt(s.farm.readyCount, { name, n: summary.ready })
      : summary.busy > 0
        ? fmt(s.farm.busy, { name, time: formatDuration(summary.nextReadyMs) })
        : summary.hungry > 0
          ? fmt(s.farm.hungry, { name })
          : name;
  const { w, h } = sizeOf(pen.def);
  return (
    <button class={`tile-box thing building pen pen-${pen.def}`} style={box(pen.x, pen.y, w, h)} aria-label={label} onClick={onTap}>
      <img class="art" src={art(`buildings/${pen.def}`)} alt="" draggable={false} />
      {def &&
        pen.animals.map((_, index) => (
          <img key={index} class={`animal animal-${index}`} src={art(`animals/${def.animal}`)} alt="" draggable={false} />
        ))}
      {def && summary.ready > 0 && <Icon name={`items/${def.product}`} class="pin pin-item" />}
      {summary.ready === 0 && summary.busy === 0 && summary.hungry > 0 && <Icon name="ui/hungry" class="pin pin-quiet" />}
    </button>
  );
}

function MakerTile({ state, maker, onTap }: { state: GameState; maker: MakerObject; onTap: () => void }) {
  const summary = makerSummary(state, maker);
  const name = objectName(maker.def);
  const doneJob = maker.jobs.find((job) => jobStatus(state, job).stage === 'done');
  const making = maker.jobs.map((job) => jobStatus(state, job)).find((status) => status.stage === 'making');
  const label =
    summary.done > 0
      ? fmt(s.farm.readyCount, { name, n: summary.done })
      : summary.busy > 0
        ? fmt(s.farm.busy, { name, time: formatDuration(summary.nextReadyMs) })
        : name;
  const { w, h } = sizeOf(maker.def);
  return (
    <button class="tile-box thing building" style={box(maker.x, maker.y, w, h)} aria-label={label} onClick={onTap}>
      <img class="art" src={art(`buildings/${maker.def}`)} alt="" draggable={false} />
      {doneJob && <Icon name={`items/${doneJob.recipe}`} class="pin pin-item" />}
      {!doneJob && making && (
        <span class="grow-bar grow-bar-big">
          <span style={{ width: `${Math.round(making.progress * 100)}%` }} />
        </span>
      )}
    </button>
  );
}

export function FarmView({
  state,
  mode,
  peekPlotId,
  floaters,
  onObject,
  onPatch,
  onGhostMove,
}: {
  state: GameState;
  mode: FarmMode;
  peekPlotId: number | null;
  floaters: Floater[];
  onObject: (object: FarmObject) => void;
  onPatch: (patch: PatchDef) => void;
  onGhostMove: (x: number, y: number) => void;
}) {
  const viewRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState({ w: 0, h: 0 });
  /** Where the player dragged the farm to; null means "keep the home patch centred". */
  const [dragged, setDragged] = useState<{ x: number; y: number } | null>(null);
  const press = useRef<{
    id: number;
    x: number;
    y: number;
    panX: number;
    panY: number;
    moved: boolean;
    /** Set when the press began on the thing being placed: dragging moves it, not the farm. */
    ghost: { x: number; y: number } | null;
  } | null>(null);
  const lastDragEnd = useRef(Number.NEGATIVE_INFINITY);

  useLayoutEffect(() => {
    const element = viewRef.current;
    if (!element) return;
    const measure = (): void => setView({ w: element.clientWidth, h: element.clientHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const owned = state.patches.map(getPatch).filter((patch): patch is PatchDef => patch !== undefined);
  const upcoming = nextPatches(state);
  const shown = [...owned, ...upcoming];
  const minX = Math.min(...shown.map((patch) => patch.x));
  const minY = Math.min(...shown.map((patch) => patch.y));
  const maxX = Math.max(...shown.map((patch) => patch.x + patch.w));
  const maxY = Math.max(...shown.map((patch) => patch.y + patch.h));
  const home = getPatch('home') ?? owned[0] ?? { x: 0, y: 0, w: 6, h: 6 };

  const bars = barSpace(view.w, view.h);
  const roomW = Math.max(1, view.w - bars.right);
  const roomH = Math.max(1, view.h - bars.top - bars.bottom);
  const tile = Math.round(Math.min(MAX_TILE, Math.max(MIN_TILE, Math.min(roomW, roomH) / FIT_TILES)));
  const centreX = roomW / 2;
  const centreY = bars.top + roomH / 2;

  // The farm can be dragged until its edge reaches the middle of the screen, never further.
  const clampPan = (x: number, y: number): { x: number; y: number } => ({
    x: Math.min(centreX - (minX - CLOUD_RIM) * tile, Math.max(centreX - (maxX + CLOUD_RIM) * tile, x)),
    y: Math.min(centreY - (minY - CLOUD_RIM) * tile, Math.max(centreY - (maxY + CLOUD_RIM) * tile, y)),
  });
  const pan = dragged
    ? clampPan(dragged.x, dragged.y)
    : { x: centreX - (home.x + home.w / 2) * tile, y: centreY - (home.y + home.h / 2) * tile };

  const onPointerDown = (event: PointerEvent): void => {
    if (press.current || (event.pointerType === 'mouse' && event.button !== 0)) return;
    const onGhost = mode.type === 'place' && (event.target as Element | null)?.closest('.ghost') !== null;
    press.current = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      panX: pan.x,
      panY: pan.y,
      moved: false,
      ghost: onGhost && mode.type === 'place' ? { x: mode.x, y: mode.y } : null,
    };
  };
  const onPointerMove = (event: PointerEvent): void => {
    const start = press.current;
    if (!start || start.id !== event.pointerId) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (!start.moved) {
      if (Math.hypot(dx, dy) < DRAG_START) return;
      start.moved = true;
      try {
        viewRef.current?.setPointerCapture(event.pointerId);
      } catch {
        // Dragging still works without capture.
      }
    }
    if (start.ghost) onGhostMove(start.ghost.x + Math.round(dx / tile), start.ghost.y + Math.round(dy / tile));
    else setDragged(clampPan(start.panX + dx, start.panY + dy));
  };
  const onPointerEnd = (event: PointerEvent): void => {
    const start = press.current;
    if (!start || start.id !== event.pointerId) return;
    if (start.moved) lastDragEnd.current = performance.now();
    press.current = null;
  };
  // The tap that ends a drag must not also plant, harvest or place.
  const onClickCapture = (event: MouseEvent): void => {
    if (performance.now() - lastDragEnd.current < 300) {
      event.stopPropagation();
      event.preventDefault();
    }
  };
  // While placing, a tap anywhere on the farm puts the thing there (centred on the tapped tile).
  const onClick = (event: MouseEvent): void => {
    if (mode.type !== 'place' || !viewRef.current) return;
    // A tap on the thing itself leaves it where it is.
    if ((event.target as Element | null)?.closest('.ghost')) return;
    const rect = viewRef.current.getBoundingClientRect();
    const size = sizeOf(mode.def);
    const tileX = (event.clientX - rect.left - pan.x) / tile;
    const tileY = (event.clientY - rect.top - pan.y) / tile;
    onGhostMove(Math.floor(tileX - (size.w - 1) / 2), Math.floor(tileY - (size.h - 1) / 2));
  };

  const objects = [...state.objects].sort((a, b) => a.y - b.y || a.x - b.x);
  const readyOrders = state.orders.filter((slot) => slot.order && canFulfill(state, slot.order)).length;
  const peekPlot = state.objects.find(
    (object): object is PlotObject => object.kind === 'plot' && object.id === peekPlotId,
  );
  const peekGrowth = peekPlot ? plotGrowth(state, peekPlot) : null;
  const movingId = mode.type === 'place' ? mode.movingId : undefined;

  const renderObject = (object: FarmObject) => {
    if (object.id === movingId) return null;
    const onTap = (): void => onObject(object);
    if (object.kind === 'plot') return <PlotTile key={object.id} state={state} plot={object} onTap={onTap} />;
    if (object.kind === 'pen') return <PenTile key={object.id} state={state} pen={object} onTap={onTap} />;
    if (object.kind === 'maker') return <MakerTile key={object.id} state={state} maker={object} onTap={onTap} />;
    const defId = defIdOf(object);
    const { w, h } = sizeOf(defId);
    return (
      <button
        key={object.id}
        class={`tile-box thing building ${object.kind === 'deco' ? 'deco' : ''}`}
        style={box(object.x, object.y, w, h)}
        aria-label={objectName(defId)}
        onClick={onTap}
      >
        <img class="art" src={art(objectPicture(defId))} alt="" draggable={false} />
        {object.kind === 'board' && readyOrders > 0 && <Icon name="ui/check" class="pin" />}
        {object.kind === 'barn' && barnFree(state) === 0 && <span class="pin pin-text">{s.barn.full}</span>}
      </button>
    );
  };

  const hasOwned = (x: number, y: number): boolean =>
    owned.some((patch) => x >= patch.x && x < patch.x + patch.w && y >= patch.y && y < patch.y + patch.h);

  /** Grass for one patch. Sides that touch another owned patch join up; free sides get a soft rim. */
  const renderMeadow = (patch: PatchDef) => {
    const left = hasOwned(patch.x - 1, patch.y) ? 0 : GRASS_RIM;
    const right = hasOwned(patch.x + patch.w, patch.y) ? 0 : GRASS_RIM;
    const top = hasOwned(patch.x, patch.y - 1) ? 0 : GRASS_RIM;
    const bottom = hasOwned(patch.x, patch.y + patch.h) ? 0 : GRASS_RIM;
    const round = (a: number, b: number): string => (a > 0 && b > 0 ? 'calc(var(--t) * 0.55)' : '0');
    const x = patch.x - left;
    const y = patch.y - top;
    return (
      <div
        key={`meadow-${patch.id}`}
        class="tile-box meadow"
        style={{
          ...box(x, y, patch.w + left + right, patch.h + top + bottom),
          backgroundImage: `url("${art('world/meadow-tile')}")`,
          backgroundPosition: `calc(var(--t) * ${-(((x % 2) + 2) % 2)}) calc(var(--t) * ${-(((y % 2) + 2) % 2)})`,
          borderRadius: `${round(top, left)} ${round(top, right)} ${round(bottom, right)} ${round(bottom, left)}`,
        }}
      />
    );
  };

  const cloudBox = (patch: PatchDef): Record<string, string> =>
    box(patch.x - 5 / 6, patch.y - 5 / 6, patch.w + 10 / 6, patch.h + 12 / 6);

  const ghostSize = mode.type === 'place' ? sizeOf(mode.def) : null;
  const viewClass = ['farm-view', press.current?.moved ? 'farm-view-dragging' : '', `farm-${mode.type}`].join(' ');

  return (
    <div
      class={viewClass}
      ref={viewRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
      onClickCapture={onClickCapture}
      onClick={onClick}
      onScroll={(event) => {
        // The farm moves only by dragging. Undo any scroll the browser does by itself (for example on focus).
        const element = event.currentTarget as HTMLDivElement;
        if (element.scrollLeft !== 0 || element.scrollTop !== 0) element.scrollTo(0, 0);
      }}
    >
      <div class="sky" aria-hidden="true">
        <img class="drift drift-1" src={art('world/cloud')} alt="" draggable={false} />
        <img class="drift drift-2" src={art('world/cloud')} alt="" draggable={false} />
        <img class="drift drift-3" src={art('world/cloud')} alt="" draggable={false} />
      </div>
      {view.w > 0 && (
        <div
          class="world"
          style={{ transform: `translate3d(${Math.round(pan.x)}px, ${Math.round(pan.y)}px, 0)`, '--t': `${tile}px` }}
        >
          {upcoming.map((patch) => (
            <img
              key={`locked-${patch.id}`}
              class="tile-box patch-art patch-locked"
              style={cloudBox(patch)}
              src={art('world/patch-cloud')}
              alt=""
              draggable={false}
            />
          ))}
          {owned.map((patch) => (
            <img
              key={`cloud-${patch.id}`}
              class="tile-box patch-art"
              style={cloudBox(patch)}
              src={art('world/patch-cloud')}
              alt=""
              draggable={false}
            />
          ))}
          {[...owned].sort((a, b) => a.y - b.y || a.x - b.x).map(renderMeadow)}
          {upcoming.map((patch) => {
            const locked = state.level < patch.unlockLevel;
            return (
              <button
                key={`sign-${patch.id}`}
                class="tile-box thing patch-sign"
                style={box(patch.x + patch.w / 2 - 1, patch.y + patch.h / 2 - 1, 2, 2)}
                aria-label={
                  locked ? fmt(s.farm.lockedPatch, { n: patch.unlockLevel }) : fmt(s.farm.buyPatch, { n: patch.cost })
                }
                onClick={() => onPatch(patch)}
              >
                <img class="art" src={art('world/sign')} alt="" draggable={false} />
                <span class="sign-text">
                  <Icon name={locked ? 'ui/lock' : 'ui/coin'} />
                  {locked ? patch.unlockLevel : patch.cost}
                </span>
              </button>
            );
          })}
          {objects.map(renderObject)}
          {mode.type === 'place' && ghostSize && (
            <div
              class={mode.valid ? 'tile-box ghost ghost-ok' : 'tile-box ghost ghost-blocked'}
              style={box(mode.x, mode.y, ghostSize.w, ghostSize.h)}
            >
              <img class="art" src={art(objectPicture(mode.def))} alt="" draggable={false} />
            </div>
          )}
          {peekPlot && peekGrowth && peekPlot.crop && peekGrowth.stage !== 'ready' && (
            <div class="tile-box bubble-anchor" style={box(peekPlot.x, peekPlot.y, 1, 1)}>
              <div class="bubble" role="status">
                <Icon name={`items/${peekPlot.crop}`} />
                <span>{itemName(peekPlot.crop)}</span>
                <Icon name="ui/clock" />
                <span>{formatDuration(peekGrowth.remainingMs)}</span>
              </div>
            </div>
          )}
          {floaters.map((floater) => (
            <div key={floater.id} class="tile-box bubble-anchor" style={box(floater.x, floater.y, 1, 1)}>
              <div class={floater.lucky ? 'floater floater-lucky' : 'floater'}>
                <Icon name={floater.icon} />
                <span>{floater.text}</span>
                {floater.lucky && <Icon name="ui/sparkle" />}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
