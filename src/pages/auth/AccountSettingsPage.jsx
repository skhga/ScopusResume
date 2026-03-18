import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import Modal from '../../components/common/Modal';

export default function AccountSettingsPage() {
  const { user, updateProfile, logout } = useAuth();
  const [profile, setProfile] = useState({ name: user?.name || '', email: user?.email || '', phone: '' });
  const [passwords, setPasswords] = useState({ current: '', newPass: '', confirm: '' });
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const saveProfile = (e) => { e.preventDefault(); updateProfile(profile); };

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

      <Card title="Danger Zone" className="border-red-200">
        <div className="flex items-center justify-between">
          <div><p className="font-medium text-gray-900">Delete Account</p><p className="text-sm text-gray-500">Permanently delete your account and all data.</p></div>
          <Button variant="danger" size="sm" onClick={() => setShowDeleteModal(true)}>Delete Account</Button>
        </div>
        <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-between">
          <div><p className="font-medium text-gray-900">Export Data</p><p className="text-sm text-gray-500">Download all your data (GDPR).</p></div>
          <Button variant="secondary" size="sm">Export My Data</Button>
        </div>
      </Card>

      <Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="Delete Account">
        <p className="text-gray-600 mb-6">This action is permanent and cannot be undone. All your resumes and data will be deleted.</p>
        <div className="flex justify-end space-x-3">
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>Cancel</Button>
          <Button variant="danger" onClick={() => { setShowDeleteModal(false); logout(); }}>Delete Forever</Button>
        </div>
      </Modal>
    </div>
  );
}
