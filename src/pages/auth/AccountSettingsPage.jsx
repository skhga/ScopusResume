import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabaseClient';
import toast from 'react-hot-toast';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import Modal from '../../components/common/Modal';

export default function AccountSettingsPage() {
  const { user, updateProfile, logout } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState({ name: user?.name || '', email: user?.email || '', phone: '' });
  const [passwords, setPasswords] = useState({ newPass: '', confirm: '' });
  const [changingPassword, setChangingPassword] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Sync profile state when user loads (fixes stale state on mount when user is null)
  useEffect(() => {
    if (user) {
      setProfile(prev => ({
        ...prev,
        name: user.name || prev.name,
        email: user.email || prev.email,
      }));
    }
  }, [user]);

  const saveProfile = (e) => { e.preventDefault(); updateProfile(profile); };

  const handleDataExport = async () => {
    if (!user?.id) return;
    setExporting(true);
    try {
      const { data: resumesData } = await supabase
        .from('resumes')
        .select('*')
        .eq('user_id', user.id);

      const exportData = {
        exported_at: new Date().toISOString(),
        user: { id: user.id, email: user.email, name: user.name },
        resumes: resumesData || [],
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `scopusresume-data-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Data export failed:', err);
      alert('Export failed. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwords.newPass !== passwords.confirm) {
      toast.error('New passwords do not match.');
      return;
    }
    if (passwords.newPass.length < 6) {
      toast.error('Password must be at least 6 characters.');
      return;
    }
    setChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: passwords.newPass });
      if (error) throw error;
      toast.success('Password updated successfully.');
      setPasswords({ newPass: '', confirm: '' });
    } catch (err) {
      toast.error(err.message || 'Failed to update password.');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      await logout();
      navigate('/');
    } catch (err) {
      console.error('Account deletion failed:', err);
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Account Settings</h1>

      <Card title="Profile Information">
        <form onSubmit={saveProfile} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label><input value={profile.name} onChange={e => setProfile({...profile, name: e.target.value})} className="input-field" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Email</label><input type="email" value={profile.email} onChange={e => setProfile({...profile, email: e.target.value})} className="input-field" /></div>
          </div>
          <div className="max-w-sm"><label className="block text-sm font-medium text-gray-700 mb-1">Phone</label><input value={profile.phone} onChange={e => setProfile({...profile, phone: e.target.value})} className="input-field" placeholder="+1 (555) 000-0000" /></div>
          <Button type="submit" size="sm">Save Changes</Button>
        </form>
      </Card>

      <Card title="Change Password">
        <form className="space-y-4" onSubmit={handleChangePassword}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">New Password</label><input type="password" value={passwords.newPass} onChange={e => setPasswords({...passwords, newPass: e.target.value})} className="input-field" minLength={6} /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Confirm New</label><input type="password" value={passwords.confirm} onChange={e => setPasswords({...passwords, confirm: e.target.value})} className="input-field" minLength={6} /></div>
          </div>
          <Button type="submit" size="sm" loading={changingPassword}>Update Password</Button>
        </form>
      </Card>

      <Card title="Data & Privacy" className="border-red-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-gray-900">Export Your Data</p>
            <p className="text-sm text-gray-500">Download all your resume data as JSON (GDPR Article 20).</p>
          </div>
          <Button variant="secondary" size="sm" onClick={handleDataExport} loading={exporting}>
            Export JSON
          </Button>
        </div>
        <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-between">
          <div>
            <p className="font-medium text-gray-900">Sign Out &amp; Data</p>
            <p className="text-sm text-gray-500">Sign out of your account. Your data is retained and can be recovered on your next sign-in.</p>
          </div>
          <Button variant="danger" size="sm" onClick={() => setShowDeleteModal(true)}>Sign Out</Button>
        </div>
      </Card>

      <Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="Sign Out">
        <p className="text-gray-600 mb-2">This will sign you out and your account data will be retained.</p>
        <p className="text-sm text-gray-500 mb-6">
          To permanently delete your account, contact <strong>support@scopusresume.com</strong>.
        </p>
        <div className="flex justify-end space-x-3">
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>Cancel</Button>
          <Button variant="danger" onClick={handleDeleteAccount} loading={deleting}>
            Yes, Sign Out
          </Button>
        </div>
      </Modal>
    </div>
  );
}
