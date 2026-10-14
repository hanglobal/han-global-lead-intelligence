import React from 'react';

export default function QualificationTab({
  qualSettings,
  setQualSettings,
  saving,
  message,
  handleSaveQualification,
  loading
}: any) {
  return (
    <div className="bg-zinc-900/40 backdrop-blur-xl border border-zinc-800/80 rounded-2xl shadow-2xl overflow-hidden relative">
      <div className="p-8">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-zinc-700 border-t-zinc-200 rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-8">
            {/* Pre-Scraping Basic Qualification Rules */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-medium text-white">Basic Qualification Criteria</h3>
                  <p className="text-sm text-zinc-400 mt-0.5">
                    Prospects must meet all active criteria before Firecrawl website scraping and AI analysis.
                  </p>
                </div>
                <span className="text-xs bg-zinc-800 text-zinc-300 border border-zinc-700/80 px-2.5 py-1 rounded-full font-medium">
                  B2B Pipeline Rules
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  {
                    key: 'require_website',
                    label: 'Website URL',
                    desc: 'Company website or canonical domain must be present',
                    icon: 'M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9',
                  },
                  {
                    key: 'require_name',
                    label: 'Decision Maker Name',
                    desc: 'Executive / contact full name must be identified',
                    icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
                  },
                  {
                    key: 'require_direct_contact',
                    label: 'Direct Contact Info',
                    desc: 'Requires Work Email, Personal Email, or Mobile (Company phone ignored)',
                    icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
                  },
                  {
                    key: 'require_linkedin',
                    label: 'Personal LinkedIn URL',
                    desc: 'Requires decision maker personal LinkedIn profile link',
                    icon: 'M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1',
                  },
                ].map((req) => {
                  const isActive = !!(qualSettings as any)[req.key];
                  return (
                    <div
                      key={req.key}
                      onClick={() =>
                        setQualSettings({
                          ...qualSettings,
                          [req.key]: !isActive,
                        })
                      }
                      className={`flex items-start p-4 rounded-xl border transition-all cursor-pointer select-none ${
                        isActive
                          ? 'bg-zinc-850 border-zinc-700 shadow-sm'
                          : 'bg-zinc-950/50 border-zinc-800/50 hover:border-zinc-700'
                      }`}
                    >
                      <div
                        className={`flex items-center justify-center w-10 h-10 rounded-lg mr-3.5 flex-none mt-0.5 border ${
                          isActive
                            ? 'bg-zinc-800 border-zinc-600 text-white'
                            : 'bg-zinc-900 border-zinc-800 text-zinc-500'
                        }`}
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={req.icon} />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0 pr-3">
                        <p className="text-sm font-semibold text-white">{req.label}</p>
                        <p className="text-xs text-zinc-400 mt-0.5 leading-snug">{req.desc}</p>
                      </div>
                      <div
                        className={`relative w-10 h-6 rounded-full transition-colors flex-none mt-1 ${
                          isActive ? 'bg-zinc-200' : 'bg-zinc-800'
                        }`}
                      >
                        <div
                          className={`absolute top-1 left-1 w-4 h-4 rounded-full transition-transform ${
                            isActive ? 'bg-zinc-950 translate-x-4' : 'bg-zinc-500 translate-x-0'
                          }`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            
            {/* AI ICP Prompt Section */}
            <div className="pt-6 border-t border-zinc-800/50">
              <div className="flex items-center mb-4">
                <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700/80 text-zinc-300 flex items-center justify-center mr-3">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base font-semibold text-white">Advanced AI Intelligence (ICP)</h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Define your Ideal Customer Profile criteria. The AI agent evaluates scraped website data against this prompt.
                  </p>
                </div>
              </div>
              
              <div className="bg-zinc-950/80 rounded-xl border border-zinc-800 focus-within:border-zinc-500 transition-all overflow-hidden p-1">
                <textarea 
                  rows={6}
                  placeholder="Describe what your business offers and what attributes qualify a lead as an ideal client..."
                  value={qualSettings.agency_services} 
                  onChange={(e) => setQualSettings({...qualSettings, agency_services: e.target.value})}
                  className="w-full bg-transparent p-4 text-xs text-zinc-300 focus:outline-none resize-y leading-relaxed font-mono"
                />
              </div>
            </div>
            
            {/* Action Bar */}
            <div className="flex items-center justify-between pt-6 border-t border-zinc-800/50">
              <div className="text-xs">
                {message && (
                  <span className="flex items-center text-zinc-200 bg-zinc-900 px-3 py-1.5 rounded-lg border border-zinc-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-300 mr-2" />
                    {message}
                  </span>
                )}
              </div>
              <button 
                onClick={handleSaveQualification}
                disabled={saving}
                className="px-5 py-2.5 text-xs font-semibold bg-white text-zinc-950 rounded-lg hover:bg-zinc-200 transition-all disabled:opacity-50 flex items-center shadow-sm cursor-pointer"
              >
                {saving ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-zinc-900/30 border-t-zinc-900 rounded-full animate-spin mr-2" />
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
  );
}
