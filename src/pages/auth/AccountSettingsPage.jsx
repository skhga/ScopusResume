import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabaseClient';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import Modal from '../../components/common/Modal';

export default function AccountSettingsPage() {
  const { user, updateProfile, logout } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState({ name: user?.name || '', email: user?.email || '', phone: '' });
  const [passwords, setPasswords] = useState({ current: '', newPass: '', confirm: '' });
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);

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
        <form className="space-y-4" onSubmit={e => e.preventDefault()}>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label><input type="password" value={passwords.current} onChange={e => setPasswords({...passwords, current: e.target.value})} className="input-field max-w-sm" /></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">New Password</label><input type="password" value={passwords.newPass} onChange={e => setPasswords({...passwords, newPass: e.target.value})} className="input-field" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Confirm New</label><input type="password" value={passwords.confirm} onChange={e => setPasswords({...passwords, confirm: e.target.value})} className="input-field" /></div>
          </div>
          <Button type="submit" size="sm">Update Password</Button>
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
            <p className="font-medium text-gray-900">Delete Account</p>
            <p className="text-sm text-gray-500">Your data is retained for 30 days before permanent deletion.</p>
          </div>
          <Button variant="danger" size="sm" onClick={() => setShowDeleteModal(true)}>Delete Account</Button>
        </div>
      </Card>

      <Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="Delete Account">
        <p className="text-gray-600 mb-2">Are you sure you want to delete your account?</p>
        <p className="text-sm text-gray-500 mb-6">
          Your data will be retained for <strong>30 days</strong> before permanent deletion.
          You can contact support within this period to recover your account.
        </p>
        <div className="flex justify-end space-x-3">
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>Cancel</Button>
          <Button variant="danger" onClick={handleDeleteAccount} loading={deleting}>
            Yes, Delete My Account
          </Button>
        </div>
      </Modal>
    </div>
  );
}
