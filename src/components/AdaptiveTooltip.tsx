import { createSignal, type JSX } from "solid-js";
import { Tooltip } from "@kobalte/core/tooltip";

export type TooltipPlacement =
  | "top"
  | "bottom"
  | "left"
  | "right"
  | "top-start"
  | "top-end"
  | "bottom-start"
  | "bottom-end"
  | "left-start"
  | "left-end"
  | "right-start"
  | "right-end";

export interface AdaptiveTooltipProps {
  content: JSX.Element | string;
  children: JSX.Element;
  preferredPlacement?: "top" | "bottom" | "left" | "right";
  openDelay?: number;
  closeDelay?: number;
  disabled?: boolean;
  class?: string;
  triggerClass?: string;
}

/**
 * Calculates tooltip placement adaptively based on the trigger element's
 * real-time coordinates within the native window boundaries.
 */
export function computeNativeWindowPlacement(
  el: HTMLElement | null,
  preferred?: "top" | "bottom" | "left" | "right",
): TooltipPlacement {
  if (!el || typeof window === "undefined") {
    return preferred ?? "top";
  }
  const rect = el.getBoundingClientRect();
  const winHeight = window.innerHeight;
  const winWidth = window.innerWidth;

  const canTop = rect.top >= 70;
  const canBottom = winHeight - rect.bottom >= 70;
  const canLeft = rect.left >= 120;
  const canRight = winWidth - rect.right >= 120;

  if (preferred === "left") {
    if (canLeft) return "left";
    if (canRight) return "right";
    return canTop ? "top" : "bottom";
  }

  if (preferred === "right") {
    if (canRight) return "right";
    if (canLeft) return "left";
    return canTop ? "top" : "bottom";
  }

  if (preferred === "bottom") {
    if (canBottom) return "bottom";
    if (canTop) return "top";
    return canRight ? "right" : "left";
  }

  if (preferred === "top") {
    if (canTop) return "top";
    if (canBottom) return "bottom";
    return canRight ? "right" : "left";
  }

  // Automatic native placement: if element is in the top 40% of the window,
  // place below to avoid window title bar collisions. If in the bottom 40%,
  // place above.
  if (rect.top < winHeight * 0.4) {
    return canBottom ? "bottom" : "top";
  }
  if (rect.bottom > winHeight * 0.6) {
    return canTop ? "top" : "bottom";
  }
  return canTop ? "top" : "bottom";
}

export function AdaptiveTooltip(props: AdaptiveTooltipProps): JSX.Element {
  let triggerRef: HTMLDivElement | undefined;
  const [placement, setPlacement] = createSignal<TooltipPlacement>(
    props.preferredPlacement ?? "top",
  );

  const updatePlacement = (): void => {
    if (triggerRef) {
      setPlacement(computeNativeWindowPlacement(triggerRef, props.preferredPlacement));
    }
  };

  return (
    <Tooltip
      openDelay={props.openDelay ?? 150}
      closeDelay={props.closeDelay ?? 80}
      placement={placement()}
      flip={true}
      slide={true}
      fitViewport={true}
      overflowPadding={12}
      gutter={6}
    >
      <Tooltip.Trigger
        as="div"
        ref={(el: HTMLDivElement) => {
          triggerRef = el;
        }}
        onPointerEnter={updatePlacement}
        onFocus={updatePlacement}
        class={props.triggerClass ?? "inline-flex items-center justify-center"}
      >
        {props.children}
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content
          class={`bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 text-[11px] font-semibold px-2.5 py-1 rounded-lg shadow-xl border border-zinc-800 dark:border-zinc-200 z-[9999] pointer-events-none select-none max-w-xs animate-in fade-in zoom-in-95 duration-100 ${
            props.class ?? ""
          }`}
        >
          <Tooltip.Arrow class="text-zinc-900 dark:text-zinc-100 fill-current" />
          {props.content}
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip>
  );
}
