import type { Feature } from "@/types";

interface WikiSidebarProps {
  features: Feature[];
  activeFeatureId: string;
  onSelect: (id: string) => void;
}

export function WikiSidebar({
  features,
  activeFeatureId,
  onSelect,
}: WikiSidebarProps) {
  return (
    <nav className="flex h-full flex-col gap-0.5 overflow-y-auto p-2">
      <p className="px-2 py-2 text-[11px] font-medium uppercase tracking-widest text-muted-foreground/50">
        Features
      </p>
      {features.map((feature) => (
        <button
          key={feature.id}
          onClick={() => onSelect(feature.id)}
          className={`rounded-md px-2 py-1.5 text-left text-[13px] transition-colors ${
            feature.id === activeFeatureId
              ? "bg-accent text-foreground"
              : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
          }`}
        >
          {feature.name}
        </button>
      ))}
    </nav>
  );
}
