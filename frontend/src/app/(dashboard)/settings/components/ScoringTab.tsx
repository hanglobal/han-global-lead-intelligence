import React from 'react';

export default function ScoringTab({
  qualSettings,
  setQualSettings,
  saving,
  message,
  handleSaveQualification
}: any) {
  return (
    <div className="bg-zinc-900/40 backdrop-blur-xl border border-zinc-800/80 rounded-2xl shadow-2xl overflow-hidden relative">
      <div className="p-8">
        <div className="space-y-8">
          <div className="pt-2">
            <div className="flex items-center mb-4">
              <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700/80 text-zinc-300 flex items-center justify-center mr-3">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-semibold text-white">Dynamic AI Scoring Rules</h3>
                <p className="text-xs text-zinc-400 mt-0.5">Define how the AI should score leads out of 100.</p>
              </div>
            </div>
            
            <div className="bg-zinc-950/80 rounded-xl border border-zinc-800 focus-within:border-zinc-500 transition-all overflow-hidden p-1">
              <textarea 
                rows={10}
                placeholder="e.g. If the lead has a company email, add 20 points..."
                value={qualSettings.scoring_rules} 
                onChange={(e) => setQualSettings({...qualSettings, scoring_rules: e.target.value})}
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
  );
}
