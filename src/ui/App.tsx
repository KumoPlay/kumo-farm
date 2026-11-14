import { useEffect, useRef, useState } from 'preact/hooks';
import { s } from '../i18n';
import { eraseGame, loadGame } from '../platform/storage';
import { watchForNewerTab } from '../platform/tabs';
import { Game } from './Game';
import { Icon } from './Icon';
import { BackupLoader } from './panels/BackupLoader';
import { Confirm } from './panels/Confirm';
import { GameStore } from './store';

type Boot =
  | { phase: 'loading' }
  | { phase: 'play'; store: GameStore }
  | { phase: 'unreadable'; reason: 'corrupt' | 'too-new' }
  | { phase: 'elsewhere' };

export function App() {
  const [boot, setBoot] = useState<Boot>({ phase: 'loading' });
  const [confirmNew, setConfirmNew] = useState(false);
  const storeRef = useRef<GameStore | null>(null);

  const play = (store: GameStore): void => {
    store.tick();
    storeRef.current = store;
    setBoot({ phase: 'play', store });
  };

  useEffect(() => {
    let active = true;
    // Tell other tabs first, so they stop saving before this one reads the save.
    const stopWatching = watchForNewerTab(() => {
      active = false;
      storeRef.current?.stop();
      setBoot({ phase: 'elsewhere' });
    });
    void loadGame(Date.now()).then((result) => {
      if (!active) return;
      if (result.status === 'unreadable') setBoot({ phase: 'unreadable', reason: result.reason });
      else play(result.status === 'loaded' ? new GameStore(result.state, result.rev) : GameStore.startNew());
    });
    return () => {
      active = false;
      stopWatching();
    };
  }, []);

  if (boot.phase === 'play') return <Game store={boot.store} />;

  if (boot.phase === 'loading') {
    return (
      <main class="screen">
        <Icon name="app/kumoplay" class="screen-mark" />
        <h1 class="screen-title">{s.title}</h1>
        <p class="muted">{s.loading}</p>
      </main>
    );
  }

  if (boot.phase === 'elsewhere') {
    return (
      <main class="screen">
        <div class="card">
          <h1>{s.tabs.title}</h1>
          <p class="muted">{s.tabs.text}</p>
          <button class="button button-go button-wide" onClick={() => location.reload()}>
            {s.tabs.here}
          </button>
        </div>
      </main>
    );
  }

  const startNew = async (): Promise<void> => {
    await eraseGame();
    setConfirmNew(false);
    play(GameStore.startNew());
  };

  return (
    <main class="screen">
      <div class="card">
        <h1>{s.recover.title}</h1>
        {boot.reason === 'too-new' ? (
          <>
            <p class="muted">{s.recover.tooNew}</p>
            <button class="button button-go button-wide" onClick={() => location.reload()}>
              {s.recover.reload}
            </button>
          </>
        ) : (
          <>
            <p class="muted">{s.recover.corrupt}</p>
            <BackupLoader
              onLoad={(state) => {
                const store = new GameStore(state, 0);
                store.save();
                play(store);
              }}
            />
            <button class="button button-danger" onClick={() => setConfirmNew(true)}>
              {s.recover.startNew}
            </button>
          </>
        )}
      </div>
      {confirmNew && (
        <Confirm
          title={s.settings.newConfirmTitle}
          text={s.settings.newConfirmText}
          safeLabel={s.settings.cancel}
          dangerLabel={s.settings.newYes}
          onSafe={() => setConfirmNew(false)}
          onDanger={() => void startNew()}
        />
      )}
    </main>
  );
}
