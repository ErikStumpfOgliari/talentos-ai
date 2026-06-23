"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { AppNavigationPanelContent } from "@/components/app-navigation-menu";
import { useSiteLanguage } from "@/components/site-language-provider";
import { translateText } from "@/lib/site-language";
import { Menu, PanelRightClose, X } from "lucide-react";

export function WorkspacePageShell({
  actions,
  children,
  contentClassName = "grid gap-5",
  icon,
  organizationName,
  rightPanel,
  rightPanelButtonIcon,
  rightPanelButtonLabel,
  rightPanelDescription,
  rightPanelTitle,
  title,
}: {
  actions?: ReactNode;
  children: ReactNode;
  contentClassName?: string;
  icon: ReactNode;
  organizationName: string;
  rightPanel?: ReactNode;
  rightPanelButtonIcon?: ReactNode;
  rightPanelButtonLabel?: string;
  rightPanelDescription?: string;
  rightPanelTitle?: string;
  title: string;
}) {
  const { language } = useSiteLanguage();
  const [navigationOpen, setNavigationOpen] = useState(false);
  const [rightPanelOpen, setRightPanelOpen] = useState(false);
  const [navigationUsesOverlay, setNavigationUsesOverlay] = useState(false);
  const [rightPanelUsesOverlay, setRightPanelUsesOverlay] = useState(false);
  const hasRightPanel = Boolean(rightPanel);
  const overlayLayerOpen = (navigationOpen && navigationUsesOverlay) || (rightPanelOpen && rightPanelUsesOverlay);
  const pageTitle = translateText(title, language);
  const panelTitle = rightPanelTitle ? translateText(rightPanelTitle, language) : undefined;
  const panelDescription = rightPanelDescription ? translateText(rightPanelDescription, language) : undefined;
  const panelButtonLabel = rightPanelButtonLabel
    ? translateText(rightPanelButtonLabel, language)
    : panelTitle ?? translateText("Open", language);

  function toggleNavigationPanel() {
    const nextNavigationOpen = !navigationOpen;
    setNavigationOpen(nextNavigationOpen);

    if (nextNavigationOpen) {
      setRightPanelOpen(false);
    }
  }

  function toggleRightPanel() {
    const nextRightPanelOpen = !rightPanelOpen;
    setRightPanelOpen(nextRightPanelOpen);

    if (nextRightPanelOpen) {
      setNavigationOpen(false);
    }
  }

  useEffect(() => {
    const navigationQuery = window.matchMedia("(max-width: 767px)");
    const rightPanelQuery = window.matchMedia("(max-width: 1279px)");
    const syncOverlayMode = () => {
      setNavigationUsesOverlay(navigationQuery.matches);
      setRightPanelUsesOverlay(rightPanelQuery.matches);
    };

    syncOverlayMode();
    navigationQuery.addEventListener("change", syncOverlayMode);
    rightPanelQuery.addEventListener("change", syncOverlayMode);

    return () => {
      navigationQuery.removeEventListener("change", syncOverlayMode);
      rightPanelQuery.removeEventListener("change", syncOverlayMode);
    };
  }, []);

  useEffect(() => {
    if (!overlayLayerOpen) {
      return undefined;
    }

    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousBodyOverflow = document.body.style.overflow;
    const previousBodyOverscroll = document.body.style.overscrollBehavior;
    const previousBodyWidth = document.body.style.width;

    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    document.body.style.overscrollBehavior = "none";
    document.body.style.width = "100%";

    return () => {
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.body.style.overflow = previousBodyOverflow;
      document.body.style.overscrollBehavior = previousBodyOverscroll;
      document.body.style.width = previousBodyWidth;
    };
  }, [overlayLayerOpen]);

  return (
    <main className="workspace-shell min-h-screen overflow-x-hidden bg-slate-100 text-slate-950" data-app-theme-scope>
      <div className="relative flex min-h-screen w-full">
        {navigationOpen ? (
          <button
            aria-label="Close navigation"
            className="fixed inset-0 z-30 touch-none bg-slate-950/35 backdrop-blur-[1px] md:hidden"
            onClick={() => setNavigationOpen(false)}
            type="button"
          />
        ) : null}
        <aside
          aria-hidden={!navigationOpen}
          className={`fixed inset-y-0 left-0 z-40 shrink-0 overflow-hidden border-r border-slate-200 bg-white shadow-xl transition-[width,transform,border-color] duration-300 ease-out will-change-transform md:relative md:z-auto md:shadow-none ${
            navigationOpen
              ? "w-[min(20rem,calc(100dvw-1rem))] translate-x-0 md:w-[264px]"
              : "w-[min(20rem,calc(100dvw-1rem))] -translate-x-[105%] md:w-0 md:max-w-0 md:basis-0 md:-translate-x-full md:border-r-0"
          }`}
          data-workspace-sidebar
        >
          <div className="h-dvh w-full overflow-hidden">
            <AppNavigationPanelContent />
          </div>
        </aside>

        <div className={`min-w-0 flex-1 ${rightPanelOpen && rightPanelUsesOverlay ? "pointer-events-none select-none" : ""}`}>
          <header className="border-b border-slate-200 bg-white">
            <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4 md:flex-row md:items-center md:justify-between lg:px-6">
              <div className="min-w-0">
                <div className="flex min-w-0 items-center gap-3">
                  <button
                    aria-label={navigationOpen ? "Close navigation" : "Open navigation"}
                    aria-pressed={navigationOpen}
                    className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 transition hover:scale-[1.03] hover:border-slate-300 hover:bg-slate-50 active:scale-[0.98]"
                    data-workspace-menu-button
                    onClick={toggleNavigationPanel}
                    type="button"
                  >
                    {navigationOpen ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
                  </button>
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-950 text-white">
                    {icon}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold uppercase text-slate-500">{organizationName}</p>
                    <h1 className="break-words text-xl font-semibold leading-tight text-slate-950 sm:text-2xl">{pageTitle}</h1>
                  </div>
                </div>
              </div>

              <div className="flex min-w-0 flex-wrap gap-2 md:justify-end">
                {actions}
                {hasRightPanel ? (
                  <button
                    aria-expanded={rightPanelOpen}
                    aria-pressed={rightPanelOpen}
                    className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-slate-950 px-3 text-sm font-semibold text-white transition hover:scale-[1.03] hover:bg-slate-800 active:scale-[0.98] sm:w-auto"
                    data-workspace-panel-button
                    onClick={toggleRightPanel}
                    type="button"
                  >
                    {rightPanelButtonIcon}
                    {panelButtonLabel}
                  </button>
                ) : null}
              </div>
            </div>
          </header>

          <div className={`mx-auto w-full max-w-7xl px-4 py-5 lg:px-6 ${contentClassName}`}>{children}</div>
        </div>

        {hasRightPanel ? (
          <>
            {rightPanelOpen ? (
              <button
                aria-label="Close panel"
                className="fixed inset-0 z-[80] touch-none bg-slate-950/35 backdrop-blur-[1px] xl:hidden"
                onClick={() => setRightPanelOpen(false)}
                type="button"
              />
            ) : null}
          <aside
            aria-hidden={!rightPanelOpen}
            className={`fixed inset-y-0 right-0 z-[90] max-w-[100dvw] shrink-0 overflow-hidden border-l border-slate-200 bg-white shadow-xl transition-[width] duration-300 ease-out xl:relative xl:z-auto xl:shadow-none ${
              rightPanelOpen ? "w-[100dvw] sm:w-[400px]" : "w-0"
            }`}
            data-workspace-right-panel
          >
            <div
              className={`h-dvh w-full max-w-[100dvw] overflow-x-hidden overflow-y-auto overscroll-contain transition duration-300 ease-out sm:w-[400px] ${
                rightPanelOpen ? "translate-x-0 opacity-100" : "translate-x-10 opacity-0"
              }`}
              data-workspace-panel-scroll
            >
              <div className="sticky top-0 z-10 flex h-16 items-center justify-between gap-3 border-b border-slate-200 bg-white px-5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-950">{panelTitle ?? panelButtonLabel}</p>
                  {panelDescription ? <p className="truncate text-xs text-slate-500">{panelDescription}</p> : null}
                </div>
                <button
                  aria-label="Close panel"
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:scale-[1.03] hover:bg-slate-50 active:scale-[0.98]"
                  onClick={() => setRightPanelOpen(false)}
                  type="button"
                >
                  <PanelRightClose className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
              <div className="max-w-full overflow-x-hidden p-4 sm:p-5" data-workspace-panel-body>{rightPanel}</div>
            </div>
          </aside>
          </>
        ) : null}
      </div>
    </main>
  );
}
