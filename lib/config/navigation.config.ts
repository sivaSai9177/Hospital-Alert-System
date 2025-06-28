export interface NavigationItem {
  id: string;
  title: string;
  icon: string;
  href?: string;
  badge?: string | number;
  badgeVariant?: 'default' | 'secondary' | 'error' | 'outline';
  children?: NavigationItem[];
  requiredPermission?: string;
  shortcut?: string;
  isNew?: boolean;
  showInTabBar?: boolean;
  showInDrawer?: boolean;
}

export const navigationConfig: NavigationItem[] = [
  {
    id: 'home',
    title: 'Dashboard',
    icon: 'house.fill',
    href: '/home',
    shortcut: '⌘D',
    showInTabBar: true,
    showInDrawer: true,
  },
  {
    id: 'alerts',
    title: 'Alerts',
    icon: 'bell.fill',
    href: '/alerts',
    badge: 0, // Will be updated dynamically
    badgeVariant: 'error',
    shortcut: '⌘A',
    showInTabBar: true,
    showInDrawer: true,
    requiredPermission: 'view_alerts',
    children: [
      {
        id: 'active-alerts',
        title: 'Active Alerts',
        icon: 'bell.fill',
        href: '/alerts',
        badge: 0,
      },
      {
        id: 'escalation-queue',
        title: 'Escalation Queue',
        icon: 'exclamationmark.triangle',
        href: '/alerts/escalation-queue',
        badge: 0,
        isNew: true,
      },
      {
        id: 'alert-history',
        title: 'Alert History',
        icon: 'clock.arrow.circlepath',
        href: '/alerts/history',
      },
    ],
  },
  {
    id: 'patients',
    title: 'Patients',
    icon: 'person.2.fill',
    href: '/patients',
    shortcut: '⌘P',
    showInTabBar: true,
    showInDrawer: true,
    requiredPermission: 'view_patients',
  },
  {
    id: 'shifts',
    title: 'Shift Management',
    icon: 'calendar.badge.clock',
    showInDrawer: true,
    requiredPermission: 'manage_shifts',
    children: [
      {
        id: 'shift-schedule',
        title: 'Schedule',
        icon: 'calendar',
        href: '/shifts/schedule',
      },
      {
        id: 'shift-handover',
        title: 'Handover',
        icon: 'arrow.triangle.2.circlepath',
        href: '/shifts/handover',
      },
      {
        id: 'shift-reports',
        title: 'Reports',
        icon: 'doc.text',
        href: '/shifts/reports',
      },
    ],
  },
  {
    id: 'analytics',
    title: 'Analytics',
    icon: 'chart.line.uptrend.xyaxis',
    showInDrawer: true,
    requiredPermission: 'view_analytics',
    children: [
      {
        id: 'response-analytics',
        title: 'Response Times',
        icon: 'speedometer',
        href: '/analytics/response-analytics',
        isNew: true,
      },
      {
        id: 'department-analytics',
        title: 'Department Stats',
        icon: 'chart.bar',
        href: '/analytics/departments',
      },
      {
        id: 'staff-analytics',
        title: 'Staff Performance',
        icon: 'person.3',
        href: '/analytics/staff',
      },
    ],
  },
  {
    id: 'logs',
    title: 'Activity & Logs',
    icon: 'doc.text.magnifyingglass',
    showInDrawer: true,
    requiredPermission: 'view_audit_logs',
    children: [
      {
        id: 'activity-logs',
        title: 'Activity Logs',
        icon: 'list.bullet.rectangle',
        href: '/logs/activity-logs',
      },
      {
        id: 'audit-trail',
        title: 'Audit Trail',
        icon: 'shield.lefthalf.filled',
        href: '/logs/audit',
      },
    ],
  },
  {
    id: 'settings',
    title: 'Settings',
    icon: 'gearshape.fill',
    href: '/settings',
    shortcut: '⌘,',
    showInDrawer: true,
  },
  {
    id: 'more',
    title: 'More',
    icon: 'ellipsis',
    showInTabBar: true,
    // This will trigger drawer open on mobile
  },
];

// Quick actions for floating button
export const quickActions = [
  {
    id: 'create-alert',
    title: 'Create Alert',
    icon: 'plus.circle.fill',
    href: '/create-alert',
    requiredPermission: 'create_alerts',
    color: 'destructive',
  },
  {
    id: 'add-patient',
    title: 'Add Patient',
    icon: 'person.badge.plus',
    href: '/patients/new',
    requiredPermission: 'manage_patients',
    color: 'primary',
  },
];

// Help & Support section (always visible)
export const supportNavigation: NavigationItem[] = [
  {
    id: 'documentation',
    title: 'Documentation',
    icon: 'book',
    href: '/docs',
    showInDrawer: true,
  },
  {
    id: 'support',
    title: 'Support',
    icon: 'questionmark.circle',
    href: '/support',
    showInDrawer: true,
  },
  {
    id: 'shortcuts',
    title: 'Shortcuts',
    icon: 'keyboard',
    shortcut: '⌘K',
    showInDrawer: true,
  },
];

// Function to filter navigation based on permissions
export function filterNavigationByPermissions(
  items: NavigationItem[],
  permissions: Record<string, boolean>
): NavigationItem[] {
  return items.filter(item => {
    if (item.requiredPermission && !permissions[item.requiredPermission]) {
      return false;
    }
    
    if (item.children) {
      item.children = filterNavigationByPermissions(item.children, permissions);
    }
    
    return true;
  });
}

// Get items for tab bar (mobile)
export function getTabBarItems(items: NavigationItem[]): NavigationItem[] {
  return items.filter(item => item.showInTabBar);
}

// Get items for drawer
export function getDrawerItems(items: NavigationItem[]): NavigationItem[] {
  return items.filter(item => item.showInDrawer);
}