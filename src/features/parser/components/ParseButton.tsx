import { type JSX } from "solid-js";
import { AdaptiveTooltip } from "@/components/AdaptiveTooltip";

export interface ParseButtonProps {
  onParse: () => void;
  isLoading?: boolean;
}

export function ParseButton(props: ParseButtonProps): JSX.Element {
  return (
    <AdaptiveTooltip content="Extract metadata and stream formats from the provided media URL">
      <button
        disabled={props.isLoading}
        onClick={() => props.onParse()}
        class="flex items-center justify-center bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold tracking-wide shadow-lg shadow-indigo-500/20 px-6 py-3 rounded-xl transition-all duration-300 disabled:opacity-50 cursor-pointer"
        type="button"
      >
        {props.isLoading ? "Parsing Target..." : "Parse URL Metadata"}
      </button>
    </AdaptiveTooltip>
  );
}
