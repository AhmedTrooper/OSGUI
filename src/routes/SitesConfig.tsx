import { createSignal, onMount, Show, For, type JSX } from "solid-js";
import { useUIStore } from "@/store/useUIStore";
import { ipc } from "@/utils/ipc";
import type { CookieProfile, ProxyProfile, SiteConfig } from "@/core/types/database.types";
import { CustomSelect } from "@/components/CustomSelect";
import { AdaptiveTooltip } from "@/components/AdaptiveTooltip";
import { Checkbox } from "@/components/Checkbox";
import {
  Plus,
  Trash2,
  Edit2,
  Save,
  X,
  Settings2,
  ShieldCheck,
  Database,
  GlobeLock,
  Search,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Cookie,
  Shield,
  Globe,
} from "lucide-solid";

type ConfigTab = "sites" | "cookies" | "proxies";
const PAGE_SIZE = 6;

export default function SitesConfig(): JSX.Element {
  const [activeTab, setActiveTab] = createSignal<ConfigTab>("sites");

  // Cookie Profiles state
  const [cookies, setCookies] = createSignal<CookieProfile[]>([]);
  const [selectedCookies, setSelectedCookies] = createSignal<string[]>([]);
  const [cookiesPage, setCookiesPage] = createSignal(1);
  const [cookiesSearch, setCookiesSearch] = createSignal("");
  const [newCookieTitle, setNewCookieTitle] = createSignal("");
  const [newCookieDomain, setNewCookieDomain] = createSignal("");
  const [newCookieData, setNewCookieData] = createSignal("");
  const [editingCookie, setEditingCookie] = createSignal<string | null>(null);
  const [editCookieData, setEditCookieData] = createSignal("");

  // Proxy Profiles state
  const [proxies, setProxies] = createSignal<ProxyProfile[]>([]);
  const [selectedProxies, setSelectedProxies] = createSignal<string[]>([]);
  const [proxiesPage, setProxiesPage] = createSignal(1);
  const [proxiesSearch, setProxiesSearch] = createSignal("");
  const [newProxyTitle, setNewProxyTitle] = createSignal("");
  const [newProxyData, setNewProxyData] = createSignal("");
  const [editingProxy, setEditingProxy] = createSignal<string | null>(null);
  const [editProxyData, setEditProxyData] = createSignal("");

  // Domain Rules (Site Configs) state
  const [sites, setSites] = createSignal<SiteConfig[]>([]);
  const [sitesPage, setSitesPage] = createSignal(1);
  const [sitesSearch, setSitesSearch] = createSignal("");
  const [newSiteTitle, setNewSiteTitle] = createSignal("");
  const [newSiteDomain, setNewSiteDomain] = createSignal("");
  const [newSiteCookieSlug, setNewSiteCookieSlug] = createSignal("");
  const [newSiteProxySlug, setNewSiteProxySlug] = createSignal("");

  onMount(() => {
    useUIStore.setActivePath("/sites_config");
    void loadCookies();
    void loadProxies();
    void loadSites();
  });

  const loadCookies = async (): Promise<void> => {
    try {
      const data = await ipc.getCookieProfiles();
      setCookies(data);
    } catch (err) {
      console.error("Failed to load cookies:", err);
    }
  };

  const loadProxies = async (): Promise<void> => {
    try {
      const data = await ipc.getProxyProfiles();
      setProxies(data);
    } catch (err) {
      console.error("Failed to load proxies:", err);
    }
  };

  const loadSites = async (): Promise<void> => {
    try {
      const data = await ipc.getSiteConfigs();
      setSites(data);
    } catch (err) {
      console.error("Failed to load sites:", err);
    }
  };

  // Domain Rules handlers
  const handleAddSite = async (e: Event): Promise<void> => {
    e.preventDefault();
    if (!newSiteTitle().trim() || !newSiteDomain().trim()) return;
    try {
      await ipc.addSiteConfig({
        title: newSiteTitle().trim(),
        domain: newSiteDomain().trim().toLowerCase(),
        cookieProfileSlug: newSiteCookieSlug() || null,
        proxyProfileSlug: newSiteProxySlug() || null,
        isDefault: false,
      });
      setNewSiteTitle("");
      setNewSiteDomain("");
      setNewSiteCookieSlug("");
      setNewSiteProxySlug("");
      await loadSites();
    } catch (err) {
      console.error("Failed to add site config:", err);
    }
  };

  const handleDeleteSite = async (slug: string): Promise<void> => {
    if (!confirm("Are you sure you want to delete this domain rule?")) return;
    try {
      await ipc.deleteSiteConfig({ slug });
      await loadSites();
    } catch (err) {
      console.error("Failed to delete site config:", err);
    }
  };

  const handleUpdateSite = async (
    slug: string,
    cookieSlug: string | null,
    proxySlug: string | null,
  ): Promise<void> => {
    try {
      await ipc.updateSiteConfig({
        slug,
        cookieProfileSlug: cookieSlug,
        proxyProfileSlug: proxySlug,
      });
      await loadSites();
    } catch (err) {
      console.error("Failed to update site config:", err);
    }
  };

  // Cookie Profiles handlers
  const handleAddCookie = async (e: Event): Promise<void> => {
    e.preventDefault();
    if (!newCookieTitle().trim() || !newCookieDomain().trim() || !newCookieData().trim()) return;
    try {
      await ipc.addCookieProfile({
        title: newCookieTitle().trim(),
        domain: newCookieDomain().trim().toLowerCase(),
        cookieData: newCookieData().trim(),
      });
      setNewCookieTitle("");
      setNewCookieDomain("");
      setNewCookieData("");
      await loadCookies();
    } catch (err) {
      console.error("Failed to add cookie profile:", err);
    }
  };

  const handleDeleteCookie = async (slug: string): Promise<void> => {
    if (!confirm("Delete this cookie profile?")) return;
    try {
      await ipc.deleteCookieProfile({ slug });
      setSelectedCookies((prev) => prev.filter((id) => id !== slug));
      await loadCookies();
      await loadSites();
    } catch (err) {
      console.error("Failed to delete cookie profile:", err);
    }
  };

  const handleBatchDeleteCookies = async (): Promise<void> => {
    if (selectedCookies().length === 0) return;
    if (!confirm(`Delete ${selectedCookies().length} selected cookie profile(s)?`)) return;
    try {
      await ipc.batchDeleteCookieProfiles({ slugs: selectedCookies() });
      setSelectedCookies([]);
      await loadCookies();
      await loadSites();
    } catch (err) {
      console.error("Failed to batch delete cookies:", err);
    }
  };

  const handleUpdateCookie = async (slug: string): Promise<void> => {
    if (!editCookieData().trim()) return;
    try {
      await ipc.updateCookieData({ slug, cookieData: editCookieData().trim() });
      setEditingCookie(null);
      setEditCookieData("");
      await loadCookies();
    } catch (err) {
      console.error("Failed to update cookie profile:", err);
    }
  };

  const toggleSelectCookie = (slug: string): void => {
    setSelectedCookies((prev) =>
      prev.includes(slug) ? prev.filter((id) => id !== slug) : [...prev, slug],
    );
  };

  const toggleSelectAllCookies = (): void => {
    if (selectedCookies().length === cookies().length) {
      setSelectedCookies([]);
    } else {
      setSelectedCookies(cookies().map((c) => c.slug));
    }
  };

  // Proxy Profiles handlers
  const handleAddProxy = async (e: Event): Promise<void> => {
    e.preventDefault();
    if (!newProxyTitle().trim() || !newProxyData().trim()) return;
    try {
      await ipc.addProxyProfile({
        title: newProxyTitle().trim(),
        proxyString: newProxyData().trim(),
      });
      setNewProxyTitle("");
      setNewProxyData("");
      await loadProxies();
    } catch (err) {
      console.error("Failed to add proxy profile:", err);
    }
  };

  const handleDeleteProxy = async (slug: string): Promise<void> => {
    if (!confirm("Delete this proxy profile?")) return;
    try {
      await ipc.deleteProxyProfile({ slug });
      setSelectedProxies((prev) => prev.filter((id) => id !== slug));
      await loadProxies();
      await loadSites();
    } catch (err) {
      console.error("Failed to delete proxy profile:", err);
    }
  };

  const handleBatchDeleteProxies = async (): Promise<void> => {
    if (selectedProxies().length === 0) return;
    if (!confirm(`Delete ${selectedProxies().length} selected proxy profile(s)?`)) return;
    try {
      await ipc.batchDeleteProxyProfiles({ slugs: selectedProxies() });
      setSelectedProxies([]);
      await loadProxies();
      await loadSites();
    } catch (err) {
      console.error("Failed to batch delete proxies:", err);
    }
  };

  const handleUpdateProxy = async (slug: string): Promise<void> => {
    if (!editProxyData().trim()) return;
    try {
      await ipc.updateProxyData({ slug, proxyString: editProxyData().trim() });
      setEditingProxy(null);
      setEditProxyData("");
      await loadProxies();
    } catch (err) {
      console.error("Failed to update proxy profile:", err);
    }
  };

  const toggleSelectProxy = (slug: string): void => {
    setSelectedProxies((prev) =>
      prev.includes(slug) ? prev.filter((id) => id !== slug) : [...prev, slug],
    );
  };

  const toggleSelectAllProxies = (): void => {
    if (selectedProxies().length === proxies().length) {
      setSelectedProxies([]);
    } else {
      setSelectedProxies(proxies().map((p) => p.slug));
    }
  };

  // Pagination computations
  const filteredSites = (): SiteConfig[] => {
    const q = sitesSearch().toLowerCase().trim();
    if (!q) return sites();
    return sites().filter(
      (s) => s.title.toLowerCase().includes(q) || s.domain.toLowerCase().includes(q),
    );
  };
  const totalSitesPages = (): number => Math.max(1, Math.ceil(filteredSites().length / PAGE_SIZE));
  const paginatedSites = (): SiteConfig[] => {
    const p = Math.min(sitesPage(), totalSitesPages());
    return filteredSites().slice((p - 1) * PAGE_SIZE, p * PAGE_SIZE);
  };

  const filteredCookies = (): CookieProfile[] => {
    const q = cookiesSearch().toLowerCase().trim();
    if (!q) return cookies();
    return cookies().filter(
      (c) => c.title.toLowerCase().includes(q) || c.domain.toLowerCase().includes(q),
    );
  };
  const totalCookiesPages = (): number =>
    Math.max(1, Math.ceil(filteredCookies().length / PAGE_SIZE));
  const paginatedCookies = (): CookieProfile[] => {
    const p = Math.min(cookiesPage(), totalCookiesPages());
    return filteredCookies().slice((p - 1) * PAGE_SIZE, p * PAGE_SIZE);
  };

  const filteredProxies = (): ProxyProfile[] => {
    const q = proxiesSearch().toLowerCase().trim();
    if (!q) return proxies();
    return proxies().filter(
      (p) => p.title.toLowerCase().includes(q) || p.proxy_string.toLowerCase().includes(q),
    );
  };
  const totalProxiesPages = (): number =>
    Math.max(1, Math.ceil(filteredProxies().length / PAGE_SIZE));
  const paginatedProxies = (): ProxyProfile[] => {
    const p = Math.min(proxiesPage(), totalProxiesPages());
    return filteredProxies().slice((p - 1) * PAGE_SIZE, p * PAGE_SIZE);
  };

  return (
    <div class="w-full max-w-5xl mx-auto space-y-4 select-none animate-fade-in text-xs sm:text-sm font-sans px-1 text-left">
      {/* Header */}
      <div class="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800 gap-3">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 flex items-center justify-center bg-blue-500/10 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 rounded-xl">
            <GlobeLock class="w-5 h-5" />
          </div>
          <div>
            <h1 class="text-base font-bold text-zinc-900 dark:text-white">Network Preferences</h1>
            <p class="text-[11px] text-zinc-500 dark:text-zinc-400">
              Configure domain routing rules, Netscape cookies, and proxy endpoints
            </p>
          </div>
        </div>

        {/* Segmented Top Navigation Tabs */}
        <div class="inline-flex p-1 bg-zinc-100 dark:bg-zinc-900 rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 text-xs font-semibold">
          <AdaptiveTooltip content="Manage domain-specific routing rules and credentials">
            <button
              type="button"
              onClick={() => setActiveTab("sites")}
              class={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab() === "sites"
                  ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs"
                  : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
              }`}
            >
              <span>Domain Rules</span>
              <span class="text-[10px] font-mono px-1.5 py-0.2 rounded bg-zinc-150 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300">
                {sites().length}
              </span>
            </button>
          </AdaptiveTooltip>

          <AdaptiveTooltip content="Manage Netscape cookie vault profiles">
            <button
              type="button"
              onClick={() => setActiveTab("cookies")}
              class={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab() === "cookies"
                  ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs"
                  : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
              }`}
            >
              <span>Cookie Vault</span>
              <span class="text-[10px] font-mono px-1.5 py-0.2 rounded bg-zinc-150 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300">
                {cookies().length}
              </span>
            </button>
          </AdaptiveTooltip>

          <AdaptiveTooltip content="Manage HTTP/HTTPS/SOCKS proxy endpoints">
            <button
              type="button"
              onClick={() => setActiveTab("proxies")}
              class={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab() === "proxies"
                  ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs"
                  : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
              }`}
            >
              <span>Proxy Networks</span>
              <span class="text-[10px] font-mono px-1.5 py-0.2 rounded bg-zinc-150 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300">
                {proxies().length}
              </span>
            </button>
          </AdaptiveTooltip>
        </div>
      </div>

      {/* TAB 1: DOMAIN RULES */}
      <Show when={activeTab() === "sites"}>
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Rules List (Left 7 cols) */}
          <div class="lg:col-span-7 space-y-3">
            <div class="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 p-4 rounded-2xl shadow-xs space-y-3">
              <div class="flex items-center justify-between pb-2 border-b border-zinc-200 dark:border-zinc-800">
                <div class="flex items-center gap-2">
                  <h2 class="text-xs font-bold text-zinc-900 dark:text-white">
                    Active Domain Rules
                  </h2>
                  <span class="text-[10px] font-mono text-zinc-400">
                    ({filteredSites().length})
                  </span>
                </div>

                {/* Search */}
                <div class="relative w-44">
                  <div class="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none">
                    <Search class="w-3 h-3" />
                  </div>
                  <input
                    type="text"
                    placeholder="Search rules..."
                    value={sitesSearch()}
                    onInput={(e) => {
                      setSitesSearch(e.currentTarget.value);
                      setSitesPage(1);
                    }}
                    class="w-full pl-7 pr-6 py-1 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs outline-none focus:border-blue-500"
                  />
                  <Show when={sitesSearch()}>
                    <button
                      type="button"
                      onClick={() => setSitesSearch("")}
                      class="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                    >
                      <X class="w-3 h-3" />
                    </button>
                  </Show>
                </div>
              </div>

              {/* Items List */}
              <div class="space-y-2.5">
                <For each={paginatedSites()}>
                  {(site) => {
                    const cookieMissing = () =>
                      site.cookie_profile_slug !== null &&
                      !cookies().some((c) => c.slug === site.cookie_profile_slug);
                    const proxyMissing = () =>
                      site.proxy_profile_slug !== null &&
                      !proxies().some((p) => p.slug === site.proxy_profile_slug);

                    return (
                      <div class="border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 p-3 rounded-xl space-y-2.5 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors">
                        <div class="flex items-start justify-between gap-3">
                          <div class="min-w-0">
                            <div class="flex items-center gap-2 flex-wrap">
                              <span class="text-xs font-bold text-zinc-900 dark:text-white truncate">
                                {site.title}
                              </span>
                              <Show when={site.is_default}>
                                <span class="text-[9px] font-bold px-1.5 py-0.2 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                                  DEFAULT
                                </span>
                              </Show>
                            </div>
                            <span class="text-[11px] font-mono text-zinc-400 mt-0.5 block truncate">
                              {site.domain}
                            </span>
                          </div>

                          <AdaptiveTooltip content="Delete domain rule">
                            <button
                              type="button"
                              onClick={() => void handleDeleteSite(site.slug)}
                              class="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                            >
                              <Trash2 class="w-3.5 h-3.5" />
                            </button>
                          </AdaptiveTooltip>
                        </div>

                        {/* Associated Profiles */}
                        <div class="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-200/60 dark:border-zinc-800/60 text-[11px]">
                          <div class="space-y-1">
                            <div class="flex items-center justify-between">
                              <span class="text-zinc-500 font-medium">Cookie Vault</span>
                              <Show when={cookieMissing()}>
                                <span class="text-[9px] font-bold text-red-500">Missing</span>
                              </Show>
                            </div>
                            <CustomSelect
                              value={site.cookie_profile_slug ?? ""}
                              onChange={(val) => {
                                void handleUpdateSite(
                                  site.slug,
                                  val || null,
                                  site.proxy_profile_slug,
                                );
                              }}
                              options={cookies().map((c) => ({
                                value: c.slug,
                                label: c.title,
                                tag: c.domain,
                                tagClass:
                                  "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20",
                                icon: Cookie,
                              }))}
                              placeholder="Direct Connection"
                              placeholderTag="NO COOKIES"
                              placeholderIcon={Globe}
                              icon={Cookie}
                              compact
                            />
                          </div>

                          <div class="space-y-1">
                            <div class="flex items-center justify-between">
                              <span class="text-zinc-500 font-medium">Proxy Network</span>
                              <Show when={proxyMissing()}>
                                <span class="text-[9px] font-bold text-red-500">Missing</span>
                              </Show>
                            </div>
                            <CustomSelect
                              value={site.proxy_profile_slug ?? ""}
                              onChange={(val) => {
                                void handleUpdateSite(
                                  site.slug,
                                  site.cookie_profile_slug,
                                  val || null,
                                );
                              }}
                              options={proxies().map((p) => ({
                                value: p.slug,
                                label: p.title,
                                tag: "PROXY",
                                tagClass:
                                  "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20",
                                icon: Shield,
                              }))}
                              placeholder="Direct Connection"
                              placeholderTag="BYPASS"
                              placeholderIcon={Globe}
                              icon={Shield}
                              compact
                            />
                          </div>
                        </div>
                      </div>
                    );
                  }}
                </For>

                <Show when={filteredSites().length === 0}>
                  <div class="text-center py-10 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl bg-zinc-50/50 dark:bg-zinc-950/20">
                    <Database class="w-6 h-6 text-zinc-400 mx-auto mb-2" />
                    <span class="text-xs font-semibold text-zinc-500">
                      {sitesSearch()
                        ? "No domain rules match search."
                        : "No domain routing rules configured."}
                    </span>
                  </div>
                </Show>
              </div>

              {/* Pagination Controls */}
              <Show when={totalSitesPages() > 1}>
                <div class="flex items-center justify-between pt-2 border-t border-zinc-200 dark:border-zinc-800 text-xs">
                  <span class="text-zinc-400">
                    Page <strong class="text-zinc-700 dark:text-zinc-300">{sitesPage()}</strong> of{" "}
                    <strong class="text-zinc-700 dark:text-zinc-300">{totalSitesPages()}</strong>
                  </span>
                  <div class="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setSitesPage((p) => Math.max(1, p - 1))}
                      disabled={sitesPage() <= 1}
                      class="px-2 py-1 border border-zinc-200 dark:border-zinc-800 rounded-lg disabled:opacity-40 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                    >
                      <ChevronLeft class="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setSitesPage((p) => Math.min(totalSitesPages(), p + 1))}
                      disabled={sitesPage() >= totalSitesPages()}
                      class="px-2 py-1 border border-zinc-200 dark:border-zinc-800 rounded-lg disabled:opacity-40 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                    >
                      <ChevronRight class="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </Show>
            </div>
          </div>

          {/* Add Rule Form (Right 5 cols) */}
          <div class="lg:col-span-5 space-y-3">
            <div class="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 p-4 rounded-2xl shadow-xs space-y-3.5">
              <div class="flex items-center gap-2 pb-2 border-b border-zinc-200 dark:border-zinc-800">
                <Plus class="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <h2 class="text-xs font-bold text-zinc-900 dark:text-white">Add Domain Rule</h2>
              </div>

              <form onSubmit={(e) => void handleAddSite(e)} class="space-y-3">
                <div class="space-y-1">
                  <label class="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Rule Label
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. YouTube Premium"
                    value={newSiteTitle()}
                    onInput={(e) => setNewSiteTitle(e.currentTarget.value)}
                    class="w-full px-3 py-1.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none focus:border-blue-500"
                    required
                  />
                </div>

                <div class="space-y-1">
                  <label class="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Domain Match
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. youtube.com"
                    value={newSiteDomain()}
                    onInput={(e) => setNewSiteDomain(e.currentTarget.value)}
                    class="w-full px-3 py-1.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-mono outline-none focus:border-blue-500"
                    required
                  />
                </div>

                <div class="space-y-1">
                  <label class="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Link Cookie Vault Profile
                  </label>
                  <CustomSelect
                    value={newSiteCookieSlug()}
                    onChange={setNewSiteCookieSlug}
                    options={cookies().map((c) => ({
                      value: c.slug,
                      label: c.title,
                      tag: c.domain,
                      tagClass:
                        "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20",
                      icon: Cookie,
                    }))}
                    placeholder="Direct Connection"
                    placeholderTag="NO COOKIES"
                    placeholderIcon={Globe}
                    icon={Cookie}
                  />
                </div>

                <div class="space-y-1">
                  <label class="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Link Proxy Network Profile
                  </label>
                  <CustomSelect
                    value={newSiteProxySlug()}
                    onChange={setNewSiteProxySlug}
                    options={proxies().map((p) => ({
                      value: p.slug,
                      label: p.title,
                      tag: "PROXY",
                      tagClass:
                        "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20",
                      icon: Shield,
                    }))}
                    placeholder="Direct Connection"
                    placeholderTag="BYPASS"
                    placeholderIcon={Globe}
                    icon={Shield}
                  />
                </div>

                <AdaptiveTooltip content="Persist domain rule configuration to database">
                  <button
                    type="submit"
                    class="w-full flex items-center justify-center bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold py-2 px-4 rounded-xl shadow-xs transition-all active:scale-[0.99] cursor-pointer mt-2"
                  >
                    Save Domain Rule
                  </button>
                </AdaptiveTooltip>
              </form>
            </div>
          </div>
        </div>
      </Show>

      {/* TAB 2: COOKIE VAULT */}
      <Show when={activeTab() === "cookies"}>
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Cookie Profiles List (Left 7 cols) */}
          <div class="lg:col-span-7 space-y-3">
            <div class="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 p-4 rounded-2xl shadow-xs space-y-3">
              <div class="flex items-center justify-between pb-2 border-b border-zinc-200 dark:border-zinc-800">
                <div class="flex items-center gap-2">
                  <h2 class="text-xs font-bold text-zinc-900 dark:text-white">
                    Netscape Credentials
                  </h2>
                  <span class="text-[10px] font-mono text-zinc-400">
                    ({filteredCookies().length})
                  </span>
                </div>

                <div class="flex items-center gap-2">
                  {/* Select All / Batch Delete */}
                  <Show when={cookies().length > 0}>
                    <Checkbox
                      checked={
                        selectedCookies().length === cookies().length && cookies().length > 0
                      }
                      onChange={toggleSelectAllCookies}
                      ariaLabel={
                        selectedCookies().length === cookies().length
                          ? "Deselect All"
                          : "Select All"
                      }
                    />
                    <Show when={selectedCookies().length > 0}>
                      <AdaptiveTooltip content="Permanently delete selected cookie profiles">
                        <button
                          type="button"
                          onClick={() => void handleBatchDeleteCookies()}
                          class="flex items-center px-2.5 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                        >
                          Delete ({selectedCookies().length})
                        </button>
                      </AdaptiveTooltip>
                    </Show>
                  </Show>

                  {/* Search */}
                  <div class="relative w-36">
                    <input
                      type="text"
                      placeholder="Search..."
                      value={cookiesSearch()}
                      onInput={(e) => {
                        setCookiesSearch(e.currentTarget.value);
                        setCookiesPage(1);
                      }}
                      class="w-full px-2.5 py-1 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Items */}
              <div class="space-y-2.5">
                <For each={paginatedCookies()}>
                  {(cookie) => (
                    <div class="border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 p-3 rounded-xl space-y-2 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors">
                      <div class="flex items-start justify-between gap-3">
                        <div class="flex items-center gap-2.5 min-w-0">
                          <Checkbox
                            checked={selectedCookies().includes(cookie.slug)}
                            onChange={() => toggleSelectCookie(cookie.slug)}
                            ariaLabel={`Select ${cookie.title}`}
                          />
                          <div class="min-w-0">
                            <span class="text-xs font-bold text-zinc-900 dark:text-white block truncate">
                              {cookie.title}
                            </span>
                            <span class="text-[10px] font-mono text-zinc-400 block truncate">
                              {cookie.domain}
                            </span>
                          </div>
                        </div>

                        <div class="flex items-center gap-1">
                          <AdaptiveTooltip
                            content={
                              editingCookie() === cookie.slug ? "Cancel edit" : "Edit cookie data"
                            }
                          >
                            <button
                              type="button"
                              onClick={() => {
                                if (editingCookie() === cookie.slug) {
                                  setEditingCookie(null);
                                } else {
                                  setEditingCookie(cookie.slug);
                                  setEditCookieData(cookie.cookie_data);
                                }
                              }}
                              class="p-1.5 text-zinc-400 hover:text-blue-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
                            >
                              <Show
                                when={editingCookie() === cookie.slug}
                                fallback={<Edit2 class="w-3.5 h-3.5" />}
                              >
                                <X class="w-3.5 h-3.5" />
                              </Show>
                            </button>
                          </AdaptiveTooltip>
                          <AdaptiveTooltip content="Delete cookie profile">
                            <button
                              type="button"
                              onClick={() => void handleDeleteCookie(cookie.slug)}
                              class="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                            >
                              <Trash2 class="w-3.5 h-3.5" />
                            </button>
                          </AdaptiveTooltip>
                        </div>
                      </div>

                      {/* Inline Editor */}
                      <Show when={editingCookie() === cookie.slug}>
                        <div class="space-y-2 pt-2 border-t border-zinc-200/60 dark:border-zinc-800/60">
                          <textarea
                            value={editCookieData()}
                            onInput={(e) => setEditCookieData(e.currentTarget.value)}
                            class="w-full p-2 bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg font-mono text-[10px] min-h-[90px] outline-none focus:border-blue-500 text-zinc-800 dark:text-zinc-200"
                          />
                          <div class="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setEditingCookie(null)}
                              class="px-2.5 py-1 text-xs font-semibold text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleUpdateCookie(cookie.slug)}
                              class="flex items-center gap-1 px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg cursor-pointer shadow-xs"
                            >
                              <Save class="w-3 h-3" />
                              <span>Save Updates</span>
                            </button>
                          </div>
                        </div>
                      </Show>
                    </div>
                  )}
                </For>

                <Show when={filteredCookies().length === 0}>
                  <div class="text-center py-10 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl bg-zinc-50/50 dark:bg-zinc-950/20">
                    <ShieldCheck class="w-6 h-6 text-zinc-400 mx-auto mb-2" />
                    <span class="text-xs font-semibold text-zinc-500">
                      {cookiesSearch()
                        ? "No cookie profiles match search."
                        : "No Netscape cookie profiles imported."}
                    </span>
                  </div>
                </Show>
              </div>

              {/* Pagination */}
              <Show when={totalCookiesPages() > 1}>
                <div class="flex items-center justify-between pt-2 border-t border-zinc-200 dark:border-zinc-800 text-xs">
                  <span class="text-zinc-400">
                    Page <strong class="text-zinc-700 dark:text-zinc-300">{cookiesPage()}</strong>{" "}
                    of{" "}
                    <strong class="text-zinc-700 dark:text-zinc-300">{totalCookiesPages()}</strong>
                  </span>
                  <div class="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setCookiesPage((p) => Math.max(1, p - 1))}
                      disabled={cookiesPage() <= 1}
                      class="px-2 py-1 border border-zinc-200 dark:border-zinc-800 rounded-lg disabled:opacity-40 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                    >
                      <ChevronLeft class="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setCookiesPage((p) => Math.min(totalCookiesPages(), p + 1))}
                      disabled={cookiesPage() >= totalCookiesPages()}
                      class="px-2 py-1 border border-zinc-200 dark:border-zinc-800 rounded-lg disabled:opacity-40 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                    >
                      <ChevronRight class="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </Show>
            </div>
          </div>

          {/* Import Cookies Form (Right 5 cols) */}
          <div class="lg:col-span-5 space-y-3">
            <div class="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 p-4 rounded-2xl shadow-xs space-y-3.5">
              <div class="flex items-center gap-2 pb-2 border-b border-zinc-200 dark:border-zinc-800">
                <Plus class="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <h2 class="text-xs font-bold text-zinc-900 dark:text-white">
                  Import Netscape Cookies
                </h2>
              </div>

              <form onSubmit={(e) => void handleAddCookie(e)} class="space-y-3">
                <div class="space-y-1">
                  <label class="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Profile Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. YouTube Premium Profile"
                    value={newCookieTitle()}
                    onInput={(e) => setNewCookieTitle(e.currentTarget.value)}
                    class="w-full px-3 py-1.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none focus:border-blue-500"
                    required
                  />
                </div>

                <div class="space-y-1">
                  <label class="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Target Domain
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. youtube.com"
                    value={newCookieDomain()}
                    onInput={(e) => setNewCookieDomain(e.currentTarget.value)}
                    class="w-full px-3 py-1.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-mono outline-none focus:border-blue-500"
                    required
                  />
                </div>

                <div class="space-y-1">
                  <label class="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Netscape Format Data
                  </label>
                  <textarea
                    placeholder={`# Netscape HTTP Cookie File\n.youtube.com\tTRUE\t/\tTRUE\t1735689\tSID\tABC...`}
                    value={newCookieData()}
                    onInput={(e) => setNewCookieData(e.currentTarget.value)}
                    class="w-full p-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-[10px] font-mono min-h-[110px] outline-none focus:border-blue-500 leading-relaxed"
                    required
                  />
                </div>

                <div class="flex items-start gap-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-[11px] leading-relaxed">
                  <AlertCircle class="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>
                    Only raw Netscape format text is valid for yt-dlp authentication. JSON format is
                    rejected.
                  </span>
                </div>

                <AdaptiveTooltip content="Store Netscape cookie credentials in vault">
                  <button
                    type="submit"
                    class="w-full flex items-center justify-center bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold py-2 px-4 rounded-xl shadow-xs transition-all active:scale-[0.99] cursor-pointer"
                  >
                    Save Cookie Profile
                  </button>
                </AdaptiveTooltip>
              </form>
            </div>
          </div>
        </div>
      </Show>

      {/* TAB 3: PROXY NETWORKS */}
      <Show when={activeTab() === "proxies"}>
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Proxy Profiles List (Left 7 cols) */}
          <div class="lg:col-span-7 space-y-3">
            <div class="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 p-4 rounded-2xl shadow-xs space-y-3">
              <div class="flex items-center justify-between pb-2 border-b border-zinc-200 dark:border-zinc-800">
                <div class="flex items-center gap-2">
                  <h2 class="text-xs font-bold text-zinc-900 dark:text-white">Proxy Endpoints</h2>
                  <span class="text-[10px] font-mono text-zinc-400">
                    ({filteredProxies().length})
                  </span>
                </div>

                <div class="flex items-center gap-2">
                  {/* Select All / Batch Delete */}
                  <Show when={proxies().length > 0}>
                    <Checkbox
                      checked={
                        selectedProxies().length === proxies().length && proxies().length > 0
                      }
                      onChange={toggleSelectAllProxies}
                      ariaLabel={
                        selectedProxies().length === proxies().length
                          ? "Deselect All"
                          : "Select All"
                      }
                    />
                    <Show when={selectedProxies().length > 0}>
                      <AdaptiveTooltip content="Permanently delete selected proxy profiles">
                        <button
                          type="button"
                          onClick={() => void handleBatchDeleteProxies()}
                          class="flex items-center px-2.5 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                        >
                          Delete ({selectedProxies().length})
                        </button>
                      </AdaptiveTooltip>
                    </Show>
                  </Show>

                  {/* Search */}
                  <div class="relative w-36">
                    <input
                      type="text"
                      placeholder="Search..."
                      value={proxiesSearch()}
                      onInput={(e) => {
                        setProxiesSearch(e.currentTarget.value);
                        setProxiesPage(1);
                      }}
                      class="w-full px-2.5 py-1 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Items */}
              <div class="space-y-2.5">
                <For each={paginatedProxies()}>
                  {(proxy) => (
                    <div class="border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 p-3 rounded-xl space-y-2 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors">
                      <div class="flex items-start justify-between gap-3">
                        <div class="flex items-center gap-2.5 min-w-0">
                          <Checkbox
                            checked={selectedProxies().includes(proxy.slug)}
                            onChange={() => toggleSelectProxy(proxy.slug)}
                            ariaLabel={`Select ${proxy.title}`}
                          />
                          <div class="min-w-0">
                            <span class="text-xs font-bold text-zinc-900 dark:text-white block truncate">
                              {proxy.title}
                            </span>
                            <span class="text-[10px] font-mono text-zinc-400 block truncate">
                              {proxy.proxy_string}
                            </span>
                          </div>
                        </div>

                        <div class="flex items-center gap-1">
                          <AdaptiveTooltip
                            content={
                              editingProxy() === proxy.slug ? "Cancel edit" : "Edit proxy endpoint"
                            }
                          >
                            <button
                              type="button"
                              onClick={() => {
                                if (editingProxy() === proxy.slug) {
                                  setEditingProxy(null);
                                } else {
                                  setEditingProxy(proxy.slug);
                                  setEditProxyData(proxy.proxy_string);
                                }
                              }}
                              class="p-1.5 text-zinc-400 hover:text-blue-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
                            >
                              <Show
                                when={editingProxy() === proxy.slug}
                                fallback={<Edit2 class="w-3.5 h-3.5" />}
                              >
                                <X class="w-3.5 h-3.5" />
                              </Show>
                            </button>
                          </AdaptiveTooltip>
                          <AdaptiveTooltip content="Delete proxy profile">
                            <button
                              type="button"
                              onClick={() => void handleDeleteProxy(proxy.slug)}
                              class="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                            >
                              <Trash2 class="w-3.5 h-3.5" />
                            </button>
                          </AdaptiveTooltip>
                        </div>
                      </div>

                      {/* Inline Editor */}
                      <Show when={editingProxy() === proxy.slug}>
                        <div class="space-y-2 pt-2 border-t border-zinc-200/60 dark:border-zinc-800/60">
                          <input
                            type="text"
                            value={editProxyData()}
                            onInput={(e) => setEditProxyData(e.currentTarget.value)}
                            class="w-full px-3 py-1.5 bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg font-mono text-xs outline-none focus:border-blue-500 text-zinc-800 dark:text-zinc-200"
                          />
                          <div class="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setEditingProxy(null)}
                              class="px-2.5 py-1 text-xs font-semibold text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleUpdateProxy(proxy.slug)}
                              class="flex items-center gap-1 px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg cursor-pointer shadow-xs"
                            >
                              <Save class="w-3 h-3" />
                              <span>Save Updates</span>
                            </button>
                          </div>
                        </div>
                      </Show>
                    </div>
                  )}
                </For>

                <Show when={filteredProxies().length === 0}>
                  <div class="text-center py-10 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl bg-zinc-50/50 dark:bg-zinc-950/20">
                    <Settings2 class="w-6 h-6 text-zinc-400 mx-auto mb-2" />
                    <span class="text-xs font-semibold text-zinc-500">
                      {proxiesSearch()
                        ? "No proxies match search."
                        : "No proxy network profiles configured."}
                    </span>
                  </div>
                </Show>
              </div>

              {/* Pagination */}
              <Show when={totalProxiesPages() > 1}>
                <div class="flex items-center justify-between pt-2 border-t border-zinc-200 dark:border-zinc-800 text-xs">
                  <span class="text-zinc-400">
                    Page <strong class="text-zinc-700 dark:text-zinc-300">{proxiesPage()}</strong>{" "}
                    of{" "}
                    <strong class="text-zinc-700 dark:text-zinc-300">{totalProxiesPages()}</strong>
                  </span>
                  <div class="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setProxiesPage((p) => Math.max(1, p - 1))}
                      disabled={proxiesPage() <= 1}
                      class="px-2 py-1 border border-zinc-200 dark:border-zinc-800 rounded-lg disabled:opacity-40 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                    >
                      <ChevronLeft class="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setProxiesPage((p) => Math.min(totalProxiesPages(), p + 1))}
                      disabled={proxiesPage() >= totalProxiesPages()}
                      class="px-2 py-1 border border-zinc-200 dark:border-zinc-800 rounded-lg disabled:opacity-40 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                    >
                      <ChevronRight class="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </Show>
            </div>
          </div>

          {/* Add Proxy Form (Right 5 cols) */}
          <div class="lg:col-span-5 space-y-3">
            <div class="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 p-4 rounded-2xl shadow-xs space-y-3.5">
              <div class="flex items-center gap-2 pb-2 border-b border-zinc-200 dark:border-zinc-800">
                <Plus class="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <h2 class="text-xs font-bold text-zinc-900 dark:text-white">Add Proxy Network</h2>
              </div>

              <form onSubmit={(e) => void handleAddProxy(e)} class="space-y-3">
                <div class="space-y-1">
                  <label class="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Profile Label
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. US SOCKS5 Gateway"
                    value={newProxyTitle()}
                    onInput={(e) => setNewProxyTitle(e.currentTarget.value)}
                    class="w-full px-3 py-1.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none focus:border-blue-500"
                    required
                  />
                </div>

                <div class="space-y-1">
                  <label class="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Proxy URI String
                  </label>
                  <input
                    type="text"
                    placeholder="socks5://user:pass@127.0.0.1:1080"
                    value={newProxyData()}
                    onInput={(e) => setNewProxyData(e.currentTarget.value)}
                    class="w-full px-3 py-1.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-mono outline-none focus:border-blue-500"
                    required
                  />
                </div>

                <div class="flex items-start gap-2 p-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800/60 border border-zinc-200/80 dark:border-zinc-700/80 text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  <Settings2 class="w-4 h-4 flex-shrink-0 mt-0.5 text-zinc-400" />
                  <span>
                    Supported schemes: <code>http://</code>, <code>https://</code>,{" "}
                    <code>socks4://</code>, and <code>socks5://</code>.
                  </span>
                </div>

                <AdaptiveTooltip content="Persist proxy endpoint configuration">
                  <button
                    type="submit"
                    class="w-full flex items-center justify-center bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold py-2 px-4 rounded-xl shadow-xs transition-all active:scale-[0.99] cursor-pointer"
                  >
                    Save Proxy Profile
                  </button>
                </AdaptiveTooltip>
              </form>
            </div>
          </div>
        </div>
      </Show>
    </div>
  );
}
