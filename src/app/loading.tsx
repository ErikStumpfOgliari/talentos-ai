export default function Loading() {
  return (
    <main className="route-loading-shell min-h-screen bg-slate-100 px-4 py-5 text-slate-950 sm:px-6">
      <div className="mx-auto grid max-w-7xl gap-5">
        <div className="route-loading-progress" aria-hidden="true">
          <span />
        </div>

        <section className="grid gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="grid gap-2">
              <div className="route-loading-line h-3 w-32" />
              <div className="route-loading-line h-7 w-64 max-w-[72vw]" />
            </div>
            <div className="flex gap-2">
              <div className="route-loading-line h-10 w-24" />
              <div className="route-loading-line h-10 w-20" />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4" key={index}>
                <div className="route-loading-line h-3 w-24" />
                <div className="route-loading-line mt-4 h-8 w-16" />
                <div className="route-loading-line mt-3 h-3 w-32" />
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="grid gap-2">
              <div className="route-loading-line h-4 w-40" />
              <div className="route-loading-line h-3 w-56 max-w-[72vw]" />
            </div>
            <div className="route-loading-line h-10 w-48 max-w-full" />
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4" key={index}>
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
    </main>
  );
}
