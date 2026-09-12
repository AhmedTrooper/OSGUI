import { createSignal, Show, For, type JSX } from "solid-js";
import { Globe, GlobeLock, ChevronDown, Check, Shield, Cookie, ExternalLink } from "lucide-solid";
import type { SiteConfig } from "@/core/types/database.types";

export interface SiteProfilePickerProps {
  configs: SiteConfig[];
  selectedSlug: string;
  onSelect: (slug: string) => void;
  onManageClick: () => void;
}

export function SiteProfilePicker(props: SiteProfilePickerProps): JSX.Element {
  const [isOpen, setIsOpen] = createSignal(false);

  const selectedConfig = (): SiteConfig | undefined =>
    props.configs.find((c) => c.slug === props.selectedSlug);

  return (
    <div class="relative w-full space-y-2">
      {/* Dropdown Trigger */}
      <div class="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen())}
          class="w-full flex items-center justify-between gap-3 px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-900/70 border border-zinc-200/90 dark:border-zinc-800/90 hover:border-zinc-300 dark:hover:border-zinc-700 rounded-xl transition-all cursor-pointer select-none text-left shadow-2xs font-sans"
        >
          <div class="flex items-center gap-2.5 min-w-0 flex-1">
            <Show
              when={selectedConfig()}
              fallback={
                <>
                  <div class="w-7 h-7 rounded-lg bg-zinc-200/70 dark:bg-zinc-800 flex items-center justify-center flex-shrink-0 text-zinc-600 dark:text-zinc-400">
                    <Globe class="w-4 h-4" />
                  </div>
                  <div class="flex items-center gap-2 min-w-0 truncate">
                    <span class="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                      Direct Connection
                    </span>
                    <span class="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-200/60 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-medium">
                      BYPASS
                    </span>
                  </div>
                </>
              }
            >
              {(cfg) => (
                <>
                  <div class="w-7 h-7 rounded-lg bg-blue-500/10 dark:bg-blue-500/20 flex items-center justify-center flex-shrink-0 text-blue-600 dark:text-blue-400">
                    <GlobeLock class="w-4 h-4" />
                  </div>
                  <div class="flex items-center gap-2 min-w-0 truncate">
                    <span class="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                      {cfg().title}
                    </span>
                    <span class="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-200/60 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-medium truncate max-w-[140px]">
                      {cfg().domain}
                    </span>
                  </div>
                  <div class="hidden sm:flex items-center gap-1.5 ml-auto flex-shrink-0 pr-1">
                    <Show when={cfg().proxy_profile_slug}>
                      <span class="text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                        PROXY
                      </span>
                    </Show>
                    <Show when={cfg().cookie_profile_slug}>
                      <span class="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        COOKIES
                      </span>
                    </Show>
                  </div>
                </>
              )}
            </Show>
          </div>

          <ChevronDown
            class={`w-4 h-4 text-zinc-400 transition-transform duration-200 flex-shrink-0 ${
              isOpen() ? "rotate-180" : ""
            }`}
          />
        </button>

        {/* Popover Menu */}
        <Show when={isOpen()}>
          <div class="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />

          <div class="absolute z-50 left-0 right-0 top-full mt-1.5 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl overflow-hidden animate-fade-in origin-top">
            {/* Popover Header */}
            <div class="px-3.5 py-2 border-b border-zinc-150 dark:border-zinc-800/80 bg-zinc-50/70 dark:bg-zinc-950/40 flex items-center justify-between">
              <span class="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-mono">
                Network & Proxy Profiles
              </span>
              <span class="text-[10px] font-mono text-zinc-400">
                {props.configs.length + 1} options
              </span>
            </div>

            {/* Profiles List */}
            <div class="max-h-64 overflow-y-auto p-1.5 space-y-1 custom-scrollbar">
              {/* Option: Direct Connection */}
              <button
                type="button"
                onClick={() => {
                  props.onSelect("");
                  setIsOpen(false);
                }}
                class={`w-full flex items-center justify-between gap-3 px-3 py-2 rounded-xl text-left transition-all cursor-pointer ${
                  !props.selectedSlug
                    ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 font-semibold"
                    : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/5"
                }`}
              >
                <div class="flex items-center gap-2.5 min-w-0 flex-1">
                  <div class="w-7 h-7 rounded-lg bg-zinc-200/60 dark:bg-zinc-800 flex items-center justify-center flex-shrink-0 text-zinc-500">
                    <Globe class="w-4 h-4" />
                  </div>
                  <div class="flex flex-col min-w-0">
                    <div class="flex items-center gap-1.5">
                      <span class="text-xs font-semibold">Direct Connection</span>
                      <span class="text-[9px] font-mono px-1 py-0.2 rounded bg-zinc-200/60 dark:bg-zinc-800 text-zinc-500">
                        DEFAULT
                      </span>
                    </div>
                    <span class="text-[10px] text-zinc-400 truncate">
                      Standard network routing without proxy or saved cookies
                    </span>
                  </div>
                </div>
                <Show when={!props.selectedSlug}>
                  <Check class="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                </Show>
              </button>

              {/* Custom Profiles */}
              <For each={props.configs}>
                {(cfg) => {
                  const isSelected = () => cfg.slug === props.selectedSlug;
                  return (
                    <button
                      type="button"
                      onClick={() => {
                        props.onSelect(cfg.slug);
                        setIsOpen(false);
                      }}
                      class={`w-full flex items-center justify-between gap-3 px-3 py-2 rounded-xl text-left transition-all cursor-pointer ${
                        isSelected()
                          ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 font-semibold"
                          : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/5"
                      }`}
                    >
                      <div class="flex items-center gap-2.5 min-w-0 flex-1">
                        <div class="w-7 h-7 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0 text-blue-500">
                          <GlobeLock class="w-4 h-4" />
                        </div>
                        <div class="flex flex-col min-w-0">
                          <div class="flex items-center gap-1.5 flex-wrap">
                            <span class="text-xs font-semibold truncate">{cfg.title}</span>
                            <span class="text-[10px] font-mono px-1.5 py-0.2 rounded bg-zinc-200/60 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 font-medium">
                              {cfg.domain}
                            </span>
                          </div>
                          <div class="flex items-center gap-2 text-[10px] text-zinc-400">
                            <span>
                              {cfg.proxy_profile_slug ? "Custom Proxy" : "Direct Routing"}
                            </span>
                            <span>•</span>
                            <span>{cfg.cookie_profile_slug ? "Cookie Session" : "No Auth"}</span>
                          </div>
                        </div>
                      </div>

                      <div class="flex items-center gap-2 flex-shrink-0">
                        <div class="flex items-center gap-1">
                          <Show when={cfg.proxy_profile_slug}>
                            <span class="text-[8px] font-bold px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                              PROXY
                            </span>
                          </Show>
                          <Show when={cfg.cookie_profile_slug}>
                            <span class="text-[8px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                              AUTH
                            </span>
                          </Show>
                        </div>
                        <Show when={isSelected()}>
                          <Check class="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                        </Show>
                      </div>
                    </button>
                  );
                }}
              </For>
            </div>

            {/* Popover Footer */}
            <div class="border-t border-zinc-150 dark:border-zinc-800 p-2 bg-zinc-50/70 dark:bg-zinc-950/40">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  props.onManageClick();
                }}
                class="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 transition-colors cursor-pointer"
              >
                <span>Manage Site Rules in Network Preferences</span>
                <ExternalLink class="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </Show>
      </div>

      {/* Selected Config Metadata Strip (Native Desktop Info Panel) */}
      <Show
        when={selectedConfig()}
        fallback={
          <div class="flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200/60 dark:border-zinc-800/60 text-[11px] text-zinc-500 dark:text-zinc-400">
            <Globe class="w-4 h-4 text-zinc-400 flex-shrink-0" />
            <span class="truncate">
              Direct connection enabled. Requests will bypass all proxy servers and custom cookies.
            </span>
          </div>
        }
      >
        {(cfg) => (
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-2 p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200/70 dark:border-zinc-800/70 text-[11px]">
            {/* Domain constraint */}
            <div class="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-white dark:bg-zinc-900/80 border border-zinc-200/50 dark:border-zinc-800/50">
              <GlobeLock class="w-4 h-4 text-zinc-400 flex-shrink-0" />
              <div class="flex flex-col min-w-0">
                <span class="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">
                  Target Domain
                </span>
                <span class="font-mono text-zinc-800 dark:text-zinc-200 truncate font-medium">
                  {cfg().domain}
                </span>
              </div>
            </div>

            {/* Proxy state */}
            <div class="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-white dark:bg-zinc-900/80 border border-zinc-200/50 dark:border-zinc-800/50">
              <Shield class="w-4 h-4 text-zinc-400 flex-shrink-0" />
              <div class="flex flex-col min-w-0">
                <span class="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">
                  Proxy Routing
                </span>
                <div class="flex items-center gap-1.5">
                  <span
                    class={`w-1.5 h-1.5 rounded-full ${
                      cfg().proxy_profile_slug ? "bg-indigo-500" : "bg-zinc-400"
                    }`}
                  />
                  <span class="text-zinc-800 dark:text-zinc-200 font-medium">
                    {cfg().proxy_profile_slug ? "Active Tunnel" : "Direct Bypass"}
                  </span>
                </div>
              </div>
            </div>

            {/* Cookies state */}
            <div class="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-white dark:bg-zinc-900/80 border border-zinc-200/50 dark:border-zinc-800/50">
              <Cookie class="w-4 h-4 text-zinc-400 flex-shrink-0" />
              <div class="flex flex-col min-w-0">
                <span class="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">
                  Auth Session
                </span>
                <div class="flex items-center gap-1.5">
                  <span
                    class={`w-1.5 h-1.5 rounded-full ${
                      cfg().cookie_profile_slug ? "bg-emerald-500" : "bg-zinc-400"
                    }`}
                  />
                  <span class="text-zinc-800 dark:text-zinc-200 font-medium">
                    {cfg().cookie_profile_slug ? "Attached" : "Anonymous"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </Show>
    </div>
  );
}
