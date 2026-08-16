'use client';

import { useState, useEffect, useRef } from 'react';

export default function SettingsPage() {
  const [qualSettings, setQualSettings] = useState({
    min_reviews: 10,
    min_rating: 4.0,
    require_website: true,
    require_phone: true,
    require_name: true,
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
    logged_in_as_superuser: false,
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
            min_reviews: data.min_reviews,
            min_rating: data.min_rating,
            require_website: data.require_website,
            require_phone: data.require_phone,
            require_name: data.require_name,
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
            logged_in_as_superuser: data.logged_in_as_superuser || false,
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
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfile({ ...profile, profile_dp: reader.result as string });
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
        <div className="mb-8 border-b border-zinc-800/60">
          <div className="flex space-x-8">
            <button
              onClick={() => setActiveTab('profile')}
              className={`pb-4 text-sm font-medium border-b-2 transition-all flex items-center gap-2.5 ${
                activeTab === 'profile' 
                  ? 'border-emerald-500 text-white' 
                  : 'border-transparent text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <svg className={`w-5 h-5 ${activeTab === 'profile' ? 'text-emerald-500' : 'text-zinc-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Profile & Security
            </button>
            
            <button
              onClick={() => setActiveTab('qualification')}
              className={`pb-4 text-sm font-medium border-b-2 transition-all flex items-center gap-2.5 ${
                activeTab === 'qualification' 
                  ? 'border-emerald-500 text-white' 
                  : 'border-transparent text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <svg className={`w-5 h-5 ${activeTab === 'qualification' ? 'text-emerald-500' : 'text-zinc-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              AI Qualification Rules
            </button>
            
            <button
              onClick={() => setActiveTab('scoring')}
              className={`pb-4 text-sm font-medium border-b-2 transition-all flex items-center gap-2.5 ${
                activeTab === 'scoring' 
                  ? 'border-emerald-500 text-white' 
                  : 'border-transparent text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <svg className={`w-5 h-5 ${activeTab === 'scoring' ? 'text-emerald-500' : 'text-zinc-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              AI Lead Scoring
            </button>
            
            <button
              onClick={() => setActiveTab('insights')}
              className={`pb-4 text-sm font-medium border-b-2 transition-all flex items-center gap-2.5 ${
                activeTab === 'insights' 
                  ? 'border-emerald-500 text-white' 
                  : 'border-transparent text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <svg className={`w-5 h-5 ${activeTab === 'insights' ? 'text-emerald-500' : 'text-zinc-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              AI Insights
            </button>
            
            <button
              onClick={() => setActiveTab('email')}
              className={`pb-4 text-sm font-medium border-b-2 transition-all flex items-center gap-2.5 ${
                activeTab === 'email' 
                  ? 'border-emerald-500 text-white' 
                  : 'border-transparent text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <svg className={`w-5 h-5 ${activeTab === 'email' ? 'text-emerald-500' : 'text-zinc-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              AI Email
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          {activeTab === 'qualification' && (
            <div className="bg-zinc-900/40 backdrop-blur-xl border border-zinc-800/80 rounded-2xl shadow-2xl overflow-hidden relative">
              {/* Subtle Gradient Accent */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-indigo-500" />
              
              <div className="p-8">
                {loading ? (
                  <div className="flex items-center justify-center py-20">
                    <div className="w-8 h-8 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
                  </div>
                ) : (
                  <div className="space-y-8">
                    {/* Metrics Section */}
                    <div>
                      <h3 className="text-lg font-medium text-white mb-4">Minimum Thresholds</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-zinc-950/50 rounded-xl p-5 border border-zinc-800/50">
                          <label className="block text-sm font-medium text-zinc-400 mb-2 uppercase tracking-wider">Minimum Reviews</label>
                          <div className="relative">
                            <input 
                              type="number" 
                              value={qualSettings.min_reviews} 
                              onChange={(e) => setQualSettings({...qualSettings, min_reviews: parseInt(e.target.value) || 0})}
                              className="w-full bg-zinc-900 border border-zinc-700/50 rounded-lg pl-4 pr-10 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all font-medium text-lg"
                            />
                            <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-zinc-500">
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                              </svg>
                            </div>
                          </div>
                        </div>
                        <div className="bg-zinc-950/50 rounded-xl p-5 border border-zinc-800/50">
                          <label className="block text-sm font-medium text-zinc-400 mb-2 uppercase tracking-wider">Minimum Rating</label>
                          <div className="relative">
                            <input 
                              type="number" 
                              step="0.1"
                              min="0"
                              max="5"
                              value={qualSettings.min_rating} 
                              onChange={(e) => setQualSettings({...qualSettings, min_rating: parseFloat(e.target.value) || 0})}
                              className="w-full bg-zinc-900 border border-zinc-700/50 rounded-lg pl-4 pr-10 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all font-medium text-lg"
                            />
                            <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-emerald-500">
                              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                              </svg>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Requirements Section */}
                    <div className="pt-6 border-t border-zinc-800/50">
                      <h3 className="text-lg font-medium text-white mb-4">Required Data Fields</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {[
                          { key: 'require_website', label: 'Website URL', icon: 'M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9' },
                          { key: 'require_phone', label: 'Phone Number', icon: 'M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z' },
                          { key: 'require_name', label: 'Company Name', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' }
                        ].map((req) => (
                          <div 
                            key={req.key}
                            className={`flex items-center p-4 rounded-xl border transition-all cursor-pointer ${
                              qualSettings[req.key as keyof typeof qualSettings] 
                                ? 'bg-emerald-500/10 border-emerald-500/30' 
                                : 'bg-zinc-950/50 border-zinc-800/50 hover:border-zinc-700'
                            }`}
                            onClick={() => setQualSettings({...qualSettings, [req.key]: !qualSettings[req.key as keyof typeof qualSettings]})}
                          >
                            <div className={`flex items-center justify-center w-10 h-10 rounded-lg mr-4 ${
                              qualSettings[req.key as keyof typeof qualSettings] ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-900 text-zinc-500'
                            }`}>
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={req.icon} />
                              </svg>
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-medium text-white">{req.label}</p>
                            </div>
                            {/* Toggle Switch */}
                            <div className={`relative w-10 h-6 rounded-full transition-colors ${
                              qualSettings[req.key as keyof typeof qualSettings] ? 'bg-emerald-500' : 'bg-zinc-700'
                            }`}>
                              <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${
                                qualSettings[req.key as keyof typeof qualSettings] ? 'translate-x-4' : 'translate-x-0'
                              }`} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    {/* AI Prompt Section */}
                    <div className="pt-6 border-t border-zinc-800/50">
                      <div className="flex items-center mb-4">
                        <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center mr-3">
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                        </div>
                        <div>
                          <h3 className="text-lg font-medium text-white">Advanced AI Intelligence (ICP)</h3>
                          <p className="text-sm text-zinc-400">Define your Ideal Customer Profile for the AI agent</p>
                        </div>
                      </div>
                      
                      <div className="bg-zinc-950/80 rounded-xl border border-zinc-800 focus-within:border-indigo-500/50 focus-within:ring-1 focus-within:ring-indigo-500/50 transition-all overflow-hidden p-1">
                        <textarea 
                          rows={5}
                          placeholder="Describe what you sell and who your ideal customer is..."
                          value={qualSettings.agency_services} 
                          onChange={(e) => setQualSettings({...qualSettings, agency_services: e.target.value})}
                          className="w-full bg-transparent p-4 text-sm text-zinc-300 focus:outline-none resize-y leading-relaxed"
                        />
                      </div>
                    </div>
                    
                    {/* Action Bar */}
                    <div className="flex items-center justify-between pt-6 border-t border-zinc-800/50">
                      <div className="text-sm">
                        {message && (
                          <span className="flex items-center text-emerald-400 bg-emerald-400/10 px-3 py-1.5 rounded-lg border border-emerald-400/20">
                            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            {message}
                          </span>
                        )}
                      </div>
                      <button 
                        onClick={handleSaveQualification}
                        disabled={saving}
                        className="px-6 py-3 text-sm font-semibold bg-white text-zinc-900 rounded-xl hover:bg-zinc-200 transition-all disabled:opacity-70 flex items-center shadow-lg shadow-white/5"
                      >
                        {saving ? (
                          <>
                            <div className="w-4 h-4 border-2 border-zinc-900/30 border-t-zinc-900 rounded-full animate-spin mr-2" />
                            Saving Changes...
                          </>
                        ) : (
                          'Save Configuration'
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'scoring' && (
            <div className="bg-zinc-900/40 backdrop-blur-xl border border-zinc-800/80 rounded-2xl shadow-2xl overflow-hidden relative">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-indigo-500" />
              
              <div className="p-8">
                <div className="space-y-8">
                  <div className="pt-2">
                    <div className="flex items-center mb-4">
                      <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center mr-3">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-lg font-medium text-white">Dynamic AI Scoring Rules</h3>
                        <p className="text-sm text-zinc-400">Define how the AI should score leads out of 100.</p>
                      </div>
                    </div>
                    
                    <div className="bg-zinc-950/80 rounded-xl border border-zinc-800 focus-within:border-indigo-500/50 focus-within:ring-1 focus-within:ring-indigo-500/50 transition-all overflow-hidden p-1">
                      <textarea 
                        rows={10}
                        placeholder="e.g. If the lead has a company email, add 20 points..."
                        value={qualSettings.scoring_rules} 
                        onChange={(e) => setQualSettings({...qualSettings, scoring_rules: e.target.value})}
                        className="w-full bg-transparent p-4 text-sm text-zinc-300 focus:outline-none resize-y leading-relaxed font-mono"
                      />
                    </div>
                  </div>
                  
                  {/* Action Bar */}
                  <div className="flex items-center justify-between pt-6 border-t border-zinc-800/50">
                    <div className="text-sm">
                      {message && (
                        <span className="flex items-center text-emerald-400 bg-emerald-400/10 px-3 py-1.5 rounded-lg border border-emerald-400/20">
                          <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          {message}
                        </span>
                      )}
                    </div>
                    <button 
                      onClick={handleSaveQualification}
                      disabled={saving}
                      className="px-6 py-3 text-sm font-semibold bg-white text-zinc-900 rounded-xl hover:bg-zinc-200 transition-all disabled:opacity-70 flex items-center shadow-lg shadow-white/5"
                    >
                      {saving ? (
                        <>
                          <div className="w-4 h-4 border-2 border-zinc-900/30 border-t-zinc-900 rounded-full animate-spin mr-2" />
                          Saving...
                        </>
                      ) : (
                        'Save Configuration'
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'insights' && (
            <div className="bg-zinc-900/40 backdrop-blur-xl border border-zinc-800/80 rounded-2xl shadow-2xl overflow-hidden relative">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-indigo-500" />
              
              <div className="p-8">
                <div className="space-y-8">
                  <div className="pt-2">
                    <div className="flex items-center mb-4">
                      <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center mr-3">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-lg font-medium text-white">Dynamic AI Insight Generation Rules</h3>
                        <p className="text-sm text-zinc-400">Define how the AI should analyze the lead and format its insights.</p>
                      </div>
                    </div>
                    
                    <div className="bg-zinc-950/80 rounded-xl border border-zinc-800 focus-within:border-indigo-500/50 focus-within:ring-1 focus-within:ring-indigo-500/50 transition-all overflow-hidden p-1">
                      <textarea 
                        rows={10}
                        placeholder="e.g. Analyze the lead data and generate three strategic insights..."
                        value={qualSettings.insight_generation_rules} 
                        onChange={(e) => setQualSettings({...qualSettings, insight_generation_rules: e.target.value})}
                        className="w-full bg-transparent p-4 text-sm text-zinc-300 focus:outline-none resize-y leading-relaxed font-mono"
                      />
                    </div>
                  </div>
                  
                  {/* Action Bar */}
                  <div className="flex items-center justify-between pt-6 border-t border-zinc-800/50">
                    <div className="text-sm">
                      {message && (
                        <span className="flex items-center text-emerald-400 bg-emerald-400/10 px-3 py-1.5 rounded-lg border border-emerald-400/20">
                          <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          {message}
                        </span>
                      )}
                    </div>
                    <button 
                      onClick={handleSaveQualification}
                      disabled={saving}
                      className="px-6 py-3 text-sm font-semibold bg-white text-zinc-900 rounded-xl hover:bg-zinc-200 transition-all disabled:opacity-70 flex items-center shadow-lg shadow-white/5"
                    >
                      {saving ? (
                        <>
                          <div className="w-4 h-4 border-2 border-zinc-900/30 border-t-zinc-900 rounded-full animate-spin mr-2" />
                          Saving...
                        </>
                      ) : (
                        'Save Configuration'
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'email' && (
            <div className="bg-zinc-900/40 backdrop-blur-xl border border-zinc-800/80 rounded-2xl shadow-2xl overflow-hidden relative">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-indigo-500" />
              
              <div className="p-8">
                <div className="space-y-8">
                  <div className="pt-2">
                    <div className="flex items-center mb-4">
                      <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center mr-3">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-lg font-medium text-white">Dynamic AI Email Template Rules</h3>
                        <p className="text-sm text-zinc-400">Define the tone, length, and content instructions for SDR cold emails.</p>
                      </div>
                    </div>
                    
                    <div className="bg-zinc-950/80 rounded-xl border border-zinc-800 focus-within:border-indigo-500/50 focus-within:ring-1 focus-within:ring-indigo-500/50 transition-all overflow-hidden p-1">
                      <textarea 
                        rows={10}
                        placeholder="e.g. Write a highly personalized, cold outreach email..."
                        value={qualSettings.email_generation_rules} 
                        onChange={(e) => setQualSettings({...qualSettings, email_generation_rules: e.target.value})}
                        className="w-full bg-transparent p-4 text-sm text-zinc-300 focus:outline-none resize-y leading-relaxed font-mono"
                      />
                    </div>
                  </div>
                  
                  {/* Action Bar */}
                  <div className="flex items-center justify-between pt-6 border-t border-zinc-800/50">
                    <div className="text-sm">
                      {message && (
                        <span className="flex items-center text-emerald-400 bg-emerald-400/10 px-3 py-1.5 rounded-lg border border-emerald-400/20">
                          <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          {message}
                        </span>
                      )}
                    </div>
                    <button 
                      onClick={handleSaveQualification}
                      disabled={saving}
                      className="px-6 py-3 text-sm font-semibold bg-white text-zinc-900 rounded-xl hover:bg-zinc-200 transition-all disabled:opacity-70 flex items-center shadow-lg shadow-white/5"
                    >
                      {saving ? (
                        <>
                          <div className="w-4 h-4 border-2 border-zinc-900/30 border-t-zinc-900 rounded-full animate-spin mr-2" />
                          Saving...
                        </>
                      ) : (
                        'Save Configuration'
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'profile' && (
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
              
              {/* Profile Card */}
              <div className="lg:col-span-3 bg-zinc-900/40 backdrop-blur-xl border border-zinc-800/80 rounded-2xl shadow-xl overflow-hidden relative">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-500" />
                <div className="p-8">
                  <h2 className="text-lg font-medium text-white mb-6">Personal Details</h2>
                  
                  {profileMessage.text && (
                    <div className={`mb-6 p-3 rounded-lg border text-sm ${profileMessage.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-rose-500/10 border-rose-500/30 text-rose-400'}`}>
                      {profileMessage.text}
                    </div>
                  )}
                  
                  <div className="flex items-center space-x-6 mb-8 bg-zinc-950/50 p-6 rounded-xl border border-zinc-800/50">
                    <div className="relative">
                      {profile.profile_dp ? (
                        <img src={profile.profile_dp} alt="Profile" className="h-20 w-20 rounded-2xl object-cover shadow-lg" />
                      ) : (
                        <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-2xl text-white font-bold shadow-lg">
                          {profile.first_name ? profile.first_name.charAt(0).toUpperCase() : 'U'}
                        </div>
                      )}
                      {!profile.logged_in_as_superuser && (
                        <>
                          <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageUpload} className="hidden" />
                          <button onClick={() => fileInputRef.current?.click()} className="absolute -bottom-2 -right-2 bg-zinc-800 text-white p-1.5 rounded-lg border border-zinc-700 hover:bg-zinc-700 transition-colors shadow-lg">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                          </button>
                        </>
                      )}
                    </div>
                    <div>
                      <h3 className="text-white font-medium text-lg">{profile.first_name || 'Regular User'}</h3>
                      <p className="text-zinc-400 text-sm mb-3">Account Profile</p>
                      <div className="flex gap-2">
                        {profile.logged_in_as_superuser ? (
                          <span className="text-xs px-2.5 py-1 bg-amber-500/20 text-amber-400 rounded-md border border-amber-500/30">Super User (Override Mode)</span>
                        ) : (
                          <span className="text-xs px-2.5 py-1 bg-zinc-800 text-zinc-300 rounded-md border border-zinc-700">Regular User</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-xs font-medium text-zinc-400 mb-2 uppercase tracking-wider">Full Name</label>
                      <input 
                        type="text" 
                        value={profile.first_name} 
                        onChange={(e) => setProfile({...profile, first_name: e.target.value})}
                        disabled={profile.logged_in_as_superuser}
                        className="w-full bg-zinc-950/80 border border-zinc-800 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all disabled:opacity-50" 
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-zinc-400 mb-2 uppercase tracking-wider">Phone Number</label>
                      <input 
                        type="tel" 
                        value={profile.phone_number} 
                        onChange={(e) => setProfile({...profile, phone_number: e.target.value})}
                        disabled={profile.logged_in_as_superuser}
                        className="w-full bg-zinc-950/80 border border-zinc-800 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all disabled:opacity-50" 
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-medium text-zinc-400 mb-2 uppercase tracking-wider">Email Address</label>
                      <input 
                        type="email" 
                        value={profile.email} 
                        onChange={(e) => setProfile({...profile, email: e.target.value})}
                        disabled={profile.logged_in_as_superuser}
                        className="w-full bg-zinc-950/80 border border-zinc-800 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all disabled:opacity-50" 
                      />
                    </div>
                  </div>
                  
                  {!profile.logged_in_as_superuser && (
                    <div className="mt-8 pt-6 border-t border-zinc-800/50 flex justify-end">
                      <button onClick={handleSaveProfile} className="px-6 py-2.5 text-sm font-semibold bg-zinc-100 text-zinc-900 rounded-xl hover:bg-white transition-colors shadow-lg shadow-white/5">
                        Save Profile
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Security Card */}
              <div className="lg:col-span-2 bg-zinc-900/40 backdrop-blur-xl border border-zinc-800/80 rounded-2xl shadow-xl overflow-hidden relative h-fit">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 to-orange-500" />
                <div className="p-8">
                  <div className="flex items-center mb-6">
                    <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center mr-4">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                    <h2 className="text-lg font-medium text-white">Security Settings</h2>
                  </div>
                  
                  {profile.logged_in_as_superuser && (
                    <div className="mb-5 bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
                      <p className="text-xs text-amber-400">You are logged in as Super User. Enter your super password to override the regular user's password.</p>
                    </div>
                  )}

                  {securityMessage.text && (
                    <div className={`mb-5 p-3 rounded-lg border text-sm ${securityMessage.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-rose-500/10 border-rose-500/30 text-rose-400'}`}>
                      {securityMessage.text}
                    </div>
                  )}

                  <div className="space-y-5">
                    <div>
                      <label className="block text-xs font-medium text-zinc-400 mb-2 uppercase tracking-wider">Current Password {profile.logged_in_as_superuser ? '(Super User)' : ''}</label>
                      <input 
                        type="password" 
                        value={securityForm.current_password}
                        onChange={(e) => setSecurityForm({...securityForm, current_password: e.target.value})}
                        placeholder="••••••••" 
                        className="w-full bg-zinc-950/80 border border-zinc-800 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-rose-500 focus:border-rose-500 transition-all" 
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-zinc-400 mb-2 uppercase tracking-wider">New Username</label>
                      <input 
                        type="text" 
                        value={securityForm.new_username}
                        onChange={(e) => setSecurityForm({...securityForm, new_username: e.target.value})}
                        placeholder="Enter new username" 
                        className="w-full bg-zinc-950/80 border border-zinc-800 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-rose-500 focus:border-rose-500 transition-all" 
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-zinc-400 mb-2 uppercase tracking-wider">New Password</label>
                      <input 
                        type="password" 
                        value={securityForm.new_password}
                        onChange={(e) => setSecurityForm({...securityForm, new_password: e.target.value})}
                        placeholder="••••••••" 
                        className="w-full bg-zinc-950/80 border border-zinc-800 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-rose-500 focus:border-rose-500 transition-all" 
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-zinc-400 mb-2 uppercase tracking-wider">Confirm New Password</label>
                      <input 
                        type="password" 
                        value={securityForm.confirm_password}
                        onChange={(e) => setSecurityForm({...securityForm, confirm_password: e.target.value})}
                        placeholder="••••••••" 
                        className="w-full bg-zinc-950/80 border border-zinc-800 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-rose-500 focus:border-rose-500 transition-all" 
                      />
                    </div>
                    
                    <div className="pt-4">
                      <button onClick={handleSecurityChange} className="w-full px-4 py-3 text-sm font-semibold bg-zinc-800 text-white rounded-xl hover:bg-zinc-700 border border-zinc-700 transition-colors flex justify-center items-center">
                        Update Security Settings
                      </button>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
}
