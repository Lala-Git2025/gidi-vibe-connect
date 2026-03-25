import { useState } from 'react';
import { User, Lock, Bell, Trash2, Save, Eye, EyeOff } from 'lucide-react';
import { useBusinessAuth } from '../contexts/BusinessAuthContext';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';

export default function Settings() {
  const { user, profile, signOut } = useBusinessAuth();

  // Profile form
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState('');

  // Password form
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState('');

  // Notifications
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [eventReminders, setEventReminders] = useState(true);

  const handleSaveProfile = async () => {
    if (!user) return;
    setSavingProfile(true);
    setProfileMsg('');
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName.trim(),
          phone: phone.trim() || null,
          bio: bio.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      if (error) throw error;
      setProfileMsg('Profile updated successfully.');
    } catch (err: any) {
      setProfileMsg(`Error: ${err.message}`);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    setPasswordMsg('');
    if (!newPassword || newPassword.length < 6) {
      setPasswordMsg('New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMsg('Passwords do not match.');
      return;
    }
    setSavingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setPasswordMsg('Password changed successfully.');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPasswordMsg(`Error: ${err.message}`);
    } finally {
      setSavingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    const confirmed = window.confirm(
      'Are you sure you want to delete your account? This will permanently remove all your venues, events, and data. This cannot be undone.'
    );
    if (!confirmed) return;
    await signOut();
    // Account deletion requires an admin RPC or Supabase dashboard action
    alert('Please contact support@gidivibe.com to complete account deletion.');
  };

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your account preferences</p>
      </div>

      {/* ── Profile Info ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <User className="w-5 h-5" />
            Profile Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <Input value={user?.email || ''} disabled className="bg-muted" />
            <p className="text-xs text-muted-foreground mt-1">Email cannot be changed here.</p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Full Name</label>
            <Input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Your full name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Phone</label>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+234 800 000 0000"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Bio</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell us about your business..."
              rows={3}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          {profileMsg && (
            <p className={`text-sm ${profileMsg.startsWith('Error') ? 'text-destructive' : 'text-green-600'}`}>
              {profileMsg}
            </p>
          )}

          <Button onClick={handleSaveProfile} disabled={savingProfile} className="gap-2">
            <Save className="w-4 h-4" />
            {savingProfile ? 'Saving…' : 'Save Profile'}
          </Button>
        </CardContent>
      </Card>

      {/* ── Password ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Lock className="w-5 h-5" />
            Change Password
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">New Password</label>
            <div className="relative">
              <Input
                type={showPasswords ? 'text' : 'password'}
                value={newPassword}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewPassword(e.target.value)}
                placeholder="At least 6 characters"
              />
              <button
                type="button"
                onClick={() => setShowPasswords(!showPasswords)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              >
                {showPasswords ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Confirm New Password</label>
            <Input
              type={showPasswords ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repeat new password"
            />
          </div>

          {passwordMsg && (
            <p className={`text-sm ${passwordMsg.startsWith('Error') || passwordMsg.includes('match') || passwordMsg.includes('must') ? 'text-destructive' : 'text-green-600'}`}>
              {passwordMsg}
            </p>
          )}

          <Button onClick={handleChangePassword} disabled={savingPassword} variant="outline" className="gap-2">
            <Lock className="w-4 h-4" />
            {savingPassword ? 'Updating…' : 'Update Password'}
          </Button>
        </CardContent>
      </Card>

      {/* ── Notifications ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Bell className="w-5 h-5" />
            Notifications
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { label: 'Email notifications', sublabel: 'Receive updates about your venues and events', value: emailNotifications, onChange: setEmailNotifications },
            { label: 'Event reminders', sublabel: 'Get reminded 24h before your events start', value: eventReminders, onChange: setEventReminders },
          ].map(({ label, sublabel, value, onChange }) => (
            <div key={label} className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-medium">{label}</p>
                <p className="text-xs text-muted-foreground">{sublabel}</p>
              </div>
              <button
                onClick={() => onChange(!value)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${value ? 'bg-primary' : 'bg-muted'}`}
              >
                <span className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${value ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* ── Danger Zone ── */}
      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg text-destructive">
            <Trash2 className="w-5 h-5" />
            Danger Zone
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Deleting your account will permanently remove all venues, events, photos, and analytics. This action cannot be undone.
          </p>
          <Button variant="destructive" onClick={handleDeleteAccount} className="gap-2">
            <Trash2 className="w-4 h-4" />
            Delete Account
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
