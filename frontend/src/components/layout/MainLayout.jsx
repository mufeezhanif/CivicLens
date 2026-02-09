/**
 * MainLayout Component
 * Main layout wrapper for dashboard pages with sidebar and navbar
 */

import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { clsx } from 'clsx';
import Sidebar from './Sidebar';
import DashboardNavbar from './DashboardNavbar';
import useUiStore from '../../store/uiStore';

// Page title mapping based on route
const getPageTitle = (pathname) => {
  const titleMap = {
    // Citizen routes
    '/citizen/dashboard': 'Dashboard',
    '/citizen/report': 'Report an Issue',
    '/citizen/complaints': 'My Complaints',
    '/citizen/profile': 'Profile',
    '/citizen/settings': 'Settings',
    '/citizen/notifications': 'Notifications',
    
    // Official routes
    '/official/dashboard': 'Dashboard',
    '/official/complaints': 'Manage Complaints',
    '/official/territory': 'Territory Map',
    '/official/reports': 'Reports',
    '/official/profile': 'Profile',
    
    // Mayor routes
    '/mayor/dashboard': 'Dashboard',
    '/mayor/complaints': 'All Complaints',
    '/map': 'City Map',
    '/mayor/analytics': 'Analytics',
    '/mayor/reports': 'Reports',
    
    // Admin routes
    '/admin/dashboard': 'Admin Dashboard',
    '/admin/users': 'Manage Users',
    '/admin/officials': 'Manage Officials',
    '/admin/territories': 'Manage Territories',
    '/admin/categories': 'Manage Categories',
    '/admin/analytics': 'Analytics',
  };

  // Find exact match or partial match
  return titleMap[pathname] || titleMap[Object.keys(titleMap).find(key => pathname.startsWith(key))] || 'Dashboard';
};

const MobileMenuOverlay = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/50 z-40 lg:hidden"
      onClick={onClose}
    />
  );
};

const MainLayout = () => {
  const location = useLocation();
  const { 
    sidebarCollapsed,
    mobileMenuOpen, 
    closeMobileMenu,
  } = useUiStore();
  
  const pageTitle = getPageTitle(location.pathname);

  // Close mobile menu on route change
  useEffect(() => {
    closeMobileMenu();
  }, [location.pathname, closeMobileMenu]);

  // Close mobile menu on window resize to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        closeMobileMenu();
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [closeMobileMenu]);

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Menu Overlay */}
      <MobileMenuOverlay isOpen={mobileMenuOpen} onClose={closeMobileMenu} />

      {/* Sidebar - Hidden on mobile, visible on desktop */}
      <aside
        className={clsx(
          'fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 lg:transform-none lg:translate-x-0',
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <Sidebar />
      </aside>

      {/* Main Content Area */}
      <div
        className={clsx(
          'min-h-screen transition-all duration-300',
          sidebarCollapsed ? 'lg:ml-20' : 'lg:ml-72'
        )}
      >
        {/* Top Navbar */}
        <DashboardNavbar title={pageTitle} />

        {/* Page Content */}
        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
