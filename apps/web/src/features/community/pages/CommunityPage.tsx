import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { List, Network } from 'lucide-react';
import { DirectoryPage } from './DirectoryPage';
import { SchoolStructurePage } from './SchoolStructurePage';
import { useCurrentUser } from '../../../hooks/useCurrentUser';

type Tab = 'directory' | 'structure';

export function CommunityPage() {
  const { t } = useTranslation();
  const user = useCurrentUser();

  // Parents default to structure view
  const defaultTab: Tab = user?.role === 'parent' ? 'structure' : 'directory';
  const [activeTab, setActiveTab] = useState<Tab>(defaultTab);

  return (
    <div>
      {/* Page header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t('community', 'Community')}</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {activeTab === 'directory'
              ? t('directoryDesc', 'School community — names and roles only')
              : t('structureDesc', 'School structure — classes, teachers and students')}
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-1 p-1 bg-muted rounded-lg">
          <button
            onClick={() => setActiveTab('directory')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'directory'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <List className="w-4 h-4" />
            {t('directory', 'Directory')}
          </button>
          <button
            onClick={() => setActiveTab('structure')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'structure'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Network className="w-4 h-4" />
            {t('structure', 'Structure')}
          </button>
        </div>
      </div>

      {/* Tab content */}
      {activeTab === 'directory' ? (
        <DirectoryPage embedded />
      ) : (
        <SchoolStructurePage />
      )}
    </div>
  );
}
