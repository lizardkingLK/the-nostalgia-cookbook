import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Cpu,
  Lock,
  Server,
  Sparkles,
  CheckCircle2,
  XCircle,
  RefreshCw,
  ExternalLink,
  Heart,
  ChevronRight
} from 'lucide-react';

interface PrivacyModalProps {
  onClose: () => void;
}

export const PrivacyModal: React.FC<PrivacyModalProps> = ({ onClose }) => {
  const [gemmaStatus, setGemmaStatus] = useState<{
    endpoint: string;
    model: string;
    provider?: string;
    isOpenRouter?: boolean;
    hasGemmaKey?: boolean;
    hasGeminiKey?: boolean;
    isGeminiFormatValid?: boolean;
    gemmaKeyMasked?: string;
    geminiKeyMasked?: string;
    mongoConnected?: boolean;
    message?: string;
  } | null>(null);

  const [isLoading, setIsLoading] = useState(false);

  const checkStatus = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/gemma-status');
      if (res.ok) {
        const data = await res.json();
        setGemmaStatus(data);
      }
    } catch (err) {
      console.warn('Status check note:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkStatus();
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-[#2C1D11]/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#FAF7F0] border-2 border-[#D8C3B1] rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-wooden-box relative max-h-[90vh] overflow-y-auto font-serif">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-[#D8C3B1] pb-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#E7ECE8] border border-[#ADC2B2] flex items-center justify-center text-[#3F5645]">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <div>
              <span className="text-xs font-serif font-bold uppercase tracking-wider text-[#94442B]">
                Heritage Architecture &amp; Privacy
              </span>
              <h2 className="text-2xl sm:text-3xl font-display font-bold text-[#2C1D11]">
                Open-Source Gemma &amp; Family Privacy
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-[#705335] hover:text-[#2C1D11] rounded-xl hover:bg-[#F3EED9]"
          >
            ✕
          </button>
        </div>

        {/* Live Status Card */}
        <div className="my-6 bg-[#FDFCF7] border-2 border-[#D8C3B1] rounded-2xl p-5 shadow-vintage-inset">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Cpu className="w-5 h-5 text-[#94442B]" />
              <span className="text-sm font-bold text-[#2C1D11]">
                Live Environment &amp; Inference Status
              </span>
            </div>
            <button
              onClick={checkStatus}
              disabled={isLoading}
              className="flex items-center gap-1.5 text-xs text-[#705335] hover:text-[#94442B] font-bold"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh Status</span>
            </button>
          </div>

          <div className="space-y-2.5 text-xs text-[#4A3525]">
            <div className="flex items-center justify-between p-2.5 bg-[#FAF7F0] rounded-xl border border-[#D8C3B1]">
              <div>
                <span className="font-semibold block">Gemma Inference Model:</span>
                <span className="text-[11px] text-[#705335]">{gemmaStatus?.endpoint}</span>
              </div>
              <div className="flex items-center gap-1.5 font-bold">
                <CheckCircle2 className="w-4 h-4 text-[#607D68]" />
                <span className="text-[#3F5645]">{gemmaStatus?.model || 'google/gemma-2-27b-it'}</span>
              </div>
            </div>

            <div className="flex items-center justify-between p-2.5 bg-[#FAF7F0] rounded-xl border border-[#D8C3B1]">
              <div>
                <span className="font-semibold block">OpenRouter API Key (GEMMA_API_KEY):</span>
                <span className="text-[11px] text-[#705335]">Used for Gemma 2 27B chat completions</span>
              </div>
              <div className="flex items-center gap-1.5 font-bold">
                {gemmaStatus?.hasGemmaKey ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-[#607D68]" />
                    <span className="text-[#3F5645]">{gemmaStatus.gemmaKeyMasked}</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4 text-[#C86446]" />
                    <span className="text-[#94442B]">Not Set in Env</span>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between p-2.5 bg-[#FAF7F0] rounded-xl border border-[#D8C3B1]">
              <div>
                <span className="font-semibold block">Google Gemini Key (Optional Fallback):</span>
                <span className="text-[11px] text-[#705335]">
                  {gemmaStatus?.hasGemmaKey ? 'Not required (OpenRouter is handling transcription & Gemma)' : 'Used for Google Cloud fallback'}
                </span>
              </div>
              <div className="flex items-center gap-1.5 font-bold">
                {gemmaStatus?.hasGemmaKey ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-[#607D68]" />
                    <span className="text-[#3F5645]">OpenRouter Primary</span>
                  </>
                ) : gemmaStatus?.hasGeminiKey ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-[#607D68]" />
                    <span className="text-[#3F5645]">{gemmaStatus.geminiKeyMasked}</span>
                  </>
                ) : (
                  <>
                    <span className="text-[#705335]">Optional</span>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between p-2.5 bg-[#FAF7F0] rounded-xl border border-[#D8C3B1]">
              <div>
                <span className="font-semibold block">Private Vault Database:</span>
                <span className="text-[11px] text-[#705335]">Multi-tenant encrypted family recipe box</span>
              </div>
              <span className="font-bold text-[#3F5645] flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-[#607D68]" />
                <span>{gemmaStatus?.mongoConnected ? 'MongoDB Atlas Cluster Connected' : 'Local Archive Ready'}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Privacy Principles */}
        <div className="space-y-4">
          <h3 className="text-lg font-display font-bold text-[#2C1D11] flex items-center gap-2">
            <Lock className="w-5 h-5 text-[#607D68]" /> Why Open-Source Gemma for Family Archives?
          </h3>
          <p className="text-xs sm:text-sm text-[#705335] leading-relaxed">
            Family recipes rarely exist in isolation; they are deeply entwined with intimate personal history, private nicknames, medical histories, stories of deceased relatives, hardships, or immigration journeys.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div className="bg-[#FAF7F0] p-4 rounded-2xl border border-[#D8C3B1]">
              <div className="w-8 h-8 rounded-lg bg-[#FBECE7] flex items-center justify-center text-[#94442B] mb-2 font-bold text-sm">
                1
              </div>
              <h4 className="font-bold text-sm text-[#2C1D11] mb-1">Air-Gapped Processing</h4>
              <p className="text-xs text-[#705335] leading-relaxed">
                Gemma open-weight models run entirely inside local edge containers or private VPCs without sending transcripts to commercial training pipelines.
              </p>
            </div>

            <div className="bg-[#FAF7F0] p-4 rounded-2xl border border-[#D8C3B1]">
              <div className="w-8 h-8 rounded-lg bg-[#E7ECE8] flex items-center justify-center text-[#3F5645] mb-2 font-bold text-sm">
                2
              </div>
              <h4 className="font-bold text-sm text-[#2C1D11] mb-1">Strict Isolation</h4>
              <p className="text-xs text-[#705335] leading-relaxed">
                Deterministic separation splits mechanical kitchen steps from private oral anecdotes, ensuring sensitive family lore remains guarded in your private archive.
              </p>
            </div>

            <div className="bg-[#FAF7F0] p-4 rounded-2xl border border-[#D8C3B1]">
              <div className="w-8 h-8 rounded-lg bg-[#F3EED9] flex items-center justify-center text-[#705335] mb-2 font-bold text-sm">
                3
              </div>
              <h4 className="font-bold text-sm text-[#2C1D11] mb-1">Open-Weight Freedom</h4>
              <p className="text-xs text-[#705335] leading-relaxed">
                Built on Google&apos;s Gemma 2 open weights (`gemma2:9b`). Compatible with Ollama, vLLM, and portable deployment to DigitalOcean GPU Droplets.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 pt-5 border-t border-[#D8C3B1] flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-[#4A3525] hover:bg-[#2C1D11] text-[#FAF7F0] rounded-xl text-sm font-serif font-bold transition-all shadow-md"
          >
            Back to Cookbook
          </button>
        </div>
      </div>
    </div>
  );
};
