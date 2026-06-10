import type { IconComponent } from "@/components/ui/IconButton";

export type PlaygroundTab<TTab extends string = string> = {
  id: TTab;
  label: string;
  Icon: IconComponent;
};

export type PlaygroundTabsProps<TTab extends string = string> = {
  tabs: Array<PlaygroundTab<TTab>>;
  activeTab: TTab;
  onTabChange: (tab: TTab) => void;
};

export function PlaygroundTabs<TTab extends string>({
  tabs,
  activeTab,
  onTabChange,
}: PlaygroundTabsProps<TTab>) {
  return (
    <div className="flex flex-wrap gap-2 rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
      {tabs.map((tab) => {
        const Icon = tab.Icon;
        const selected = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            className={`inline-flex h-10 items-center gap-2 rounded-md px-3 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-primary/30 ${
              selected
                ? "bg-slate-950 text-white"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
            }`}
          >
            <Icon size={16} weight={selected ? "fill" : "regular"} />
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
