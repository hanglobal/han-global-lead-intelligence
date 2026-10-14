import React from 'react';

export default function ProfileTab({
  profile,
  setProfile,
  profileMessage,
  handleSaveProfile,
  securityForm,
  setSecurityForm,
  securityMessage,
  handleSecurityChange,
  fileInputRef,
  handleImageUpload
}: any) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
      {/* Profile Card */}
      <div className="lg:col-span-3 bg-zinc-900/40 backdrop-blur-xl border border-zinc-800/80 rounded-2xl shadow-xl overflow-hidden relative">
        <div className="p-8">
          <h2 className="text-base font-semibold text-white mb-6">Personal Details</h2>
          
          {profileMessage.text && (
            <div className={`mb-6 p-3 rounded-lg border text-xs ${profileMessage.type === 'success' ? 'bg-zinc-900 border-zinc-700 text-zinc-200' : 'bg-zinc-900 border-rose-500/40 text-rose-300'}`}>
              {profileMessage.text}
            </div>
          )}
          
          <div className="flex items-center space-x-6 mb-8 bg-zinc-950/50 p-6 rounded-xl border border-zinc-800/50">
            <div className="relative">
              {profile.profile_dp ? (
                <img src={profile.profile_dp} alt="Profile" className="h-20 w-20 rounded-2xl object-cover shadow-lg border border-zinc-700" />
              ) : (
                <div className="h-20 w-20 rounded-2xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-2xl text-zinc-100 font-bold shadow-lg">
                  {profile.first_name ? profile.first_name.charAt(0).toUpperCase() : (profile.username ? profile.username.charAt(0).toUpperCase() : 'A')}
                </div>
              )}
              <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageUpload} className="hidden" />
              <button onClick={() => fileInputRef.current?.click()} className="absolute -bottom-2 -right-2 bg-zinc-850 text-white p-1.5 rounded-lg border border-zinc-700 hover:bg-zinc-750 transition-colors shadow-lg cursor-pointer">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            </div>
            <div>
              <h3 className="text-white font-medium text-lg">{profile.first_name || profile.username || 'Administrator'}</h3>
              <p className="text-zinc-400 text-xs mb-2.5">Admin Account Profile</p>
              <div className="flex gap-2">
                <span className="text-xs px-2.5 py-1 bg-zinc-800 text-zinc-300 rounded-md border border-zinc-700">System Administrator</span>
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
                placeholder="Admin Name"
                className="w-full bg-zinc-950/80 border border-zinc-800 rounded-lg px-4 py-2.5 text-xs text-white focus:outline-none focus:border-zinc-500 transition-all" 
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-2 uppercase tracking-wider">Phone Number</label>
              <input 
                type="tel" 
                value={profile.phone_number} 
                onChange={(e) => setProfile({...profile, phone_number: e.target.value})}
                placeholder="+1 (555) 000-0000"
                className="w-full bg-zinc-950/80 border border-zinc-800 rounded-lg px-4 py-2.5 text-xs text-white focus:outline-none focus:border-zinc-500 transition-all" 
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-zinc-400 mb-2 uppercase tracking-wider">Email Address</label>
              <input 
                type="email" 
                value={profile.email} 
                onChange={(e) => setProfile({...profile, email: e.target.value})}
                placeholder="admin@example.com"
                className="w-full bg-zinc-950/80 border border-zinc-800 rounded-lg px-4 py-2.5 text-xs text-white focus:outline-none focus:border-zinc-500 transition-all" 
              />
            </div>
          </div>
          
          <div className="mt-8 pt-6 border-t border-zinc-800/50 flex justify-end">
            <button onClick={handleSaveProfile} className="px-5 py-2.5 text-xs font-semibold bg-white text-zinc-950 rounded-lg hover:bg-zinc-200 transition-colors shadow-sm cursor-pointer">
              Save Profile
            </button>
          </div>
        </div>
      </div>

      {/* Security Card */}
      <div className="lg:col-span-2 bg-zinc-900/40 backdrop-blur-xl border border-zinc-800/80 rounded-2xl shadow-xl overflow-hidden relative h-fit">
        <div className="p-8">
          <div className="flex items-center mb-6">
            <div className="w-9 h-9 rounded-xl bg-zinc-800 border border-zinc-700/80 text-zinc-300 flex items-center justify-center mr-3">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h2 className="text-base font-semibold text-white">Security Settings</h2>
          </div>

          {securityMessage.text && (
            <div className={`mb-5 p-3 rounded-lg border text-xs ${securityMessage.type === 'success' ? 'bg-zinc-900 border-zinc-700 text-zinc-200' : 'bg-zinc-900 border-rose-500/40 text-rose-300'}`}>
              {securityMessage.text}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wider">Current Password</label>
              <input 
                type="password" 
                value={securityForm.current_password}
                onChange={(e) => setSecurityForm({...securityForm, current_password: e.target.value})}
                placeholder="••••••••" 
                className="w-full bg-zinc-950/80 border border-zinc-800 rounded-lg px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-zinc-500 transition-all" 
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wider">New Username</label>
              <input 
                type="text" 
                value={securityForm.new_username}
                onChange={(e) => setSecurityForm({...securityForm, new_username: e.target.value})}
                placeholder="Enter new username" 
                className="w-full bg-zinc-950/80 border border-zinc-800 rounded-lg px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-zinc-500 transition-all" 
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wider">New Password</label>
              <input 
                type="password" 
                value={securityForm.new_password}
                onChange={(e) => setSecurityForm({...securityForm, new_password: e.target.value})}
                placeholder="••••••••" 
                className="w-full bg-zinc-950/80 border border-zinc-800 rounded-lg px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-zinc-500 transition-all" 
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wider">Confirm New Password</label>
              <input 
                type="password" 
                value={securityForm.confirm_password}
                onChange={(e) => setSecurityForm({...securityForm, confirm_password: e.target.value})}
                placeholder="••••••••" 
                className="w-full bg-zinc-950/80 border border-zinc-800 rounded-lg px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-zinc-500 transition-all" 
              />
            </div>
            
            <div className="pt-3">
              <button onClick={handleSecurityChange} className="w-full px-4 py-2.5 text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg border border-zinc-700 transition-colors flex justify-center items-center cursor-pointer">
                Update Security Settings
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
