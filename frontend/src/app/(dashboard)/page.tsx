'use client';

import DashboardPanel from '@/app/(dashboard)/crm/components/DashboardPanel';

export default function DashboardPage() {
  return (
    <div className="overflow-y-auto flex-1 min-h-0">
      <DashboardPanel />
    </div>
  );
}
