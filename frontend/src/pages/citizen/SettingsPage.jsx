/**
 * Settings Page
 * User settings and preferences
 */

import { useState } from 'react';
import { useAuth } from '../../contexts';
import { authApi } from '../../services/api';
import { 
  Button, 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription,
  CardContent, 
  CardFooter,
  Alert,
  Divider
} from '../../components/ui';
import { ConfirmDialog } from '../../components/ui/Modal';

// Toggle switch component
const Toggle = ({ checked, onChange, label, description }) => (
  <div className="flex items-center justify-between py-3">
    <div>
      <p className="font-medium text-foreground">{label}</p>
      {description && (
        <p className="text-sm text-foreground/50">{description}</p>
      )}
    </div>
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
        checked ? 'bg-primary' : 'bg-foreground/20'
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  </div>
);

const SettingsPage = () => {
  const { logout } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  
  // Notification settings
  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    sms: false,
    statusUpdates: true,
    newsletters: false,
  });

  // Privacy settings
  const [privacy, setPrivacy] = useState({
    showProfile: true,
    showComplaints: false,
    allowMessages: true,
  });

  // Handle notification toggle
  const handleNotificationChange = (key, value) => {
    setNotifications({ ...notifications, [key]: value });
  };

  // Handle privacy toggle
  const handlePrivacyChange = (key, value) => {
    setPrivacy({ ...privacy, [key]: value });
  };

  // Save settings
  const handleSave = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await authApi.updateSettings({
        notifications,
        privacy,
      });
      setSuccess('Settings saved successfully');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  // Delete account
  const handleDeleteAccount = async () => {
    setLoading(true);
    try {
      // Note: Backend requires password for account deletion
      // This should ideally prompt for password first
      await authApi.deleteMe();
      await logout();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete account');
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
          <CardDescription>Choose how you want to receive notifications</CardDescription>
        </CardHeader>
        <CardContent className="space-y-1">
          {error && (
            <Alert variant="error" onDismiss={() => setError(null)}>
              {error}
            </Alert>
          )}
          {success && (
            <Alert variant="success" onDismiss={() => setSuccess(null)}>
              {success}
            </Alert>
          )}

          <Toggle
            checked={notifications.email}
            onChange={(v) => handleNotificationChange('email', v)}
            label="Email Notifications"
            description="Receive updates via email"
          />
          <Divider />
          <Toggle
            checked={notifications.push}
            onChange={(v) => handleNotificationChange('push', v)}
            label="Push Notifications"
            description="Receive push notifications in browser"
          />
          <Divider />
          <Toggle
            checked={notifications.sms}
            onChange={(v) => handleNotificationChange('sms', v)}
            label="SMS Notifications"
            description="Receive text messages for important updates"
          />
          <Divider />
          <Toggle
            checked={notifications.statusUpdates}
            onChange={(v) => handleNotificationChange('statusUpdates', v)}
            label="Complaint Status Updates"
            description="Get notified when your complaint status changes"
          />
          <Divider />
          <Toggle
            checked={notifications.newsletters}
            onChange={(v) => handleNotificationChange('newsletters', v)}
            label="Newsletter"
            description="Receive weekly civic updates and news"
          />
        </CardContent>
      </Card>

      {/* Privacy */}
      <Card>
        <CardHeader>
          <CardTitle>Privacy</CardTitle>
          <CardDescription>Control your privacy settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-1">
          <Toggle
            checked={privacy.showProfile}
            onChange={(v) => handlePrivacyChange('showProfile', v)}
            label="Public Profile"
            description="Allow others to see your profile information"
          />
          <Divider />
          <Toggle
            checked={privacy.showComplaints}
            onChange={(v) => handlePrivacyChange('showComplaints', v)}
            label="Public Complaints"
            description="Show your complaints on the public map"
          />
          <Divider />
          <Toggle
            checked={privacy.allowMessages}
            onChange={(v) => handlePrivacyChange('allowMessages', v)}
            label="Allow Messages"
            description="Let officials contact you about your complaints"
          />
        </CardContent>
        <CardFooter className="flex justify-end">
          <Button onClick={handleSave} loading={loading}>
            Save Settings
          </Button>
        </CardFooter>
      </Card>

      {/* Language & Appearance */}
      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>Customize how CivicLens looks for you</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="font-medium text-foreground">Language</p>
              <p className="text-sm text-foreground/50">Select your preferred language</p>
            </div>
            <select className="px-4 py-2 bg-foreground/5 border-0 rounded-xl text-sm focus:ring-2 focus:ring-primary/20">
              <option value="en">English</option>
              <option value="ur">اردو (Urdu)</option>
            </select>
          </div>
          <Divider />
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="font-medium text-foreground">Theme</p>
              <p className="text-sm text-foreground/50">Choose light or dark theme</p>
            </div>
            <select className="px-4 py-2 bg-foreground/5 border-0 rounded-xl text-sm focus:ring-2 focus:ring-primary/20">
              <option value="light">Light</option>
              <option value="dark">Dark</option>
              <option value="system">System</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Data & Export */}
      <Card>
        <CardHeader>
          <CardTitle>Data & Export</CardTitle>
          <CardDescription>Manage your data</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground">Export My Data</p>
              <p className="text-sm text-foreground/50">Download all your data as JSON</p>
            </div>
            <Button variant="outline" size="sm">
              Export
            </Button>
          </div>
          <Divider />
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground">Export Complaints</p>
              <p className="text-sm text-foreground/50">Download your complaints as CSV</p>
            </div>
            <Button variant="outline" size="sm">
              Download
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="text-red-600">Danger Zone</CardTitle>
          <CardDescription>Irreversible actions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground">Delete Account</p>
              <p className="text-sm text-foreground/50">
                Permanently delete your account and all associated data
              </p>
            </div>
            <Button variant="danger" onClick={() => setDeleteConfirm(true)}>
              Delete Account
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={deleteConfirm}
        onClose={() => setDeleteConfirm(false)}
        onConfirm={handleDeleteAccount}
        title="Delete Account"
        message="Are you sure you want to delete your account? This will permanently delete all your data including complaints, comments, and profile information. This action cannot be undone."
        confirmText="Delete My Account"
        variant="danger"
        loading={loading}
      />
    </div>
  );
};

export default SettingsPage;
