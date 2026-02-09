import { lazy, Suspense } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import './App.css'
import './styles/map.css'
import { AuthProvider, NetworkProvider } from './contexts'
import ErrorBoundary from './components/ErrorBoundary'
import ProtectedRoute, { 
  PublicOnlyRoute, 
  CitizenRoute, 
  AdminRoute,
  MayorRoute,
  OfficialRoute
} from './components/ProtectedRoute'

// Eagerly loaded (needed on first paint)
import { LandingPage } from './pages'
import { MainLayout } from './components/layout'

// Lazy loaded pages — split into separate chunks
const MapPage = lazy(() => import('./pages/MapPage'))
const AboutPage = lazy(() => import('./pages/AboutPage'))
const ContactPage = lazy(() => import('./pages/ContactPage'))
const PrivacyPolicyPage = lazy(() => import('./pages/PrivacyPolicyPage'))
const TermsOfServicePage = lazy(() => import('./pages/TermsOfServicePage'))
const ShareLocation = lazy(() => import('./pages/ShareLocation'))
const TransparencyDashboard = lazy(() => import('./pages/TransparencyDashboard'))

// Auth Pages
const CitizenLogin = lazy(() => import('./pages/auth/CitizenLogin'))
const CitizenRegister = lazy(() => import('./pages/auth/CitizenRegister'))
const OfficialLogin = lazy(() => import('./pages/auth/OfficialLogin'))
const AdminLogin = lazy(() => import('./pages/auth/AdminLogin'))
const CitizenForgotPassword = lazy(() =>
  import('./pages/auth/ForgotPassword').then(m => ({ default: m.CitizenForgotPassword }))
)
const OfficialForgotPassword = lazy(() =>
  import('./pages/auth/ForgotPassword').then(m => ({ default: m.OfficialForgotPassword }))
)

// Dashboard Pages
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'))
const CitizenDashboard = lazy(() => import('./pages/citizen/CitizenDashboard'))
const MayorDashboard = lazy(() => import('./pages/mayor/MayorDashboard'))

// Citizen Pages
const ReportIssuePage = lazy(() => import('./pages/citizen/ReportIssuePage'))
const MyComplaintsPage = lazy(() => import('./pages/citizen/MyComplaintsPage'))
const ComplaintDetailPage = lazy(() => import('./pages/citizen/ComplaintDetailPage'))
const CitizenProfilePage = lazy(() => import('./pages/citizen/ProfilePage'))
const CitizenSettingsPage = lazy(() => import('./pages/citizen/SettingsPage'))
const NotificationsPage = lazy(() => import('./pages/citizen/NotificationsPage'))

// Chat Page
const ChatPage = lazy(() => import('./pages/Chat'))

// Official Pages
const OfficialDashboard = lazy(() => import('./pages/official/OfficialDashboard'))
const ManageComplaintsPage = lazy(() => import('./pages/official/ManageComplaintsPage'))
const TerritoryPage = lazy(() => import('./pages/official/TerritoryPage'))

// Admin Pages
const ManageUsersPage = lazy(() => import('./pages/admin/ManageUsersPage'))
const ManageTerritoriesPage = lazy(() => import('./pages/admin/ManageTerritoriesPage'))
const ManageCategoriesPage = lazy(() => import('./pages/admin/ManageCategoriesPage'))
const InvitationPage = lazy(() => import('./pages/admin/InvitationPage'))

// Lazy chatbot widget
const ChatWidget = lazy(() => import('./components/Chatbot').then(m => ({ default: m.ChatWidget })))

// Loading fallback
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="flex flex-col items-center gap-3">
      <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      <p className="text-foreground/60 text-sm">Loading...</p>
    </div>
  </div>
)

// Error Pages
const NotFoundPage = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="text-center">
      <h1 className="text-6xl font-bold text-primary mb-4">404</h1>
      <p className="text-xl text-foreground/60 mb-8">Page not found</p>
      <a href="/" className="px-6 py-3 bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors">
        Go Home
      </a>
    </div>
  </div>
)

const UnauthorizedPage = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="text-center">
      <h1 className="text-6xl font-bold text-red-600 mb-4">403</h1>
      <p className="text-xl text-foreground/60 mb-8">You don't have permission to access this page</p>
      <a href="/" className="px-6 py-3 bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors">
        Go Home
      </a>
    </div>
  </div>
)

function App() {
  return (
    <ErrorBoundary>
      <NetworkProvider>
        <AuthProvider>
          <Router>
          <Toaster 
            position="top-right"
            toastOptions={{
              duration: 3000,
              style: {
                background: '#363636',
                color: '#fff',
              },
            }}
          />
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/about" element={<Suspense fallback={<PageLoader />}><AboutPage /></Suspense>} />
            <Route path="/contact" element={<Suspense fallback={<PageLoader />}><ContactPage /></Suspense>} />
            <Route path="/privacy" element={<Suspense fallback={<PageLoader />}><PrivacyPolicyPage /></Suspense>} />
            <Route path="/terms" element={<Suspense fallback={<PageLoader />}><TermsOfServicePage /></Suspense>} />
            
            {/* Map View - Public */}
            <Route path="/map" element={<Suspense fallback={<PageLoader />}><MapPage /></Suspense>} />
            
            {/* WhatsApp Location Sharing - Public */}
            <Route path="/share-location" element={<Suspense fallback={<PageLoader />}><ShareLocation /></Suspense>} />
            
            {/* Transparency Dashboard - Public */}
            <Route path="/transparency" element={<Suspense fallback={<PageLoader />}><TransparencyDashboard /></Suspense>} />
            
            {/* Citizen Auth Routes - Public Only (redirect if logged in) */}
            <Route path="/login" element={
              <PublicOnlyRoute>
                <Suspense fallback={<PageLoader />}><CitizenLogin /></Suspense>
              </PublicOnlyRoute>
            } />
            <Route path="/register" element={
              <PublicOnlyRoute>
                <Suspense fallback={<PageLoader />}><CitizenRegister /></Suspense>
              </PublicOnlyRoute>
            } />
            <Route path="/forgot-password" element={
              <PublicOnlyRoute>
                <Suspense fallback={<PageLoader />}><CitizenForgotPassword /></Suspense>
              </PublicOnlyRoute>
            } />
          
          {/* Citizen Routes - Protected with Layout */}
          <Route path="/citizen" element={
            <CitizenRoute>
              <MainLayout />
            </CitizenRoute>
          }>
            <Route index element={<Navigate to="/citizen/dashboard" replace />} />
            <Route path="dashboard" element={<Suspense fallback={<PageLoader />}><CitizenDashboard /></Suspense>} />
            <Route path="report" element={<Suspense fallback={<PageLoader />}><ReportIssuePage /></Suspense>} />
            <Route path="complaints" element={<Suspense fallback={<PageLoader />}><MyComplaintsPage /></Suspense>} />
            <Route path="complaints/:id" element={<Suspense fallback={<PageLoader />}><ComplaintDetailPage /></Suspense>} />
            <Route path="chat" element={<Suspense fallback={<PageLoader />}><ChatPage /></Suspense>} />
            <Route path="profile" element={<Suspense fallback={<PageLoader />}><CitizenProfilePage /></Suspense>} />
            <Route path="settings" element={<Suspense fallback={<PageLoader />}><CitizenSettingsPage /></Suspense>} />
            <Route path="notifications" element={<Suspense fallback={<PageLoader />}><NotificationsPage /></Suspense>} />
          </Route>
          
          {/* Government Official Auth Routes */}
          <Route path="/official/login" element={
            <PublicOnlyRoute>
              <Suspense fallback={<PageLoader />}><OfficialLogin /></Suspense>
            </PublicOnlyRoute>
          } />
          <Route path="/official/forgot-password" element={
            <PublicOnlyRoute>
              <Suspense fallback={<PageLoader />}><OfficialForgotPassword /></Suspense>
            </PublicOnlyRoute>
          } />

          {/* Official Routes - Protected with Layout */}
          <Route path="/official" element={
            <OfficialRoute>
              <MainLayout />
            </OfficialRoute>
          }>
            <Route index element={<Navigate to="/official/dashboard" replace />} />
            <Route path="dashboard" element={<Suspense fallback={<PageLoader />}><OfficialDashboard /></Suspense>} />
            <Route path="complaints" element={<Suspense fallback={<PageLoader />}><ManageComplaintsPage /></Suspense>} />
            <Route path="complaints/:id" element={<Suspense fallback={<PageLoader />}><ComplaintDetailPage /></Suspense>} />
            <Route path="territory" element={<Suspense fallback={<PageLoader />}><TerritoryPage /></Suspense>} />
            <Route path="chat" element={<Suspense fallback={<PageLoader />}><ChatPage /></Suspense>} />
            <Route path="profile" element={<Suspense fallback={<PageLoader />}><CitizenProfilePage /></Suspense>} />
            <Route path="invite/:type" element={<Suspense fallback={<PageLoader />}><InvitationPage /></Suspense>} />
          </Route>

          {/* Mayor Routes - Protected with Layout */}
          <Route path="/mayor" element={
            <MayorRoute>
              <MainLayout />
            </MayorRoute>
          }>
            <Route index element={<Navigate to="/mayor/dashboard" replace />} />
            <Route path="dashboard" element={<Suspense fallback={<PageLoader />}><MayorDashboard /></Suspense>} />
            <Route path="complaints" element={<Suspense fallback={<PageLoader />}><ManageComplaintsPage /></Suspense>} />
            <Route path="map" element={<Suspense fallback={<PageLoader />}><TerritoryPage /></Suspense>} />
            <Route path="chat" element={<Suspense fallback={<PageLoader />}><ChatPage /></Suspense>} />
            <Route path="invite/:type" element={<Suspense fallback={<PageLoader />}><InvitationPage /></Suspense>} />
          </Route>

          {/* Admin Auth Route (Secret - not linked anywhere) */}
          <Route path="/sudo/admin" element={
            <PublicOnlyRoute>
              <Suspense fallback={<PageLoader />}><AdminLogin /></Suspense>
            </PublicOnlyRoute>
          } />

          {/* Admin Routes - Protected with Layout */}
          <Route path="/admin" element={
            <AdminRoute>
              <MainLayout />
            </AdminRoute>
          }>
            <Route index element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="dashboard" element={<Suspense fallback={<PageLoader />}><AdminDashboard /></Suspense>} />
            <Route path="users" element={<Suspense fallback={<PageLoader />}><ManageUsersPage /></Suspense>} />
            <Route path="territories" element={<Suspense fallback={<PageLoader />}><ManageTerritoriesPage /></Suspense>} />
            <Route path="categories" element={<Suspense fallback={<PageLoader />}><ManageCategoriesPage /></Suspense>} />
            <Route path="invite/:type" element={<Suspense fallback={<PageLoader />}><InvitationPage /></Suspense>} />
          </Route>

          {/* Error Routes */}
          <Route path="/unauthorized" element={<UnauthorizedPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
        
        {/* AI Chatbot Widget - Available on all pages */}
        <Suspense fallback={null}><ChatWidget /></Suspense>
      </Router>
      </AuthProvider>
      </NetworkProvider>
    </ErrorBoundary>
  )
}

export default App
