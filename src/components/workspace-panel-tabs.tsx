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
    <div className="grid gap-4">
      <div className="flex flex-wrap gap-2 rounded-lg border border-slate-200 bg-slate-50 p-1.5">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab.id;

          return (
            <button
              aria-pressed={isActive}
              className={`inline-flex min-h-9 flex-1 items-center justify-center rounded-md px-3 py-2 text-sm font-semibold transition ${
                isActive
                  ? "bg-slate-950 text-white shadow-sm"
                  : "text-slate-600 hover:bg-white hover:text-slate-950"
              }`}
              key={tab.id}
              onClick={() => setActiveTabId(tab.id)}
              type="button"
            >
              {translateText(tab.label, language)}
            </button>
          );
        })}
      </div>

      {activeTab.description ? (
        <p className="text-sm leading-6 text-slate-500">{translateText(activeTab.description, language)}</p>
      ) : null}

      <div>{activeTab.children}</div>
    </div>
  );
}
