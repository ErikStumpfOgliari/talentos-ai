"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { useSiteLanguage } from "@/components/site-language-provider";
import { translateText } from "@/lib/site-language";

export type WorkspacePanelTab = {
  children: ReactNode;
  description?: string;
  id: string;
  label: string;
};

export function WorkspacePanelTabs({
  tabs,
}: {
  tabs: WorkspacePanelTab[];
}) {
  const { language } = useSiteLanguage();
  const [activeTabId, setActiveTabId] = useState(tabs[0]?.id ?? "");
  const activeTab = tabs.find((tab) => tab.id === activeTabId) ?? tabs[0];

  if (!activeTab) {
    return null;
  }

  return (
    <div className="grid min-w-0 max-w-full gap-4 overflow-x-hidden">
      <div className="grid min-w-0 grid-cols-1 gap-2 rounded-lg border border-slate-200 bg-slate-50 p-1.5 min-[360px]:grid-cols-2">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab.id;

          return (
            <button
              aria-pressed={isActive}
              className={`inline-flex min-h-9 min-w-0 items-center justify-center overflow-hidden rounded-md px-2 py-2 text-center text-xs font-semibold leading-tight transition sm:px-3 sm:text-sm ${
                isActive
                  ? "bg-slate-950 text-white shadow-sm"
                  : "text-slate-600 hover:bg-white hover:text-slate-950"
              }`}
              key={tab.id}
              onClick={() => setActiveTabId(tab.id)}
              type="button"
            >
              <span className="max-w-full whitespace-normal break-words">{translateText(tab.label, language)}</span>
            </button>
          );
        })}
      </div>

      {activeTab.description ? (
        <p className="break-words text-sm leading-6 text-slate-500">{translateText(activeTab.description, language)}</p>
      ) : null}

      <div className="min-w-0 max-w-full overflow-x-hidden">{activeTab.children}</div>
    </div>
  );
}
