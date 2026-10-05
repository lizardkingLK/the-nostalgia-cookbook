import React, { useState, useRef, useEffect } from 'react';
import {
  Mic,
  Square,
  Upload,
  Loader2,
  Sparkles,
  AlertCircle,
  Volume2,
  Play,
  Pause,
  RotateCcw,
  BookMarked,
  Info,
  Clock,
  Sparkle,
  FileText,
  PenTool,
  Trash2
} from 'lucide-react';
import { SAMPLE_AUDIO_STORIES, ISampleStory } from '../data/sampleRecordings';
import { IRecipe } from '../types/recipe';

interface AudioRecorderProps {
  onRecipeCreated: (recipe: IRecipe) => void;
}

const SAMPLE_APPLE_CRUMB_CAKE = `Oh, let me think... right, the secret apple crumb cake. Your grandfather absolutely loved this back in the winter of 1974 when we lived in that drafty little apartment on 4th street. Let's see... you need apples, obviously. Grab about four granny smith apples. Or honeycrisp! Honeycrisp works if you like it sweeter.
Chop them up—don't make the pieces too small, you want to bite into them. Wait, before you do that, preheat the oven to 350 degrees. Oh! I forgot, make sure you throw in a cup of brown sugar and a solid tablespoon of cinnamon over the apples while they sit.
The apartment was so cold that the butter was always hard as a rock, so we learned to melt a stick of unsalted butter completely before mixing it into the flour for the crumble topping. That's one cup of flour, by the way. Mix it until it looks like wet sand. Bake it for forty-five minutes. Or until it smells like heaven. We used to eat it hot while watching the snow fall outside.`;

export const AudioRecorder: React.FC<AudioRecorderProps> = ({ onRecipeCreated }) => {
  const [activeMode, setActiveMode] = useState<'mic' | 'file' | 'text' | 'samples'>('mic');

  // Mic recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);

  // File upload state
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);

  // Textarea input state (Paste Story / Transcript)
  const [pastedText, setPastedText] = useState<string>('');

  // Sample story state
  const [selectedSample, setSelectedSample] = useState<ISampleStory | null>(null);

  // Hints
  const [familyMemberHint, setFamilyMemberHint] = useState('');
  const [eraHint, setEraHint] = useState('');

  // Processing state
  const [isProcessing, setIsProcessing] = useState(false);
  const [pipelineStage, setPipelineStage] = useState<1 | 2>(1);
  const [statusText, setStatusText] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  // Audio preview playback toggle
  const togglePlayPreview = () => {
    if (!previewAudioRef.current) return;
    if (isPlayingPreview) {
      previewAudioRef.current.pause();
      setIsPlayingPreview(false);
    } else {
      previewAudioRef.current.play();
      setIsPlayingPreview(true);
    }
  };

  // Live microphone capture
  const startRecording = async () => {
    try {
      setErrorMessage(null);
      setAudioBlob(null);
      setSelectedSample(null);
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
        setAudioUrl(null);
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : MediaRecorder.isTypeSupported('audio/mp4')
        ? 'audio/mp4'
        : 'audio/wav';

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const recordedBlob = new Blob(audioChunksRef.current, { type: mimeType });
        setAudioBlob(recordedBlob);
        const url = URL.createObjectURL(recordedBlob);
        setAudioUrl(url);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start(250);
      setIsRecording(true);
      setRecordingSeconds(0);

      timerIntervalRef.current = window.setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err: unknown) {
      console.error('Microphone error:', err);
      setErrorMessage('Microphone access was denied or not found. You can also upload an audio file or try one of the instant sample recordings!');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    }
  };

  const resetRecording = () => {
    setIsRecording(false);
    setAudioBlob(null);
    setRecordingSeconds(0);
    setSelectedFileName(null);
    setSelectedSample(null);
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }
  };

  // File Upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMessage(null);
    setSelectedSample(null);
    setSelectedFileName(file.name);
    setAudioBlob(file);

    if (audioUrl) URL.revokeObjectURL(audioUrl);
    const url = URL.createObjectURL(file);
    setAudioUrl(url);
  };

  // Convert blob to base64
  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        resolve(result);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  // Handle Pipeline Execution
  const handleProcessWorkflow = async () => {
    try {
      setIsProcessing(true);
      setErrorMessage(null);

      let rawTranscript = '';
      let durationSec = recordingSeconds;

      // If user is pasting a story / text transcript:
      if (activeMode === 'text') {
        if (!pastedText.trim()) {
          throw new Error('Please paste or write a story transcript into the text box first.');
        }
        setPipelineStage(1);
        setStatusText('Reading oral story and family memories...');
        await new Promise((r) => setTimeout(r, 400));
        rawTranscript = pastedText.trim();
        durationSec = Math.max(30, Math.round(pastedText.trim().split(/\s+/).length / 2.5));
      } else if (selectedSample) {
        // If user selected a ready sample story:
        setPipelineStage(1);
        setStatusText(`Loading verbatim oral transcription for "${selectedSample.title}"...`);
        await new Promise((r) => setTimeout(r, 600));
        rawTranscript = selectedSample.sampleTranscript;
        durationSec = selectedSample.durationSeconds;
      } else if (audioBlob) {
        // Stage 1: Multimodal Transcription via Gemini API
        setPipelineStage(1);
        setStatusText('Stage 1: Gemini is analyzing audio & transcribing verbatim memories, pauses, and measurements...');

        const base64Audio = await blobToBase64(audioBlob);

        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            audioData: base64Audio,
            mimeType: audioBlob.type || 'audio/webm',
            filename: selectedFileName || 'family-recording.webm',
          }),
        });

        if (!uploadRes.ok) {
          const errData = await uploadRes.json().catch(() => ({}));
          throw new Error(errData.error || `Upload failed with status ${uploadRes.status}`);
        }

        const uploadJson = await uploadRes.json();
        rawTranscript = uploadJson.transcript;
      } else {
        throw new Error('Please record audio, upload a file, paste a story, or select a sample recording first.');
      }

      // Stage 2: Private Restructuring via Open-Source Gemma Heritage Restorer
      setPipelineStage(2);
      setStatusText('Stage 2: Open-Source Gemma is isolating culinary mechanics (Imperial/Metric) and preserving family lore...');

      const processRes = await fetch('/api/process-recipe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: rawTranscript,
          audioDurationSeconds: durationSec,
          familyMemberHint: familyMemberHint || selectedSample?.teller || '',
          eraHint: eraHint || selectedSample?.decade || '',
        }),
      });

      if (!processRes.ok) {
        const errData = await processRes.json().catch(() => ({}));
        throw new Error(errData.error || `Gemma structuring failed with status ${processRes.status}`);
      }

      const processJson = await processRes.json();
      setIsProcessing(false);

      if (processJson.recipe) {
        onRecipeCreated(processJson.recipe);
      }
    } catch (err: unknown) {
      console.error('Processing workflow error:', err);
      let friendlyError = (err as Error).message || 'Failed to complete recipe extraction.';
      if (
        friendlyError.includes('ACCESS_TOKEN_TYPE_UNSUPPORTED') ||
        friendlyError.includes('Request had invalid authentication credentials') ||
        friendlyError.includes('UNAUTHENTICATED')
      ) {
        friendlyError =
          'Google Generative AI Key Notice: Gemini API keys must start with "AIzaSy..." (generated at https://aistudio.google.com/app/apikey). The token provided begins with "AQ." which is an OAuth/Cloud access token, not a Gemini API key.';
      } else if (friendlyError.includes('User not found')) {
        friendlyError =
          'OpenRouter API Key Notice: The OpenRouter key was not recognized (returned 401). Please check your key at https://openrouter.ai/keys.';
      }
      setErrorMessage(friendlyError);
      setIsProcessing(false);
    }
  };

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full max-w-4xl mx-auto bg-[#FAF7F0] border-2 border-[#D8C3B1] rounded-3xl p-6 sm:p-10 shadow-wooden-box relative overflow-hidden">
      {/* Decorative top stripe */}
      <div className="absolute top-0 left-0 w-full h-2.5 bg-gradient-to-r from-[#94442B] via-[#C86446] to-[#607D68]" />

      {/* Header */}
      <div className="text-center mb-8">
        <span className="text-xs font-serif font-bold text-[#94442B] uppercase tracking-widest bg-[#FBECE7] px-3 py-1 rounded-full border border-[#E8A692]">
          Oral Heritage Transcription &amp; Formatting
        </span>
        <h2 className="text-3xl sm:text-4xl font-display font-bold text-[#2C1D11] mt-3">
          Preserve a Family Food Story
        </h2>
        <p className="text-[#705335] text-sm sm:text-base mt-2 font-serif italic max-w-2xl mx-auto">
          Record Grandma&apos;s rambling kitchen instructions, upload an old cassette voice memo, or test an authentic family recording below.
        </p>
      </div>

      {/* Error Banner */}
      {errorMessage && (
        <div className="mb-6 p-4 bg-[#FBECE7] border border-[#C86446] rounded-xl flex items-start gap-3 text-[#94442B] text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-semibold">Notice: </span>
            {errorMessage}
          </div>
        </div>
      )}

      {/* Mode Selector Tabs */}
      <div className="flex flex-wrap sm:flex-nowrap bg-[#F3EED9] p-1.5 rounded-2xl mb-8 max-w-xl mx-auto border border-[#D8C3B1] gap-1">
        <button
          onClick={() => {
            setActiveMode('mic');
            setSelectedSample(null);
          }}
          disabled={isProcessing || isRecording}
          className={`flex-1 min-w-[110px] py-2 text-xs sm:text-sm font-serif font-semibold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
            activeMode === 'mic'
              ? 'bg-[#4A3525] text-[#FAF7F0] shadow-sm'
              : 'text-[#705335] hover:text-[#2C1D11]'
          }`}
        >
          <Mic className="w-4 h-4" />
          <span>Live Record</span>
        </button>

        <button
          onClick={() => {
            setActiveMode('file');
            setSelectedSample(null);
          }}
          disabled={isProcessing || isRecording}
          className={`flex-1 min-w-[110px] py-2 text-xs sm:text-sm font-serif font-semibold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
            activeMode === 'file'
              ? 'bg-[#4A3525] text-[#FAF7F0] shadow-sm'
              : 'text-[#705335] hover:text-[#2C1D11]'
          }`}
        >
          <Upload className="w-4 h-4" />
          <span>Upload Audio</span>
        </button>

        <button
          onClick={() => {
            setActiveMode('text');
            setSelectedSample(null);
            resetRecording();
          }}
          disabled={isProcessing || isRecording}
          className={`flex-1 min-w-[125px] py-2 text-xs sm:text-sm font-serif font-semibold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
            activeMode === 'text'
              ? 'bg-[#4A3525] text-[#FAF7F0] shadow-sm'
              : 'text-[#705335] hover:text-[#2C1D11]'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Paste Story</span>
        </button>

        <button
          onClick={() => {
            setActiveMode('samples');
            resetRecording();
          }}
          disabled={isProcessing || isRecording}
          className={`flex-1 min-w-[110px] py-2 text-xs sm:text-sm font-serif font-semibold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
            activeMode === 'samples'
              ? 'bg-[#94442B] text-white shadow-sm'
              : 'text-[#705335] hover:text-[#2C1D11]'
          }`}
        >
          <Sparkle className="w-4 h-4 text-[#FDFCF7]" />
          <span>Test Samples</span>
        </button>
      </div>

      {/* MODE 1: Live Mic Recording */}
      {activeMode === 'mic' && (
        <div className="bg-[#FDFCF7] border border-[#D8C3B1] rounded-2xl p-8 mb-8 text-center shadow-vintage-inset">
          <div className="relative inline-block mb-6">
            {isRecording && (
              <span className="absolute -inset-2.5 rounded-full bg-[#C86446] opacity-35 animate-ping" />
            )}
            <div
              className={`w-24 h-24 rounded-full flex items-center justify-center transition-all ${
                isRecording
                  ? 'bg-[#94442B] text-white shadow-lg scale-105'
                  : audioBlob
                  ? 'bg-[#607D68] text-white shadow-md'
                  : 'bg-[#E7ECE8] text-[#3F5645] border-2 border-[#ADC2B2]'
              }`}
            >
              <Mic className="w-10 h-10" />
            </div>
          </div>

          <div className="font-mono text-3xl font-bold text-[#2C1D11] mb-2 tracking-wider">
            {formatTimer(recordingSeconds)}
          </div>
          <p className="text-xs font-serif text-[#705335] mb-6 italic">
            {isRecording
              ? 'Listening to the story... Speak freely about ingredients, steps, and memories.'
              : audioBlob
              ? 'Recording captured! Ready to synthesize.'
              : 'Click below to start recording with your microphone.'}
          </p>

          <div className="flex flex-wrap justify-center gap-3">
            {!isRecording ? (
              <button
                onClick={startRecording}
                disabled={isProcessing}
                className="px-6 py-3 bg-[#3F5645] hover:bg-[#2C1D11] text-[#FAF7F0] font-serif rounded-xl font-semibold transition-all shadow-md flex items-center gap-2"
              >
                <Mic className="w-5 h-5 text-[#E7ECE8]" />
                {audioBlob ? 'Record Again' : 'Start Recording Voice Memo'}
              </button>
            ) : (
              <button
                onClick={stopRecording}
                className="px-6 py-3 bg-[#94442B] hover:bg-[#705335] text-white font-serif rounded-xl font-semibold transition-all shadow-md flex items-center gap-2 animate-pulse"
              >
                <Square className="w-5 h-5" />
                <span>Stop Recording</span>
              </button>
            )}

            {audioBlob && !isRecording && (
              <button
                onClick={resetRecording}
                disabled={isProcessing}
                className="px-4 py-3 bg-[#F3EED9] hover:bg-[#E8DEC0] text-[#705335] font-serif rounded-xl font-semibold transition-all flex items-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Clear</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* MODE 2: File Upload */}
      {activeMode === 'file' && (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="bg-[#FDFCF7] border-2 border-dashed border-[#705335]/40 hover:border-[#94442B] rounded-2xl p-10 mb-8 text-center cursor-pointer transition-all shadow-vintage-inset group"
        >
          <div className="w-16 h-16 mx-auto rounded-2xl bg-[#FBECE7] border border-[#E8A692] flex items-center justify-center text-[#94442B] mb-4 group-hover:scale-105 transition-transform">
            <Upload className="w-8 h-8" />
          </div>
          <h3 className="font-display font-bold text-lg text-[#2C1D11]">
            {selectedFileName ? selectedFileName : 'Drop an audio recording here'}
          </h3>
          <p className="text-xs text-[#705335] mt-1 font-serif">
            Supports MP3, WAV, M4A, WEBM, OGG voice memos
          </p>
          <span className="inline-block mt-4 px-4 py-1.5 text-xs font-serif font-semibold bg-[#F3EED9] text-[#4A3525] rounded-lg border border-[#D8C3B1]">
            {selectedFileName ? 'Change Selected File' : 'Browse Local Files'}
          </span>
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*,.mp3,.wav,.m4a,.webm,.ogg"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      )}

      {/* MODE 3: Paste Voice Transcript or Actual Recipe (Learn from Textarea) */}
      {activeMode === 'text' && (
        <div className="bg-[#FDFCF7] border border-[#D8C3B1] rounded-2xl p-6 sm:p-8 mb-8 shadow-vintage-inset space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#D8C3B1] pb-3">
            <div className="flex items-center gap-2.5">
              <PenTool className="w-5 h-5 text-[#94442B]" />
              <div>
                <h3 className="text-base sm:text-lg font-display font-bold text-[#2C1D11]">
                  Paste Oral Story, Voice Transcript, or Family Recipe
                </h3>
                <p className="text-xs text-[#705335] italic font-serif">
                  Paste verbatim memories or recipes—Gemma will learn the mechanics, calculate metric/imperial units, and preserve the memories.
                </p>
              </div>
            </div>

            {/* Quick 1-click Sample Loader for the 1974 Apple Crumb Cake */}
            <button
              onClick={() => {
                setPastedText(SAMPLE_APPLE_CRUMB_CAKE);
                setFamilyMemberHint('Grandmother');
                setEraHint('Winter of 1974, Drafty 4th Street Apartment');
              }}
              className="px-3 py-1.5 bg-[#F3EED9] hover:bg-[#E8DEC0] text-[#4A3525] border border-[#D8C3B1] rounded-xl text-xs font-serif font-bold transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
              title="Load the 1974 Secret Apple Crumb Cake story"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#94442B]" />
              <span>Load 1974 Apple Crumb Cake Story</span>
            </button>
          </div>

          <div className="relative">
            <textarea
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              rows={8}
              placeholder="Paste or write the oral food story here...

Example:
'Oh, let me think... right, the secret apple crumb cake. Your grandfather absolutely loved this back in the winter of 1974 when we lived in that drafty little apartment on 4th street. Let's see... you need apples, obviously. Grab about four granny smith apples...'"
              className="w-full p-4 rounded-xl bg-[#FAF7F0] border-2 border-[#D8C3B1] focus:border-[#94442B] focus:outline-none text-[#2C1D11] font-serif text-sm leading-relaxed placeholder-[#705335]/50 resize-y shadow-inner"
            />
          </div>

          <div className="flex items-center justify-between text-xs font-serif text-[#705335] pt-1">
            <span className="font-medium">
              {pastedText.trim() ? `${pastedText.trim().split(/\s+/).length} words entered` : 'Ready for input'}
            </span>
            {pastedText && (
              <button
                onClick={() => setPastedText('')}
                className="text-[#94442B] hover:underline flex items-center gap-1 font-semibold"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear Text</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* MODE 4: Sample Recordings Library */}
      {activeMode === 'samples' && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4 text-[#705335] text-xs font-serif">
            <Info className="w-4 h-4 text-[#94442B]" />
            <span>Select one of these authentic oral recordings to test without needing a microphone:</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {SAMPLE_AUDIO_STORIES.map((sample) => {
              const isSelected = selectedSample?.id === sample.id;
              return (
                <div
                  key={sample.id}
                  onClick={() => {
                    setSelectedSample(sample);
                    setFamilyMemberHint(sample.teller);
                    setEraHint(sample.decade);
                  }}
                  className={`p-5 rounded-2xl border-2 cursor-pointer transition-all text-left flex flex-col justify-between ${
                    isSelected
                      ? 'bg-[#FBECE7] border-[#94442B] shadow-md scale-[1.02]'
                      : 'bg-[#FDFCF7] border-[#D8C3B1] hover:border-[#705335]'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between text-xs text-[#705335] mb-2 font-serif">
                      <span className="font-bold text-[#94442B]">{sample.decade}</span>
                      <span className="flex items-center gap-1 font-mono">
                        <Clock className="w-3 h-3" /> {sample.durationText}
                      </span>
                    </div>
                    <h4 className="font-display font-bold text-base text-[#2C1D11] mb-1">
                      {sample.title}
                    </h4>
                    <p className="text-xs text-[#705335] font-serif italic line-clamp-3">
                      &ldquo;{sample.description}&rdquo;
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-[#D8C3B1] flex items-center justify-between">
                    <span className="text-xs font-serif font-semibold text-[#4A3525]">
                      Teller: {sample.teller}
                    </span>
                    <span
                      className={`text-xs px-2.5 py-1 rounded-lg font-serif font-medium ${
                        isSelected
                          ? 'bg-[#94442B] text-white'
                          : 'bg-[#F3EED9] text-[#705335]'
                      }`}
                    >
                      {isSelected ? 'Selected' : 'Use Sample'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Audio Playback Preview (if audio is ready) */}
      {audioUrl && !isProcessing && (
        <div className="bg-[#E7ECE8] border border-[#ADC2B2] rounded-2xl p-4 mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={togglePlayPreview}
              className="w-10 h-10 rounded-full bg-[#3F5645] text-white flex items-center justify-center hover:bg-[#2C1D11] transition-colors"
            >
              {isPlayingPreview ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
            </button>
            <div>
              <p className="text-sm font-serif font-bold text-[#2C1D11]">
                Audio Voice Memo Ready
              </p>
              <p className="text-xs text-[#607D68]">
                {recordingSeconds > 0
                  ? `Recorded duration: ${formatTimer(recordingSeconds)}`
                  : `File: ${selectedFileName || 'Uploaded Audio'}`}
              </p>
            </div>
          </div>
          <audio
            ref={previewAudioRef}
            src={audioUrl}
            onEnded={() => setIsPlayingPreview(false)}
            className="hidden"
          />
        </div>
      )}

      {/* Optional Heritage Context Hints */}
      <div className="bg-[#F3EED9]/60 border border-[#D8C3B1] rounded-2xl p-5 mb-8">
        <h4 className="font-serif font-bold text-xs uppercase tracking-wider text-[#705335] mb-3 flex items-center gap-1.5">
          <BookMarked className="w-4 h-4 text-[#94442B]" /> Optional Heritage Context (Helps AI Tag the Archive)
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-serif text-[#4A3525] mb-1 font-medium">
              Storyteller / Family Member
            </label>
            <input
              type="text"
              placeholder="e.g. Grandma Eleanor, Uncle Mateo, Nonna"
              value={familyMemberHint}
              onChange={(e) => setFamilyMemberHint(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-[#FAF7F0] border border-[#D8C3B1] text-sm text-[#2C1D11] focus:outline-none focus:border-[#94442B]"
            />
          </div>
          <div>
            <label className="block text-xs font-serif text-[#4A3525] mb-1 font-medium">
              Era, Year, or Setting
            </label>
            <input
              type="text"
              placeholder="e.g. 1974 Blizzard, Sunday in Brooklyn, 1980s"
              value={eraHint}
              onChange={(e) => setEraHint(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-[#FAF7F0] border border-[#D8C3B1] text-sm text-[#2C1D11] focus:outline-none focus:border-[#94442B]"
            />
          </div>
        </div>
      </div>

      {/* Action / Trigger Button */}
      {((audioBlob || selectedSample) || (activeMode === 'text' && pastedText.trim().length > 0)) && !isProcessing && (
        <div className="text-center">
          <button
            onClick={handleProcessWorkflow}
            className="w-full sm:w-auto px-8 py-4 bg-[#94442B] hover:bg-[#705335] text-[#FAF7F0] font-serif rounded-2xl font-bold text-base transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-3 mx-auto active:scale-95"
          >
            <Sparkles className="w-5 h-5 text-[#E8A692]" />
            <span>
              {activeMode === 'text' ? 'Learn & Archive Recipe From Story' : 'Process Through Hybrid AI Pipeline'}
            </span>
          </button>
          <p className="text-xs text-[#705335] mt-2 font-serif italic">
            {activeMode === 'text'
              ? 'Open-Source Gemma Heritage Restorer: Extracting ingredients, instructions, and family lore'
              : 'Gemini Multimodal Transcription → Open-Source Gemma Heritage Structuring'}
          </p>
        </div>
      )}

      {/* Live Processing Pipeline Visualizer */}
      {isProcessing && (
        <div className="bg-[#FAF7F0] border-2 border-[#C86446] rounded-2xl p-8 text-center space-y-6 shadow-recipe-card">
          <div className="flex items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-[#94442B]" />
            <h3 className="font-display font-bold text-2xl text-[#2C1D11]">
              Archiving Heirloom Recipe
            </h3>
          </div>

          {/* Stepper Progress */}
          <div className="grid grid-cols-2 gap-4 max-w-xl mx-auto">
            <div
              className={`p-4 rounded-xl border transition-all text-left ${
                pipelineStage === 1
                  ? 'bg-[#FBECE7] border-[#94442B] shadow-sm'
                  : 'bg-[#E7ECE8] border-[#607D68]'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#94442B]">
                  Stage 1: Ingestion
                </span>
                {pipelineStage === 2 ? (
                  <span className="text-xs text-[#3F5645] font-bold">✓ Done</span>
                ) : (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#94442B]" />
                )}
              </div>
              <p className="text-xs font-serif font-semibold text-[#2C1D11]">
                Gemini 3.5 Multimodal Transcription
              </p>
              <p className="text-[11px] text-[#705335] italic mt-1">
                Capturing raw rambling speech, hesitation, and colloquial dialect verbatim.
              </p>
            </div>

            <div
              className={`p-4 rounded-xl border transition-all text-left ${
                pipelineStage === 2
                  ? 'bg-[#FBECE7] border-[#94442B] shadow-sm'
                  : 'bg-[#F3EED9] border-[#D8C3B1] opacity-70'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#705335]">
                  Stage 2: Formatting
                </span>
                {pipelineStage === 2 && (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#94442B]" />
                )}
              </div>
              <p className="text-xs font-serif font-semibold text-[#2C1D11]">
                Open-Source Gemma Restorer
              </p>
              <p className="text-[11px] text-[#705335] italic mt-1">
                Segregating culinary formulas (Imperial/Metric) from tender family memories.
              </p>
            </div>
          </div>

          <p className="text-sm font-serif font-medium text-[#4A3525] max-w-lg mx-auto bg-[#FDFCF7] p-3 rounded-xl border border-[#D8C3B1]">
            {statusText}
          </p>
        </div>
      )}
    </div>
  );
};
