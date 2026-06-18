"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { AppNavigationPanelContent } from "@/components/app-navigation-menu";
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
  const [navigationOpen, setNavigationOpen] = useState(false);
  const [rightPanelOpen, setRightPanelOpen] = useState(false);
  const hasRightPanel = Boolean(rightPanel);

  return (
    <main className="workspace-shell min-h-screen overflow-x-hidden bg-slate-100 text-slate-950" data-app-theme-scope>
      <div className="relative flex min-h-screen w-full">
        {navigationOpen ? (
          <button
            aria-label="Close navigation"
            className="fixed inset-0 z-30 bg-slate-950/35 backdrop-blur-[1px] md:hidden"
            onClick={() => setNavigationOpen(false)}
            type="button"
          />
        ) : null}
        <aside
          aria-hidden={!navigationOpen}
          className={`fixed inset-y-0 left-0 z-40 shrink-0 overflow-hidden border-r border-slate-200 bg-white shadow-xl transition-[width] duration-300 ease-out md:relative md:z-auto md:shadow-none ${
            navigationOpen ? "w-[min(20rem,calc(100vw-2rem))] md:w-[264px]" : "w-0"
          }`}
          data-workspace-sidebar
        >
          <div
            className={`h-screen w-[min(20rem,calc(100vw-2rem))] transition duration-300 ease-out md:w-[264px] ${
              navigationOpen ? "translate-x-0 opacity-100" : "-translate-x-10 opacity-0"
            }`}
          >
            <AppNavigationPanelContent />
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="border-b border-slate-200 bg-white">
            <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4 md:flex-row md:items-center md:justify-between lg:px-6">
              <div className="min-w-0">
                <div className="flex min-w-0 items-center gap-3">
                  <button
                    aria-label={navigationOpen ? "Close navigation" : "Open navigation"}
                    aria-pressed={navigationOpen}
                    className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 transition hover:scale-[1.03] hover:border-slate-300 hover:bg-slate-50 active:scale-[0.98]"
                    data-workspace-menu-button
                    onClick={() => setNavigationOpen((isOpen) => !isOpen)}
                    type="button"
                  >
                    {navigationOpen ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
                  </button>
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-950 text-white">
                    {icon}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold uppercase text-slate-500">{organizationName}</p>
                    <h1 className="break-words text-xl font-semibold leading-tight text-slate-950 sm:text-2xl">{title}</h1>
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
                    onClick={() => setRightPanelOpen((isOpen) => !isOpen)}
                    type="button"
                  >
                    {rightPanelButtonIcon}
                    {rightPanelButtonLabel ?? rightPanelTitle ?? "Open"}
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
                className="fixed inset-0 z-40 bg-slate-950/35 backdrop-blur-[1px] xl:hidden"
                onClick={() => setRightPanelOpen(false)}
                type="button"
              />
            ) : null}
          <aside
            aria-hidden={!rightPanelOpen}
            className={`fixed inset-y-0 right-0 z-50 shrink-0 overflow-hidden border-l border-slate-200 bg-white shadow-xl transition-[width] duration-300 ease-out xl:relative xl:z-auto xl:shadow-none ${
              rightPanelOpen ? "w-full sm:w-[400px]" : "w-0"
            }`}
            data-workspace-right-panel
          >
            <div
              className={`h-screen w-screen max-w-full overflow-y-auto transition duration-300 ease-out sm:w-[400px] ${
                rightPanelOpen ? "translate-x-0 opacity-100" : "translate-x-10 opacity-0"
              }`}
            >
              <div className="sticky top-0 z-10 flex h-16 items-center justify-between gap-3 border-b border-slate-200 bg-white px-5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-950">{rightPanelTitle ?? rightPanelButtonLabel}</p>
                  {rightPanelDescription ? <p className="truncate text-xs text-slate-500">{rightPanelDescription}</p> : null}
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
              <div className="p-5">{rightPanel}</div>
            </div>
          </aside>
          </>
        ) : null}
      </div>
    </main>
  );
}
