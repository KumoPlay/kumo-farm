import { goods, pens } from './animals';
import { crops } from './crops';
import { decorations } from './decorations';
import { makers, recipes } from './makers';
import { objects } from './objects';
import { patches } from './patches';
import type { CropDef, DecoDef, ItemDef, MakerDef, ObjectDef, PatchDef, PenDef, RecipeDef } from './types';

export { goods, pens } from './animals';
export { balance } from './balance';
export { crops } from './crops';
export { customers } from './customers';
export { decorations } from './decorations';
export { levels } from './levels';
export { makers, recipes } from './makers';
export { objects } from './objects';
export { patches, startLayout } from './patches';
export type * from './types';

function byId<T extends { id: string }>(list: T[]): Map<string, T> {
  return new Map(list.map((entry) => [entry.id, entry]));
}

/** Every item that can be stored in the barn, in display order. */
export const items: ItemDef[] = [...crops, ...goods, ...recipes];

/** Everything that can stand on the farm grid, with its size. */
export const allObjects: ObjectDef[] = [...objects, ...pens, ...makers, ...decorations];

const cropMap = byId(crops);
const itemMap = byId(items);
const objectMap = byId(allObjects);
const patchMap = byId(patches);
const penMap = byId(pens);
const makerMap = byId(makers);
const recipeMap = byId(recipes);
const decoMap = byId(decorations);

export const getCrop = (id: string): CropDef | undefined => cropMap.get(id);
export const getItem = (id: string): ItemDef | undefined => itemMap.get(id);
export const getObjectDef = (id: string): ObjectDef | undefined => objectMap.get(id);
export const getPatch = (id: string): PatchDef | undefined => patchMap.get(id);
export const getPen = (id: string): PenDef | undefined => penMap.get(id);
export const getMaker = (id: string): MakerDef | undefined => makerMap.get(id);
export const getRecipe = (id: string): RecipeDef | undefined => recipeMap.get(id);
export const getDeco = (id: string): DecoDef | undefined => decoMap.get(id);

export const recipesOf = (makerId: string): RecipeDef[] => recipes.filter((recipe) => recipe.maker === makerId);
