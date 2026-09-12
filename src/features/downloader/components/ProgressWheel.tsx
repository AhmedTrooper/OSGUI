import type { JSX } from "solid-js";

export interface ProgressWheelProps {
  progress: number;
  size?: number;
  strokeWidth?: number;
}

export function ProgressWheel(props: ProgressWheelProps): JSX.Element {
  const size = (): number => props.size ?? 60;
  const strokeWidth = (): number => props.strokeWidth ?? 5;
  const radius = (): number => (size() - strokeWidth()) / 2;
  const circumference = (): number => radius() * 2 * Math.PI;
  const offset = (): number => circumference() - (props.progress / 100) * circumference();

  return (
    <div
      class="relative flex items-center justify-center animate-fadeIn"
      style={{ width: `${size()}px`, height: `${size()}px` }}
    >
      <svg class="transform -rotate-90" width={size()} height={size()}>
        <circle
          class="text-zinc-200 dark:text-zinc-800"
          stroke="currentColor"
          stroke-width={strokeWidth()}
          fill="transparent"
          r={radius()}
          cx={size() / 2}
          cy={size() / 2}
        />
        <circle
          class="text-blue-500 transition-all duration-300"
          stroke="currentColor"
          stroke-width={strokeWidth()}
          stroke-dasharray={String(circumference())}
          stroke-dashoffset={offset()}
          stroke-linecap="round"
          fill="transparent"
          r={radius()}
          cx={size() / 2}
          cy={size() / 2}
        />
      </svg>
      <span class="absolute text-[10px] font-bold font-mono text-zinc-900 dark:text-white">
        {Math.round(props.progress)}%
      </span>
    </div>
  );
}
