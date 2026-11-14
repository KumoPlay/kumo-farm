/**
 * Every word the player can read, in English. To add a language, copy this
 * file (for example to th.ts), translate the values, and register it in index.ts.
 * Text in {curly braces} is filled in by the game; keep those words as they are.
 */
export const en = {
  title: 'Kumo Farm',
  loading: 'Waking up the farm…',

  items: {
    oat: 'Oat',
    carrot: 'Carrot',
    strawberry: 'Strawberry',
    sunflower: 'Sunflower',
    'moon-melon': 'Moon Melon',
    egg: 'Egg',
    milk: 'Milk',
    'oat-bread': 'Oat Bread',
    'carrot-muffin': 'Carrot Muffin',
    'sunflower-cookie': 'Sunflower Cookie',
    'berry-milk': 'Berry Milk',
    cheese: 'Cheese',
    'moon-melon-ice-cream': 'Moon Melon Ice Cream',
  } as Record<string, string>,

  /** Things that stand on the farm. */
  objects: {
    plot: 'Field Plot',
    barn: 'Barn',
    board: 'Orders Board',
    coop: 'Hen Coop',
    meadow: 'Goat Meadow',
    oven: 'Cloud Oven',
    creamery: 'Creamery',
    'flower-bed': 'Flower Bed',
    fence: 'Fence',
    lantern: 'Lantern',
    pinwheel: 'Pinwheel',
    bench: 'Bench',
    pond: 'Little Pond',
    'rainbow-arch': 'Rainbow Arch',
  } as Record<string, string>,

  animals: {
    hen: 'Hen',
    goat: 'Goat',
  } as Record<string, string>,

  customers: {
    poko: 'Poko',
    nimbus: 'Granny Nimbus',
    breeze: 'Captain Breeze',
    lulu: 'Lulu',
  } as Record<string, string>,

  time: {
    seconds: '{n}s',
    minutes: '{n}m',
    hours: '{n}h',
  },

  hud: {
    level: 'Level {n}',
    xp: '{xp} of {goal} XP',
    coins: '{n} coins',
    orders: 'Orders',
    barn: 'Barn',
    shop: 'Shop',
    settings: 'Settings',
    close: 'Close',
  },

  farm: {
    hint: 'Tap a plot to plant',
    emptyPlot: 'Empty plot',
    growing: '{item}, ready in {time}',
    ready: '{item}, ready to harvest',
    planting: 'Planting {item}',
    plantingHelp: 'Tap empty plots',
    done: 'Done',
    readyCount: '{name}: {n} ready',
    hungry: '{name}: hungry',
    busy: '{name}: ready in {time}',
    lockedPatch: 'Cloud patch, from level {n}',
    buyPatch: 'Cloud patch for {n} coins',
  },

  pen: {
    hungry: 'Hungry',
    ready: 'Ready',
    feed: 'Feed',
    collect: 'Collect',
    eats: 'Eats',
    makes: 'Makes',
    add: 'Add a {animal}',
    noFeed: 'Not enough {item} in the barn',
    full: 'All the homes are taken',
  },

  maker: {
    queue: 'Making',
    emptySlot: 'Free',
    moreSpace: 'One more place',
    collect: 'Collect',
    make: 'Make',
    queueFull: 'The queue is full',
    atLevel: 'Level {n}',
  },

  shop: {
    title: 'Shop',
    move: 'Move things',
    farm: 'Farm',
    animals: 'Animals',
    buildings: 'Buildings',
    decorations: 'Decorations',
    buy: 'Buy',
    atLevel: 'Level {n}',
    owned: 'You have {n}',
    ownedOf: 'You have {n} of {limit}',
    haveAll: 'You have them all',
    moreAtLevel: 'More plots at level {n}',
    noRoom: 'No room left. Try moving things, or get a new cloud patch.',
  },

  place: {
    buyHelp: 'Tap the farm to pick a spot',
    moveHelp: 'Tap the farm to pick a new spot',
    pick: 'Tap something to move it',
    place: 'Place',
    cancel: 'Cancel',
    done: 'Done',
    sellBack: 'Put away',
    blocked: 'It does not fit there',
  },

  patch: {
    title: 'A new cloud patch',
    text: 'More room for your farm.',
    lockedText: 'You can get this cloud patch at level {n}.',
    buy: 'Get it',
    ok: 'OK',
    bought: 'Your island grew!',
  },

  seeds: {
    title: 'Pick a seed',
    atLevel: 'Level {n}',
  },

  orders: {
    title: 'Orders',
    deliver: 'Deliver',
    skip: 'Skip',
    onTheWay: 'A new order is on its way',
    arrivesIn: 'About {time}',
    have: '{have} of {need}',
    done: 'Order delivered!',
  },

  barn: {
    title: 'Barn',
    space: '{used} of {cap}',
    empty: 'Nothing here yet. Harvest a crop!',
    sellOne: 'Sell 1',
    sellAll: 'Sell all {n}',
    upgrade: 'Make room for {cap}',
    biggest: 'This is the biggest barn',
    full: 'The barn is full',
    open: 'Open barn',
  },

  levelUp: {
    title: 'Level {n}!',
    crop: 'New seed',
    pen: 'New animals',
    maker: 'New building',
    recipe: 'New recipe',
    deco: 'New decoration',
    patch: 'New cloud patch',
    patchName: 'More room',
    ok: 'Yay!',
  },

  settings: {
    title: 'Settings',
    soundTitle: 'Sound',
    soundOn: 'Sounds are on',
    soundOff: 'Sounds are off',
    installTitle: 'Home screen',
    backupTitle: 'Backup',
    backupHelp: 'Your farm is saved on this device. A backup lets you keep it safe or move it to another device.',
    copyCode: 'Copy backup code',
    copied: 'Copied!',
    copyFailed: 'Select the code below and copy it',
    saveFile: 'Save backup file',
    loadTitle: 'Load a backup',
    loadHelp: 'Paste a backup code here, or pick a backup file.',
    codePlaceholder: 'KUMO1…',
    chooseFile: 'Pick a file',
    load: 'Load backup',
    loadConfirmTitle: 'Load this backup?',
    loadConfirmText: 'It will replace the farm on this device.',
    loadYes: 'Load it',
    loaded: 'Backup loaded',
    badCode: 'That is not a Kumo Farm backup code.',
    brokenCode: 'This code looks cut off or changed. Try copying it again.',
    newerCode: 'This backup is from a newer Kumo Farm. Reload the game to update, then try again.',
    storageSafe: 'This browser will keep your farm.',
    storageMaybe: 'Some browsers clear saved games after a few weeks without a visit. A backup keeps your farm safe.',
    storageBroken: 'This browser is not saving right now. Make a backup before you leave!',
    newTitle: 'Start a new farm',
    newButton: 'Start a new farm…',
    newConfirmTitle: 'Start a new farm?',
    newConfirmText: 'Your farm, coins and levels will be deleted. This cannot be undone.',
    newYes: 'Delete and start new',
    keep: 'Keep my farm',
    cancel: 'Cancel',
    version: 'Kumo Farm {v}',
    madeBy: 'A KumoPlay game',
  },

  install: {
    why: 'Add Kumo Farm to your home screen. It opens like an app, works without internet, and your farm is kept safer there.',
    ios: 'Tap the Share button in your browser, then "Add to Home Screen".',
    other: 'Open your browser menu, then pick "Install" or "Add to Home screen".',
    add: 'Add to home screen',
    later: 'Not now',
    ok: 'OK',
    installed: 'Kumo Farm is on your home screen.',
  },

  update: {
    ready: 'A new version is ready',
    reload: 'Update',
  },

  recover: {
    title: 'Hmm, the saved farm will not open',
    corrupt: 'The save on this device looks damaged. If you have a backup code, you can load it.',
    tooNew: 'The save on this device is from a newer Kumo Farm. Reload to get the update.',
    reload: 'Reload',
    loadBackup: 'Load a backup',
    startNew: 'Start a new farm',
  },

  tabs: {
    title: 'Kumo Farm is open in another tab',
    text: 'Your farm is safe. Play in one tab at a time.',
    here: 'Play here',
  },
};

export type Strings = typeof en;
