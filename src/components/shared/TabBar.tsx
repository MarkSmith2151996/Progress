'use client';

interface Tab {
  id: string;
  label: string;
}

interface TabBarProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

export function TabBar({ tabs, activeTab, onTabChange }: TabBarProps) {
  return (
    <div
      className="flex border-b"
      style={{ borderColor: 'var(--border-color)' }}
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className="flex-1 px-4 py-2 text-sm transition-all duration-200"
          style={{
            backgroundColor:
              activeTab === tab.id ? 'var(--bg-tertiary)' : 'transparent',
            color:
              activeTab === tab.id
                ? 'var(--text-primary)'
                : 'var(--text-muted)',
            borderBottom:
              activeTab === tab.id
                ? '2px solid var(--accent-primary)'
                : '2px solid transparent',
          }}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
