import { art } from '../art';

/** A picture from src/art, by name: <Icon name="items/oat" />. Decorative unless `label` is given. */
export function Icon({ name, label, class: className }: { name: string; label?: string; class?: string }) {
  return (
    <img
      class={className ? `icon ${className}` : 'icon'}
      src={art(name)}
      alt={label ?? ''}
      aria-hidden={label ? undefined : true}
      draggable={false}
    />
  );
}
