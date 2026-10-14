import React from 'react';

export default function InsightsTab({
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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-semibold text-white">Dynamic AI Insight Generation Rules</h3>
                <p className="text-xs text-zinc-400 mt-0.5">Define how the AI should analyze the lead and format its insights.</p>
              </div>
            </div>
            
            <div className="bg-zinc-950/80 rounded-xl border border-zinc-800 focus-within:border-zinc-500 transition-all overflow-hidden p-1">
              <textarea 
                rows={10}
                placeholder="e.g. Analyze the lead data and generate three strategic insights..."
                value={qualSettings.insight_generation_rules} 
                onChange={(e) => setQualSettings({...qualSettings, insight_generation_rules: e.target.value})}
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
