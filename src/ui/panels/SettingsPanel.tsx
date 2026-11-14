import { useEffect, useState } from 'preact/hooks';
import { exportSaveCode, type GameState } from '../../core';
import { fmt, s } from '../../i18n';
import { copyText, downloadText } from '../../platform/files';
import { isInstalled } from '../../platform/install';
import { askToKeepStorage, isSavingWorking } from '../../platform/storage';
import { Icon } from '../Icon';
import { InstallSteps } from '../InstallHint';
import type { GameStore } from '../store';
import { BackupLoader } from './BackupLoader';
import { Confirm } from './Confirm';
import { Sheet } from './Sheet';

export function SettingsPanel({
  store,
  sound,
  onSound,
  onLoadBackup,
  onNewFarm,
  onClose,
}: {
  store: GameStore;
  sound: boolean;
  onSound: (on: boolean) => void;
  onLoadBackup: (state: GameState) => void;
  onNewFarm: () => void;
  onClose: () => void;
}) {
  const [copyNote, setCopyNote] = useState<string | null>(null);
  const [shownCode, setShownCode] = useState<string | null>(null);
  const [kept, setKept] = useState<boolean | null>(null);
  const [pendingBackup, setPendingBackup] = useState<GameState | null>(null);
  const [confirmNew, setConfirmNew] = useState(false);

  useEffect(() => {
    let active = true;
    void askToKeepStorage().then((answer) => {
      if (active) setKept(answer);
    });
    return () => {
      active = false;
    };
  }, []);

  const currentCode = (): string => exportSaveCode(store.getState(), store.getRev());

  const copy = async (): Promise<void> => {
    const code = currentCode();
    if (await copyText(code)) {
      setCopyNote(s.settings.copied);
      setShownCode(null);
    } else {
      // The browser would not copy for us: show the code so it can be copied by hand.
      setCopyNote(s.settings.copyFailed);
      setShownCode(code);
    }
  };

  if (pendingBackup) {
    return (
      <Confirm
        title={s.settings.loadConfirmTitle}
        text={s.settings.loadConfirmText}
        safeLabel={s.settings.cancel}
        dangerLabel={s.settings.loadYes}
        onSafe={() => setPendingBackup(null)}
        onDanger={() => onLoadBackup(pendingBackup)}
      />
    );
  }
  if (confirmNew) {
    return (
      <Confirm
        title={s.settings.newConfirmTitle}
        text={s.settings.newConfirmText}
        safeLabel={s.settings.keep}
        dangerLabel={s.settings.newYes}
        onSafe={() => setConfirmNew(false)}
        onDanger={onNewFarm}
      />
    );
  }

  const storageNote = !isSavingWorking()
    ? s.settings.storageBroken
    : kept
      ? s.settings.storageSafe
      : kept === false
        ? s.settings.storageMaybe
        : null;

  return (
    <Sheet title={s.settings.title} onClose={onClose}>
      <section class="settings-section">
        <h3>{s.settings.soundTitle}</h3>
        <button class="button" role="switch" aria-checked={sound} onClick={() => onSound(!sound)}>
          <Icon name={sound ? 'ui/sound-on' : 'ui/sound-off'} />
          {sound ? s.settings.soundOn : s.settings.soundOff}
        </button>
      </section>

      <section class="settings-section">
        <h3>{s.settings.installTitle}</h3>
        {isInstalled() ? (
          <p class="muted">{s.install.installed}</p>
        ) : (
          <>
            <p class="muted">{s.install.why}</p>
            <InstallSteps />
          </>
        )}
      </section>

      <section class="settings-section">
        <h3>{s.settings.backupTitle}</h3>
        <p class="muted">{s.settings.backupHelp}</p>
        {storageNote && <p class={isSavingWorking() ? 'note' : 'note note-warn'}>{storageNote}</p>}
        <div class="button-row">
          <button class="button" onClick={() => void copy()}>
            {s.settings.copyCode}
          </button>
          <button class="button" onClick={() => downloadText('kumo-farm-backup.txt', currentCode())}>
            {s.settings.saveFile}
          </button>
        </div>
        {copyNote && (
          <p class="note" role="status">
            {copyNote}
          </p>
        )}
        {shownCode && (
          <textarea
            class="code-box"
            rows={4}
            readOnly
            value={shownCode}
            onFocus={(event) => (event.currentTarget as HTMLTextAreaElement).select()}
          />
        )}
      </section>

      <section class="settings-section">
        <h3>{s.settings.loadTitle}</h3>
        <BackupLoader onLoad={setPendingBackup} />
      </section>

      <section class="settings-section">
        <h3>{s.settings.newTitle}</h3>
        <button class="button button-danger" onClick={() => setConfirmNew(true)}>
          {s.settings.newButton}
        </button>
      </section>

      <p class="made-by">
        <Icon name="app/kumoplay" />
        <span>
          {s.settings.madeBy}
          <small class="muted">{fmt(s.settings.version, { v: __APP_VERSION__ })}</small>
        </span>
      </p>
    </Sheet>
  );
}
