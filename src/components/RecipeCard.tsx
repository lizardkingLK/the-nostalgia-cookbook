import React, { useState, useRef, useEffect } from 'react';
import {
  Clock,
  Users,
  ChefHat,
  BookOpen,
  CheckSquare,
  Square,
  Printer,
  ArrowLeft,
  HeartHandshake,
  Lightbulb,
  FileText,
  Volume2,
  VolumeX,
  Sparkles,
  Share2,
  Check,
  Flame,
  Scale,
  Calendar,
  Layers,
  Loader2
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { IRecipe } from '../types/recipe';

interface RecipeCardProps {
  recipe: IRecipe;
  onBack: () => void;
}

export const RecipeCard: React.FC<RecipeCardProps> = ({ recipe, onBack }) => {
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [unitSystem, setUnitSystem] = useState<'imperial' | 'metric'>('imperial');
  const [scaleMultiplier, setScaleMultiplier] = useState<number>(1);
  const [showRawTranscript, setShowRawTranscript] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  // Audio narration state
  const [isNarrating, setIsNarrating] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const audioInstanceRef = useRef<HTMLAudioElement | null>(null);

  // Stop narration on unmount or navigation
  useEffect(() => {
    return () => {
      if (audioInstanceRef.current) {
        audioInstanceRef.current.pause();
        audioInstanceRef.current = null;
      }
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const stopAllNarration = () => {
    if (audioInstanceRef.current) {
      audioInstanceRef.current.pause();
      audioInstanceRef.current.currentTime = 0;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsPlayingAudio(false);
    setIsNarrating(false);
  };

  const playBrowserSpeech = (text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setIsNarrating(false);
      setIsPlayingAudio(false);
      return;
    }

    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.92;
      utterance.pitch = 1.0;

      const voices = window.speechSynthesis.getVoices();
      const naturalVoice = voices.find(
        (v) =>
          v.lang.startsWith('en') &&
          (v.name.includes('Natural') ||
            v.name.includes('Google') ||
            v.name.includes('Samantha') ||
            v.name.includes('Daniel') ||
            v.name.includes('Karen') ||
            v.name.includes('Serena'))
      );
      if (naturalVoice) {
        utterance.voice = naturalVoice;
      }

      utterance.onstart = () => {
        setIsPlayingAudio(true);
        setIsNarrating(false);
      };
      utterance.onend = () => {
        setIsPlayingAudio(false);
        setIsNarrating(false);
      };
      utterance.onerror = () => {
        setIsPlayingAudio(false);
        setIsNarrating(false);
      };

      window.speechSynthesis.speak(utterance);
    } catch {
      setIsPlayingAudio(false);
      setIsNarrating(false);
    }
  };

  // Toggle step completion with confetti on finish
  const toggleStep = (stepNumber: number) => {
    let updated: number[];
    if (completedSteps.includes(stepNumber)) {
      updated = completedSteps.filter((s) => s !== stepNumber);
    } else {
      updated = [...completedSteps, stepNumber];
      if (updated.length === recipe.instructions.length) {
        confetti({
          particleCount: 100,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#94442B', '#C86446', '#607D68', '#705335', '#F3EED9'],
        });
      }
    }
    setCompletedSteps(updated);
  };

  // Trigger high-res printable heirloom layout
  const handlePrint = () => {
    window.print();
  };

  // Synthesize oral story narration via Gemini TTS or Browser Voice Fallback
  const handleNarrateStory = async () => {
    // If currently playing, stop it!
    if (isPlayingAudio || isNarrating) {
      stopAllNarration();
      return;
    }

    const textToRead = `${recipe.title}. ${recipe.nostalgia.summary} ${recipe.nostalgia.anecdotes.slice(0, 2).join(' ')}`;

    // If cached cloud audio exists, play it
    if (audioUrl) {
      try {
        const audio = new Audio(audioUrl);
        audioInstanceRef.current = audio;
        audio.onplay = () => setIsPlayingAudio(true);
        audio.onended = () => setIsPlayingAudio(false);
        audio.onerror = () => playBrowserSpeech(textToRead);
        await audio.play();
        return;
      } catch {
        playBrowserSpeech(textToRead);
        return;
      }
    }

    try {
      setIsNarrating(true);

      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: textToRead,
          voice: 'Kore',
        }),
      });

      if (!res.ok) {
        playBrowserSpeech(textToRead);
        return;
      }

      const data = await res.json();
      if (data.audioData) {
        setAudioUrl(data.audioData);
        const audio = new Audio(data.audioData);
        audioInstanceRef.current = audio;
        audio.onplay = () => {
          setIsPlayingAudio(true);
          setIsNarrating(false);
        };
        audio.onended = () => {
          setIsPlayingAudio(false);
          setIsNarrating(false);
        };
        audio.onerror = () => {
          playBrowserSpeech(textToRead);
        };
        await audio.play();
      } else {
        playBrowserSpeech(textToRead);
      }
    } catch {
      playBrowserSpeech(textToRead);
    }
  };

  // Copy recipe summary & ingredients to clipboard
  const handleCopyRecipe = () => {
    const text = `${recipe.title}\n\n${recipe.nostalgia.summary}\n\nINGREDIENTS:\n${recipe.ingredients
      .map((i) => `- ${unitSystem === 'imperial' ? i.imperial : i.metric} ${i.item}`)
      .join('\n')}\n\nINSTRUCTIONS:\n${recipe.instructions
      .map((ins) => `${ins.stepNumber}. ${ins.instruction}`)
      .join('\n')}`;

    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2500);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 font-serif">
      {/* Top Action Bar (hidden when printing) */}
      <div className="flex flex-wrap items-center justify-between gap-4 no-print border-b border-[#D8C3B1] pb-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 bg-[#FAF7F0] hover:bg-[#F3EED9] text-[#4A3525] border border-[#D8C3B1] rounded-xl text-sm font-semibold transition-all shadow-sm"
        >
          <ArrowLeft className="w-4 h-4 text-[#94442B]" />
          <span>Back to Recipe Box</span>
        </button>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleNarrateStory}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all shadow-sm ${
              isPlayingAudio
                ? 'bg-[#94442B] text-white shadow-md'
                : 'bg-[#E7ECE8] hover:bg-[#D0DBD2] text-[#3F5645] border border-[#ADC2B2]'
            }`}
          >
            {isNarrating ? (
              <Loader2 className="w-4 h-4 animate-spin text-current" />
            ) : isPlayingAudio ? (
              <Square className="w-3.5 h-3.5 fill-current animate-pulse" />
            ) : (
              <Volume2 className="w-4 h-4 text-[#607D68]" />
            )}
            <span>
              {isNarrating
                ? 'Tuning Voice...'
                : isPlayingAudio
                ? 'Stop Narration'
                : 'Listen to Story'}
            </span>
          </button>

          <button
            onClick={handleCopyRecipe}
            className="flex items-center gap-2 px-3.5 py-2 bg-[#FAF7F0] hover:bg-[#F3EED9] text-[#705335] border border-[#D8C3B1] rounded-xl text-xs sm:text-sm font-semibold transition-all shadow-sm"
          >
            {isCopied ? <Check className="w-4 h-4 text-[#607D68]" /> : <Share2 className="w-4 h-4" />}
            <span>{isCopied ? 'Copied' : 'Share'}</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-5 py-2 bg-[#94442B] hover:bg-[#705335] text-white rounded-xl text-xs sm:text-sm font-bold transition-all shadow-md"
          >
            <Printer className="w-4 h-4 text-[#FDFCF7]" />
            <span>Print Heirloom Card</span>
          </button>
        </div>
      </div>

      {/* Main Recipe Header Banner */}
      <div className="bg-[#FAF7F0] border-2 border-[#D8C3B1] rounded-3xl p-6 sm:p-10 shadow-recipe-card relative overflow-hidden print-page">
        {/* Decorative corner embellishments */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-[radial-gradient(#E8DEC0_1.5px,transparent_1.5px)] [background-size:12px_12px] opacity-40 pointer-events-none" />

        <div className="relative z-10">
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs uppercase tracking-wider mb-2">
            <span className="font-bold text-[#94442B] bg-[#FBECE7] px-3 py-1 rounded-full border border-[#E8A692]">
              {recipe.category}
            </span>
            {recipe.nostalgia?.historicalContext && (
              <span className="text-[#705335] font-semibold flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#C86446]" />
                {recipe.nostalgia.historicalContext}
              </span>
            )}
          </div>

          <h1 className="text-3xl sm:text-5xl font-display font-bold text-[#2C1D11] mt-2 tracking-tight">
            {recipe.title}
          </h1>

          {/* Cooking metadata bar */}
          <div className="flex flex-wrap items-center gap-4 sm:gap-8 mt-5 pt-5 border-t border-[#D8C3B1] text-xs sm:text-sm text-[#705335]">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#C86446]" />
              <span>
                Prep: <strong className="text-[#2C1D11]">{recipe.prepTime}</strong>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-[#94442B]" />
              <span>
                Cook: <strong className="text-[#2C1D11]">{recipe.cookTime}</strong>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-[#607D68]" />
              <span>
                Yield: <strong className="text-[#2C1D11]">{recipe.servings}</strong>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#705335]" />
              <span>
                Difficulty: <strong className="text-[#2C1D11]">{recipe.difficulty}</strong>
              </span>
            </div>
          </div>

          {/* Nostalgic quote summary */}
          {recipe.nostalgia?.summary && (
            <div className="mt-6 bg-[#FDFCF7] border-l-4 border-[#607D68] p-4 sm:p-5 rounded-r-2xl border-y border-r border-[#D8C3B1]/60">
              <p className="text-[#4A3525] text-base sm:text-lg italic leading-relaxed">
                &ldquo;{recipe.nostalgia.summary}&rdquo;
              </p>
            </div>
          )}
        </div>
      </div>

      {/* TWO SECTIONS: The Kitchen Card & The Story Journal */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* LEFT COLUMN (7 COLS): The Kitchen Card (Mechanics) */}
        <div className="lg:col-span-7 bg-[#FAF7F0] border-2 border-[#D8C3B1] rounded-3xl p-6 sm:p-8 shadow-recipe-card space-y-8">
          {/* Header & Controls */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#D8C3B1] pb-4">
            <h2 className="text-2xl font-display font-bold text-[#2C1D11] flex items-center gap-2.5">
              <ChefHat className="w-6 h-6 text-[#94442B]" />
              <span>The Kitchen Card</span>
            </h2>

            {/* Interactive Imperial / Metric Toggle & Scale */}
            <div className="flex items-center gap-2 no-print">
              <div className="flex bg-[#F3EED9] p-1 rounded-xl border border-[#D8C3B1] text-xs font-sans">
                <button
                  onClick={() => setUnitSystem('imperial')}
                  className={`px-3 py-1 rounded-lg font-bold transition-all ${
                    unitSystem === 'imperial'
                      ? 'bg-[#4A3525] text-[#FAF7F0] shadow-sm'
                      : 'text-[#705335] hover:text-[#2C1D11]'
                  }`}
                >
                  Imperial
                </button>
                <button
                  onClick={() => setUnitSystem('metric')}
                  className={`px-3 py-1 rounded-lg font-bold transition-all ${
                    unitSystem === 'metric'
                      ? 'bg-[#4A3525] text-[#FAF7F0] shadow-sm'
                      : 'text-[#705335] hover:text-[#2C1D11]'
                  }`}
                >
                  Metric
                </button>
              </div>

              {/* Yield Scaler */}
              <div className="flex items-center bg-[#F3EED9] px-2 py-1 rounded-xl border border-[#D8C3B1] text-xs font-sans">
                <span className="text-[#705335] mr-1.5 font-bold">Yield:</span>
                {[0.5, 1, 2].map((m) => (
                  <button
                    key={m}
                    onClick={() => setScaleMultiplier(m)}
                    className={`px-2 py-0.5 rounded-md font-bold transition-all ${
                      scaleMultiplier === m
                        ? 'bg-[#94442B] text-white'
                        : 'text-[#705335] hover:text-[#2C1D11]'
                    }`}
                  >
                    {m}x
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Ingredients List */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-serif font-bold uppercase tracking-wider text-[#705335]">
                Ingredients ({recipe.ingredients.length} items)
              </h3>
              {scaleMultiplier !== 1 && (
                <span className="text-xs text-[#94442B] font-bold">
                  Scaled {scaleMultiplier}x for large family table
                </span>
              )}
            </div>

            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {recipe.ingredients.map((ing, idx) => (
                <li
                  key={idx}
                  className="flex flex-col justify-between bg-[#FDFCF7] p-3.5 rounded-xl border border-[#D8C3B1] text-sm text-[#2C1D11] shadow-vintage-inset"
                >
                  <div className="block">
                    <span className="block font-bold text-[#94442B] text-xs sm:text-sm mb-1 tracking-tight">
                      {unitSystem === 'imperial' ? ing.imperial : ing.metric}
                    </span>
                    <span className="block font-medium text-[#2C1D11] text-sm leading-snug">
                      {ing.item}
                    </span>
                  </div>
                  {ing.notes && (
                    <span className="block text-xs text-[#705335] italic mt-2 pt-1.5 border-t border-[#D8C3B1]/40">
                      {ing.notes}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Step-by-Step Cooking Steps */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-serif font-bold uppercase tracking-wider text-[#705335]">
                Step-by-Step Instructions ({completedSteps.length}/{recipe.instructions.length} completed)
              </h3>
              {completedSteps.length > 0 && (
                <button
                  onClick={() => setCompletedSteps([])}
                  className="text-xs text-[#705335] hover:text-[#94442B] no-print underline"
                >
                  Reset Checkboxes
                </button>
              )}
            </div>

            <div className="space-y-3.5">
              {recipe.instructions.map((step) => {
                const isDone = completedSteps.includes(step.stepNumber);
                return (
                  <div
                    key={step.stepNumber}
                    onClick={() => toggleStep(step.stepNumber)}
                    className={`p-4 rounded-2xl border-2 transition-all cursor-pointer select-none ${
                      isDone
                        ? 'bg-[#E7ECE8]/60 border-[#ADC2B2] opacity-75 line-through text-[#705335]'
                        : 'bg-[#FDFCF7] border-[#D8C3B1] hover:border-[#94442B] text-[#2C1D11] shadow-sm'
                    }`}
                  >
                    <div className="flex items-start gap-3.5">
                      <button
                        className="mt-0.5 text-[#607D68] focus:outline-none"
                        aria-label={`Toggle Step ${step.stepNumber}`}
                      >
                        {isDone ? (
                          <CheckSquare className="w-5 h-5 text-[#3F5645]" />
                        ) : (
                          <Square className="w-5 h-5 text-[#D8C3B1]" />
                        )}
                      </button>
                      <div className="flex-1">
                        <p className="text-sm sm:text-base leading-relaxed">
                          <strong className="text-[#94442B] mr-1.5">
                            Step {step.stepNumber}.
                          </strong>
                          {step.instruction}
                        </p>

                        {/* Chef Tip / Storyteller's Rule */}
                        {step.tip && (
                          <div className="mt-2.5 p-2.5 rounded-xl bg-[#FBECE7] border border-[#E8A692] flex items-start gap-2 text-xs text-[#94442B] italic">
                            <Lightbulb className="w-4 h-4 flex-shrink-0 mt-0.5 text-[#C86446]" />
                            <span>{step.tip}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN (5 COLS): The Story Journal (Heritage Lore & Memories) */}
        <div className="lg:col-span-5 bg-[#FAF7F0] border-2 border-[#D8C3B1] rounded-3xl p-6 sm:p-8 shadow-recipe-card space-y-6 relative overflow-hidden">
          {/* Header */}
          <div className="border-b border-[#D8C3B1] pb-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-display font-bold text-[#2C1D11] flex items-center gap-2.5">
                <BookOpen className="w-6 h-6 text-[#607D68]" />
                <span>The Story Journal</span>
              </h2>
              <span className="text-[11px] font-serif px-2.5 py-0.5 bg-[#E7ECE8] text-[#3F5645] rounded-full font-bold">
                Gemma Isolated
              </span>
            </div>
            <p className="text-xs text-[#705335] mt-1 font-serif italic">
              Extracted from verbatim oral recollections and separated from cooking instructions.
            </p>
          </div>

          {/* People Mentioned */}
          {recipe.nostalgia?.familyMembersMentioned && recipe.nostalgia.familyMembersMentioned.length > 0 && (
            <div>
              <span className="text-xs font-serif font-bold uppercase tracking-wider text-[#705335] flex items-center gap-1.5 mb-2.5">
                <HeartHandshake className="w-4 h-4 text-[#94442B]" /> Cherished Family Mentioned
              </span>
              <div className="flex flex-wrap gap-2">
                {recipe.nostalgia.familyMembersMentioned.map((member, i) => (
                  <span
                    key={i}
                    className="px-3 py-1 rounded-xl text-xs font-serif font-semibold bg-[#FDFCF7] border border-[#D8C3B1] text-[#2C1D11] shadow-sm flex items-center gap-1.5"
                  >
                    <span className="w-2 h-2 rounded-full bg-[#C86446]" />
                    {member}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Anecdotes & Memories */}
          {recipe.nostalgia?.anecdotes && recipe.nostalgia.anecdotes.length > 0 && (
            <div className="space-y-3">
              <span className="text-xs font-serif font-bold uppercase tracking-wider text-[#705335]">
                Family Lore &amp; Oral History
              </span>
              {recipe.nostalgia.anecdotes.map((anecdote, i) => (
                <div
                  key={i}
                  className="bg-[#FDFCF7] p-4 rounded-2xl border border-[#D8C3B1] text-xs sm:text-sm text-[#4A3525] leading-relaxed italic relative pl-8 shadow-vintage-inset"
                >
                  <span className="text-3xl text-[#E8A692] font-display absolute top-1 left-2.5 select-none leading-none">
                    &ldquo;
                  </span>
                  <p>{anecdote}</p>
                </div>
              ))}
            </div>
          )}

          {/* Secret Family Golden Rule */}
          {recipe.nostalgia?.secretFamilyTip && (
            <div className="bg-[#FBECE7] border-2 border-[#E8A692] p-4 rounded-2xl">
              <span className="text-xs font-serif font-bold uppercase tracking-wider text-[#94442B] flex items-center gap-1.5 mb-1">
                <Sparkles className="w-4 h-4 text-[#C86446]" /> The Storyteller&apos;s Golden Rule
              </span>
              <p className="text-xs sm:text-sm text-[#2C1D11] font-serif font-medium leading-relaxed italic">
                {recipe.nostalgia.secretFamilyTip}
              </p>
            </div>
          )}

          {/* Verbatim Raw Transcript Accordion */}
          {recipe.rawTranscript && (
            <div className="border-t border-[#D8C3B1] pt-4 no-print">
              <button
                onClick={() => setShowRawTranscript(!showRawTranscript)}
                className="w-full flex items-center justify-between text-xs font-serif font-semibold text-[#705335] hover:text-[#2C1D11] p-2 rounded-xl hover:bg-[#F3EED9] transition-all"
              >
                <span className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#94442B]" />
                  <span>{showRawTranscript ? 'Hide' : 'Inspect'} Verbatim Audio Transcript</span>
                </span>
                <span className="text-xs underline">{showRawTranscript ? 'Close' : 'View Raw'}</span>
              </button>

              {showRawTranscript && (
                <div className="mt-3 p-4 bg-[#FDFCF7] border border-[#D8C3B1] rounded-2xl text-xs font-mono text-[#4A3525] leading-relaxed max-h-60 overflow-y-auto shadow-vintage-inset">
                  <div className="text-[10px] uppercase font-bold text-[#94442B] mb-2 font-serif">
                    Raw Audio Ingestion Output (Before Gemma Segregation):
                  </div>
                  {recipe.rawTranscript}
                </div>
              )}
            </div>
          )}

          {/* Processing Engine Tag */}
          <div className="text-[11px] font-serif text-[#705335] border-t border-[#D8C3B1] pt-3 flex items-center justify-between">
            <span>Archival Engine:</span>
            <span className="font-semibold text-[#2C1D11]">{recipe.engineUsed || 'Gemma 2 Hybrid'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
