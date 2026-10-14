'use client';

import { useState, useEffect, useRef } from 'react';
import ProfileTab from './components/ProfileTab';
import QualificationTab from './components/QualificationTab';
import ScoringTab from './components/ScoringTab';
import InsightsTab from './components/InsightsTab';
import EmailTab from './components/EmailTab';
export default function SettingsPage() {
  const [qualSettings, setQualSettings] = useState({
    min_reviews: 0,
    min_rating: 0.0,
    require_website: true,
    require_phone: false,
    require_name: true,
    require_direct_contact: true,
    require_linkedin: false,
    agency_services: '',
    scoring_rules: '',
    insight_generation_rules: '',
    email_generation_rules: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [activeTab, setActiveTab] = useState('profile');

  const [profile, setProfile] = useState({
    username: '',
    first_name: '',
    email: '',
    phone_number: '',
    profile_dp: '',
    is_admin: true,
  });

  const [securityForm, setSecurityForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
    new_username: '',
  });

  const [securityMessage, setSecurityMessage] = useState({ text: '', type: '' });
  const [profileMessage, setProfileMessage] = useState({ text: '', type: '' });

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/crm/settings/qualification/')
      .then(res => res.json())
      .then(data => {
        if (data && typeof data.min_reviews !== 'undefined') {
          setQualSettings({
            min_reviews: data.min_reviews ?? 0,
            min_rating: data.min_rating ?? 0.0,
            require_website: data.require_website ?? true,
            require_phone: data.require_phone ?? false,
            require_name: data.require_name ?? true,
            require_direct_contact: data.require_direct_contact ?? true,
            require_linkedin: data.require_linkedin ?? false,
            agency_services: data.agency_services || '',
            scoring_rules: data.scoring_rules || '',
            insight_generation_rules: data.insight_generation_rules || '',
            email_generation_rules: data.email_generation_rules || '',
          });
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch settings:', err);
        setLoading(false);
      });

    fetch('/api/users/profile/')
      .then(res => res.json())
      .then(data => {
        if (!data.error) {
          setProfile({
            username: data.username || '',
            first_name: data.first_name || '',
            email: data.email || '',
            phone_number: data.phone_number || '',
            profile_dp: data.profile_dp || '',
            is_admin: data.is_admin ?? true,
          });
        }
      })
      .catch(console.error);
  }, []);

  const handleSaveQualification = async () => {
    setSaving(true);
    setMessage('');
    try {
      const res = await fetch('/api/crm/settings/qualification/', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(qualSettings),
      });
      if (res.ok) {
        setMessage('Settings saved successfully!');
      } else {
        setMessage('Failed to save settings.');
      }
    } catch (err) {
      console.error(err);
      setMessage('An error occurred while saving.');
    }
    setSaving(false);
    setTimeout(() => setMessage(''), 3000);
  };

  const handleSaveProfile = async () => {
    setProfileMessage({ text: '', type: '' });
    try {
      const res = await fetch('/api/users/profile/', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: profile.first_name,
          email: profile.email,
          phone_number: profile.phone_number,
          profile_dp: profile.profile_dp,
        }),
      });
      if (res.ok) {
        setProfileMessage({ text: 'Profile updated successfully!', type: 'success' });
      } else {
        setProfileMessage({ text: 'Failed to update profile.', type: 'error' });
      }
    } catch (e) {
      console.error(e);
      setProfileMessage({ text: 'Error saving profile', type: 'error' });
    }
    setTimeout(() => setProfileMessage({ text: '', type: '' }), 4000);
  };

  const handleSecurityChange = async () => {
    setSecurityMessage({ text: '', type: '' });
    if (securityForm.new_password && securityForm.new_password !== securityForm.confirm_password) {
      setSecurityMessage({ text: "Passwords do not match", type: "error" });
      return;
    }
    if (!securityForm.current_password) {
      setSecurityMessage({ text: "Please provide your current password to make security changes", type: "error" });
      return;
    }
    if (!securityForm.new_password && !securityForm.new_username) {
      setSecurityMessage({ text: "Please provide either a new password or a new username", type: "error" });
      return;
    }
    try {
      const res = await fetch('/auth-api/update-security/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          current_password: securityForm.current_password,
          new_password: securityForm.new_password,
          new_username: securityForm.new_username,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setSecurityMessage({ text: data.message || 'Security settings updated successfully!', type: "success" });
        setSecurityForm({ current_password: '', new_password: '', confirm_password: '', new_username: '' });
        if (securityForm.new_username) {
          setProfile(p => ({ ...p, username: securityForm.new_username }));
        }
      } else {
        setSecurityMessage({ text: data.message || 'Failed to update security settings', type: "error" });
      }
    } catch (e) {
      console.error(e);
      setSecurityMessage({ text: 'Error updating security settings', type: "error" });
    }
    setTimeout(() => setSecurityMessage({ text: '', type: '' }), 4000);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setProfileMessage({ text: 'Image file too large. Maximum size is 2MB.', type: 'error' });
        setTimeout(() => setProfileMessage({ text: '', type: '' }), 4000);
        return;
      }
      if (!file.type.startsWith('image/')) {
        setProfileMessage({ text: 'Please select a valid image file.', type: 'error' });
        setTimeout(() => setProfileMessage({ text: '', type: '' }), 4000);
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfile(prev => ({ ...prev, profile_dp: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="overflow-y-auto flex-1 min-h-0 w-full">
      <div className="max-w-6xl mx-auto py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">System Settings</h1>
            <p className="text-zinc-400 mt-1">Manage your configuration, AI rules, and account preferences.</p>
          </div>
        </div>

        {/* Modern Tabs */}
        <div className="mb-8 border-b border-zinc-800">
          <div className="flex space-x-6">
            <button
              onClick={() => setActiveTab('profile')}
              className={`pb-3.5 text-xs font-medium border-b-2 transition-all flex items-center gap-2 ${
                activeTab === 'profile' 
                  ? 'border-white text-white' 
                  : 'border-transparent text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <svg className={`w-4 h-4 ${activeTab === 'profile' ? 'text-white' : 'text-zinc-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Profile & Security
            </button>
            
            <button
              onClick={() => setActiveTab('qualification')}
              className={`pb-3.5 text-xs font-medium border-b-2 transition-all flex items-center gap-2 ${
                activeTab === 'qualification' 
                  ? 'border-white text-white' 
                  : 'border-transparent text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <svg className={`w-4 h-4 ${activeTab === 'qualification' ? 'text-white' : 'text-zinc-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              AI Qualification Rules
            </button>
            
            <button
              onClick={() => setActiveTab('scoring')}
              className={`pb-3.5 text-xs font-medium border-b-2 transition-all flex items-center gap-2 ${
                activeTab === 'scoring' 
                  ? 'border-white text-white' 
                  : 'border-transparent text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <svg className={`w-4 h-4 ${activeTab === 'scoring' ? 'text-white' : 'text-zinc-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              AI Lead Scoring
            </button>
            
            <button
              onClick={() => setActiveTab('insights')}
              className={`pb-3.5 text-xs font-medium border-b-2 transition-all flex items-center gap-2 ${
                activeTab === 'insights' 
                  ? 'border-white text-white' 
                  : 'border-transparent text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <svg className={`w-4 h-4 ${activeTab === 'insights' ? 'text-white' : 'text-zinc-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              AI Insights
            </button>
            
            <button
              onClick={() => setActiveTab('email')}
              className={`pb-3.5 text-xs font-medium border-b-2 transition-all flex items-center gap-2 ${
                activeTab === 'email' 
                  ? 'border-white text-white' 
                  : 'border-transparent text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <svg className={`w-4 h-4 ${activeTab === 'email' ? 'text-white' : 'text-zinc-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              AI Email
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          {activeTab === 'qualification' && (
            <QualificationTab 
              qualSettings={qualSettings}
              setQualSettings={setQualSettings}
              saving={saving}
              message={message}
              handleSaveQualification={handleSaveQualification}
              loading={loading}
            />
          )}

          {activeTab === 'scoring' && (
            <ScoringTab 
              qualSettings={qualSettings}
              setQualSettings={setQualSettings}
              saving={saving}
              message={message}
              handleSaveQualification={handleSaveQualification}
            />
          )}

          {activeTab === 'insights' && (
            <InsightsTab 
              qualSettings={qualSettings}
              setQualSettings={setQualSettings}
              saving={saving}
              message={message}
              handleSaveQualification={handleSaveQualification}
            />
          )}

          {activeTab === 'email' && (
            <EmailTab 
              qualSettings={qualSettings}
              setQualSettings={setQualSettings}
              saving={saving}
              message={message}
              handleSaveQualification={handleSaveQualification}
            />
          )}

          {activeTab === 'profile' && (
            <ProfileTab 
              profile={profile}
              setProfile={setProfile}
              profileMessage={profileMessage}
              handleSaveProfile={handleSaveProfile}
              securityForm={securityForm}
              setSecurityForm={setSecurityForm}
              securityMessage={securityMessage}
              handleSecurityChange={handleSecurityChange}
              fileInputRef={fileInputRef}
              handleImageUpload={handleImageUpload}
            />
          )}
        </div>
      </div>
    </div>
  );
}
