"use client"

interface MainLayoutProps {
  children: React.ReactNode;
  showLeadTabs?: boolean;
  activeTab?: string;
  onTabChange?: (value: string) => void;
}

export function MainLayout({ 
  children, 
  showLeadTabs = false, 
  activeTab = 'lead-master', 
  onTabChange 
}: MainLayoutProps) {
  return (
    <div>
      {children}
    </div>
  );
}
