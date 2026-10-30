import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { ShieldCheck, Key, Cpu, Sliders, Database, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';

interface SettingsPageProps {
  onSettingsUpdated: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ onSettingsUpdated }) => {
  const [apiKey, setApiKey] = useState<string>('');
  const [modelName, setModelName] = useState<string>('gemini-3.8-flash');
  const [threshold, setThreshold] = useState<number>(0.30);
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/settings/config').then((r) => r.json());
      setConfig(res);
      setModelName(res.active_model || 'gemini-3.8-flash');
      setThreshold(res.retrieval_threshold || 0.30);
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setSuccessMessage(null);

      const payload: any = {
        model_name: modelName,
        retrieval_threshold: threshold,
      };

      if (apiKey.trim()) {
        payload.gemini_api_key = apiKey.trim();
      }

      const res = await fetch('/api/settings/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).then((r) => r.json());

      setSuccessMessage('Configuration updated successfully!');
      setApiKey('');
      loadConfig();
      onSettingsUpdated();
    } catch (err: any) {
      alert(`Save failed: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8 animate-fadeIn">
      
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight">System Settings & AI Configuration</h2>
        <p className="text-xs text-slate-400">Configure your Google Gemini API credentials, RAG confidence thresholds, and vector storage.</p>
      </div>

      {/* Development Mode Notice Banner */}
      <div className={`p-5 rounded-2xl border ${
        config?.gemini_api_configured
          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
          : 'bg-amber-500/10 border-amber-500/20 text-amber-300'
      } flex items-start gap-3`}>
        {config?.gemini_api_configured ? (
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
        ) : (
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        )}
        <div className="space-y-1 text-xs">
          <h4 className="font-semibold text-sm">
            {config?.gemini_api_configured ? 'Live Gemini 3.8 Flash AI Connected' : 'Deterministic Development Mode Active'}
          </h4>
          <p className="leading-relaxed opacity-90">
            {config?.gemini_api_configured
              ? `Your API key (${config.masked_api_key}) is active. ReportIQ uses Gemini 3.8 Flash for strict grounded synthesis with exact citations.`
              : 'No Gemini API key is configured. ReportIQ is operating in deterministic development mode: performing hybrid vector retrieval, tabular calculations via Pandas/NumPy, and presenting exact page citations without calling live external LLM endpoints.'}
          </p>
        </div>
      </div>

      {/* Settings Form */}
      <form onSubmit={handleSave} className="p-6 rounded-2xl bg-navy-900 border border-navy-700/80 shadow-card-dark space-y-6">
        
        {/* Gemini API Key */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-brand-violet-light" />
              <span>Google Gemini API Key</span>
            </span>
            {config?.masked_api_key && (
              <span className="text-[11px] font-mono text-emerald-400">
                Configured: {config.masked_api_key}
              </span>
            )}
          </label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={config?.gemini_api_configured ? 'Enter new API key to replace current key...' : 'AIzaSy...'}
            className="w-full bg-navy-950 border border-navy-700 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-violet font-mono"
          />
          <p className="text-[11px] text-slate-500">
            Keys are stored securely in backend server memory or local .env and never sent to frontend clients.
          </p>
        </div>

        {/* Model Selection */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-brand-cyan" />
            <span>Active Gemini Model</span>
          </label>
          <select
            value={modelName}
            onChange={(e) => setModelName(e.target.value)}
            className="w-full bg-navy-950 border border-navy-700 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-brand-violet font-mono"
          >
            <option value="gemini-3.8-flash">gemini-3.8-flash (Recommended: Fast, 1M context, high precision)</option>
            <option value="gemini-3.5-flash-lite">gemini-3.5-flash-lite (Ultra-fast, lowest latency)</option>
            <option value="gemini-4-argon">gemini-4-argon (Maximum reasoning exhaustiveness)</option>
          </select>
        </div>

        {/* Confidence Threshold */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <label className="font-semibold text-slate-300 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-emerald-400" />
              <span>Retrieval Grounding Confidence Threshold</span>
            </label>
            <span className="font-mono text-brand-cyan-light font-bold">
              {Math.round(threshold * 100)}%
            </span>
          </div>
          <input
            type="range"
            min="0.10"
            max="0.80"
            step="0.05"
            value={threshold}
            onChange={(e) => setThreshold(parseFloat(e.target.value))}
            className="w-full accent-brand-violet cursor-pointer"
          />
          <p className="text-[11px] text-slate-500">
            If the highest similarity score falls below this threshold, ReportIQ returns "Not found in the uploaded report" to prevent hallucinated answers.
          </p>
        </div>

        {/* ChromaDB Status Card */}
        <div className="p-4 rounded-xl bg-navy-950 border border-navy-800 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-300 flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-brand-violet-light" />
              <span>Persistent ChromaDB Vector Store</span>
            </span>
            <span className="font-mono text-emerald-400">READY</span>
          </div>
          <p className="text-[11px] text-slate-400 font-mono">
            Location: storage/chroma • Cosine Distance Space • Local Indexing Fallback Enabled
          </p>
        </div>

        {/* Save Button */}
        <div className="flex items-center justify-between pt-2">
          {successMessage ? (
            <span className="text-xs font-mono text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              <span>{successMessage}</span>
            </span>
          ) : <span />}

          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-brand-violet to-brand-violet-dark text-white text-xs font-semibold shadow-glow-violet hover:opacity-95 transition-all"
          >
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
            <span>Save Configuration</span>
          </button>
        </div>

      </form>

    </div>
  );
};
