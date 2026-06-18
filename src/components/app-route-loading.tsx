import { AppNavigationMenu, AppNavigationSidebar } from "@/components/app-navigation-menu";

export function AppRouteLoading({
  title = "Loading workspace",
  withNavigation = true,
}: {
  title?: string;
  withNavigation?: boolean;
}) {
  return (
    <main className="workspace-shell route-loading-shell min-h-screen text-slate-950" data-app-theme-scope>
      <div className={withNavigation ? "grid min-h-screen lg:grid-cols-[264px_minmax(0,1fr)]" : "min-h-screen"}>
        {withNavigation ? <AppNavigationSidebar className="dashboard-surface" /> : null}

        <section className="min-w-0">
          <header className="dashboard-surface sticky top-0 z-10 border-b backdrop-blur">
            <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-3 px-4 py-3 lg:px-6">
              <div className="flex min-w-0 items-center gap-3">
                {withNavigation ? <AppNavigationMenu className="lg:hidden" /> : null}
                <div className="route-loading-line h-10 w-10 shrink-0 rounded-lg" />
                <div className="grid min-w-0 gap-2">
                  <div className="route-loading-line h-3 w-24" />
                  <div className="route-loading-line h-6 w-52 max-w-[54vw]" aria-label={title} />
                </div>
              </div>
              <div className="hidden gap-2 sm:flex">
                <div className="route-loading-line h-10 w-24" />
                <div className="route-loading-line h-10 w-28" />
              </div>
            </div>
          </header>

          <div className="mx-auto grid max-w-7xl gap-5 px-4 py-5 lg:px-6">
            <div className="route-loading-progress" aria-hidden="true">
              <span />
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <article className="dashboard-surface rounded-lg border p-4 shadow-sm" key={index}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="route-loading-line h-3 w-24" />
                    <div className="route-loading-line h-5 w-5" />
                  </div>
                  <div className="route-loading-line mt-4 h-8 w-16" />
                  <div className="route-loading-line mt-3 h-3 w-32" />
                </article>
              ))}
            </div>

            <section className="dashboard-surface grid gap-4 rounded-lg border p-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="grid gap-2">
                  <div className="route-loading-line h-4 w-40" />
                  <div className="route-loading-line h-3 w-64 max-w-[72vw]" />
                </div>
                <div className="route-loading-line h-10 w-48 max-w-full" />
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div className="dashboard-overlay rounded-lg border p-4" key={index}>
                    <div className="route-loading-line h-4 w-36" />
                    <div className="route-loading-line mt-3 h-3 w-full" />
                    <div className="route-loading-line mt-2 h-3 w-5/6" />
                    <div className="mt-4 flex gap-2">
                      <div className="route-loading-line h-7 w-16" />
                      <div className="route-loading-line h-7 w-20" />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}
