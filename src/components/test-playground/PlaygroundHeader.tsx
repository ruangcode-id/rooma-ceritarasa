import { PlaygroundTabs, type PlaygroundTab } from "./PlaygroundTabs";

export type PlaygroundHeaderProps<TTab extends string = string> = {
  tabs: Array<PlaygroundTab<TTab>>;
  activeTab: TTab;
  onTabChange: (tab: TTab) => void;
};

export function PlaygroundHeader<TTab extends string>({
  tabs,
  activeTab,
  onTabChange,
}: PlaygroundHeaderProps<TTab>) {
  return (
    <header className="flex flex-col gap-5 border-b border-slate-200 pb-6 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <p className="text-xs uppercase tracking-[0.25em] text-slate-500">
          Rooma Ceritarasa
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-950">
          Component Testing
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          Playground internal untuk mengetes komponen dashboard, table, form,
          state visual, dan layout publik dalam satu route.
        </p>
      </div>

      <PlaygroundTabs
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={onTabChange}
      />
    </header>
  );
}
