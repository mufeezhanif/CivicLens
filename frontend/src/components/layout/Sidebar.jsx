/**
 * Sidebar Component
 * Navigation sidebar for dashboard pages
 */

import { Link, useLocation } from 'react-router-dom';
import { clsx } from 'clsx';
import { useAuth } from '../../contexts';
import useUiStore from '../../store/uiStore';

// Icon components
const Icons = {
  Dashboard: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
    </svg>
  ),
  UserPlus: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
    </svg>
  ),
  Building: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  ),
  Invite: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  ),
  Report: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  Complaints: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
  ),
  Map: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
    </svg>
  ),
  Users: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  ),
  Settings: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  Profile: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  ),
  Analytics: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
  Territory: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  Categories: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
    </svg>
  ),
  Chat: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  ),
  Reports: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  ChevronLeft: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  ),
  ChevronRight: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  ),
};

// Navigation items by role
const getNavigationItems = (role) => {
  const citizenNav = [
    { name: 'Dashboard', href: '/citizen/dashboard', icon: Icons.Dashboard },
    { name: 'Report Issue', href: '/citizen/report', icon: Icons.Report },
    { name: 'My Complaints', href: '/citizen/complaints', icon: Icons.Complaints },
    { name: 'Messages', href: '/citizen/chat', icon: Icons.Chat },
    { name: 'Map View', href: '/map', icon: Icons.Map },
    { name: 'Profile', href: '/citizen/profile', icon: Icons.Profile },
    { name: 'Settings', href: '/citizen/settings', icon: Icons.Settings },
  ];

  const officialNav = [
    { name: 'Dashboard', href: '/official/dashboard', icon: Icons.Dashboard },
    { name: 'Manage Complaints', href: '/official/complaints', icon: Icons.Complaints },
    { name: 'Chat', href: '/official/chat', icon: Icons.Chat },
    { name: 'Territory Map', href: '/official/territory', icon: Icons.Territory },
    { name: 'Reports', href: '/official/reports', icon: Icons.Reports },
    { name: 'Profile', href: '/official/profile', icon: Icons.Profile },
  ];

  const mayorNav = [
    { name: 'Dashboard', href: '/mayor/dashboard', icon: Icons.Dashboard },
    { name: 'All Complaints', href: '/mayor/complaints', icon: Icons.Complaints },
    { name: 'Chat', href: '/mayor/chat', icon: Icons.Chat },
    { name: 'City Map', href: '/map', icon: Icons.Map },
    { name: 'Analytics', href: '/mayor/analytics', icon: Icons.Analytics },
    { name: 'Reports', href: '/mayor/reports', icon: Icons.Reports },
    { name: 'Invite Town Chairman', href: '/mayor/invite/town-chairman', icon: Icons.UserPlus },
  ];

  const townChairmanNav = [
    { name: 'Dashboard', href: '/official/dashboard', icon: Icons.Dashboard },
    { name: 'Manage Complaints', href: '/official/complaints', icon: Icons.Complaints },
    { name: 'Chat', href: '/official/chat', icon: Icons.Chat },
    { name: 'Territory Map', href: '/official/territory', icon: Icons.Territory },
    { name: 'Reports', href: '/official/reports', icon: Icons.Reports },
    { name: 'Invite UC Chairman', href: '/official/invite/uc-chairman', icon: Icons.UserPlus },
    { name: 'Profile', href: '/official/profile', icon: Icons.Profile },
  ];

  const adminNav = [
    { name: 'Dashboard', href: '/admin/dashboard', icon: Icons.Dashboard },
    { name: 'Users', href: '/admin/users', icon: Icons.Users },
    { name: 'Territories', href: '/admin/territories', icon: Icons.Territory },
    { name: 'Categories', href: '/admin/categories', icon: Icons.Categories },
    { name: 'Analytics', href: '/admin/analytics', icon: Icons.Analytics },
    { divider: true, name: 'Account Management' },
    { name: 'Invite Mayor', href: '/admin/invite/mayor', icon: Icons.Building },
    { name: 'Invite Town Chairman', href: '/admin/invite/town-chairman', icon: Icons.UserPlus },
    { name: 'Invite UC Chairman', href: '/admin/invite/uc-chairman', icon: Icons.UserPlus },
  ];

  switch (role) {
    case 'admin':
    case 'website_admin':
      return adminNav;
    case 'mayor':
      return mayorNav;
    case 'town_chairman':
    case 'township_officer':
      return townChairmanNav;
    case 'uc_chairman':
      return officialNav;
    case 'citizen':
    default:
      return citizenNav;
  }
};

const getRoleLabel = (role) => {
  switch (role) {
    case 'admin':
    case 'website_admin':
      return 'Administrator';
    case 'mayor':
      return 'Mayor Portal';
    case 'town_chairman':
    case 'township_officer':
      return 'Town Chairman';
    case 'uc_chairman':
      return 'UC Chairman';
    default:
      return 'Citizen Portal';
  }
};

const Sidebar = () => {
  const location = useLocation();
  const { user } = useAuth();
  const { sidebarCollapsed, toggleSidebarCollapsed } = useUiStore();
  
  const navItems = getNavigationItems(user?.role);
  const roleLabel = getRoleLabel(user?.role);

  return (
    <aside
      className={clsx(
        'h-screen bg-white border-r border-foreground/10 flex flex-col transition-all duration-300',
        sidebarCollapsed ? 'w-20' : 'w-72'
      )}
    >
      {/* Header */}
      <div className="px-6 py-6 border-b border-foreground/10 flex items-center justify-between">
        {!sidebarCollapsed && (
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-foreground/50">{roleLabel}</p>
            <h1 className="text-xl font-semibold mt-1 text-primary">CivicLens</h1>
          </div>
        )}
        {sidebarCollapsed && (
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center mx-auto">
            <span className="text-white font-bold text-lg">C</span>
          </div>
        )}
        <button
          onClick={toggleSidebarCollapsed}
          className={clsx(
            'p-2 rounded-lg hover:bg-secondary/20 hover:text-primary text-foreground/50 transition-all duration-200',
            sidebarCollapsed && 'mx-auto mt-2'
          )}
        >
          {sidebarCollapsed ? <Icons.ChevronRight /> : <Icons.ChevronLeft />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
        {navItems.map((item, index) => {
          // Handle dividers
          if (item.divider) {
            if (sidebarCollapsed) return null;
            return (
              <div key={`divider-${index}`} className="pt-4 pb-2 px-4">
                <p className="text-xs font-semibold text-foreground/40 uppercase tracking-wider">{item.name}</p>
              </div>
            );
          }

          const isActive = location.pathname === item.href || 
            (item.href !== '/' && location.pathname.startsWith(item.href));
          
          return (
            <Link
              key={item.href}
              to={item.href}
              className={clsx(
                'flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200',
                isActive
                  ? 'bg-primary text-white shadow-md'
                  : 'text-foreground/70 hover:bg-secondary/15 hover:text-primary hover:translate-x-1',
                sidebarCollapsed && 'justify-center px-3'
              )}
              title={sidebarCollapsed ? item.name : undefined}
            >
              <item.icon />
              {!sidebarCollapsed && (
                <span className="text-sm font-medium">{item.name}</span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User Info */}
      {user && !sidebarCollapsed && (
        <div className="p-4 border-t border-foreground/10">
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-foreground/5">
            <div className="w-10 h-10 rounded-full bg-primary/15 text-primary font-semibold flex items-center justify-center">
              {user.name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{user.name}</p>
              <p className="text-xs text-foreground/50 truncate">{user.email}</p>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;
