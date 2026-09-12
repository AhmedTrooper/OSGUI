import { Show, type JSX } from "solid-js";
import { Checkbox as KCheckbox } from "@kobalte/core/checkbox";
import { Check } from "lucide-solid";
import { cn } from "@/utils/cn";

export interface CheckboxProps {
  checked: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
  label?: JSX.Element | string;
  color?: "blue" | "purple" | "amber";
  size?: "sm" | "md";
  class?: string;
  id?: string;
  title?: string;
  ariaLabel?: string;
}

export function Checkbox(props: CheckboxProps): JSX.Element {
  const color = () => props.color ?? "blue";
  const size = () => props.size ?? "md";

  return (
    <KCheckbox
      checked={props.checked}
      onChange={(checked: boolean) => {
        props.onChange?.(checked);
      }}
      disabled={props.disabled ?? false}
      class={cn(
        "inline-flex items-center gap-2 cursor-pointer select-none group",
        props.disabled && "cursor-not-allowed opacity-50",
        props.class,
      )}
      title={props.title}
      aria-label={props.ariaLabel}
    >
      <KCheckbox.Input class="sr-only" />
      <KCheckbox.Control
        class={cn(
          "rounded-md flex items-center justify-center transition-all duration-150 border",
          size() === "sm" ? "w-3.5 h-3.5" : "w-4 h-4",
          props.checked
            ? color() === "amber"
              ? "bg-amber-500 border-amber-500 text-white shadow-xs ring-1 ring-amber-500/20"
              : color() === "purple"
                ? "bg-purple-600 border-purple-600 text-white shadow-xs ring-1 ring-purple-500/20"
                : "bg-blue-600 border-blue-600 text-white shadow-xs ring-1 ring-blue-500/20"
            : "bg-white dark:bg-zinc-950 border-zinc-300 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-600 group-hover:border-zinc-400 dark:group-hover:border-zinc-500",
          "focus-visible:ring-2 focus-visible:ring-blue-500/50 focus-visible:ring-offset-1 dark:focus-visible:ring-offset-zinc-900 outline-none",
        )}
      >
        <KCheckbox.Indicator class="flex items-center justify-center text-white">
          <Check class={size() === "sm" ? "w-2.5 h-2.5 stroke-[3]" : "w-3 h-3 stroke-[3]"} />
        </KCheckbox.Indicator>
      </KCheckbox.Control>
      <Show when={props.label}>
        <KCheckbox.Label class="text-xs font-medium text-zinc-700 dark:text-zinc-300 cursor-pointer">
          {props.label}
        </KCheckbox.Label>
      </Show>
    </KCheckbox>
  );
}
