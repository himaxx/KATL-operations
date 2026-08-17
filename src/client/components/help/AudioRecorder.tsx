import React, { useState, useRef } from 'react';
import { Mic, Square, Play, Trash2 } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

interface AudioRecorderProps {
  onAudioRecorded: (audioUrl: string) => void;
}

export const AudioRecorder: React.FC<AudioRecorderProps> = ({ onAudioRecorded }) => {
  const { t } = useLanguage();
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<any>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      chunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
        onAudioRecorded(url);
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordingSeconds(0);

      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Microphone access error:', err);
      alert('Microphone permission needed to record voice note.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const clearAudio = () => {
    setAudioUrl(null);
    onAudioRecorded('');
    setRecordingSeconds(0);
  };

  return (
    <div className="p-3 bg-slate-100/80 rounded-2xl border border-slate-200">
      {!audioUrl ? (
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={isRecording ? stopRecording : startRecording}
            className={`min-h-[48px] px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-all shadow-sm ${
              isRecording
                ? 'bg-lightpink-500 hover:bg-lightpink-700 text-white animate-pulse'
                : 'bg-navy-900 hover:bg-navy-800 text-white'
            }`}
          >
            {isRecording ? (
              <>
                <Square className="w-4 h-4 fill-white" />
                <span>{t.stopRecording} ({recordingSeconds}s)</span>
              </>
            ) : (
              <>
                <Mic className="w-4 h-4" />
                <span>{t.recordVoiceNote}</span>
              </>
            )}
          </button>

          {isRecording && (
            <div className="flex items-center gap-1 text-lightpink-700 font-extrabold text-xs">
              <span className="w-2 h-2 rounded-full bg-lightpink-500 animate-ping" />
              Recording...
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-between gap-2">
          <audio controls src={audioUrl} className="h-10 w-full max-w-[280px]" />
          <button
            type="button"
            onClick={clearAudio}
            className="p-2.5 rounded-xl text-slate-500 hover:text-lightpink-700 hover:bg-lightpink-50 transition"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
