import { useState } from 'react';
import { ArrowRight, ArrowLeft, Clock, BellOff } from 'lucide-react';

export default function Step3Reminder({ data, onNext, onBack }) {
  const [reminderTime, setReminderTime] = useState(data.reminderTime || '21:00');
  const [reminderEnabled, setReminderEnabled] = useState(data.reminderEnabled ?? true);

  const handleContinue = () => {
    onNext({ reminderTime, reminderEnabled });
  };

  return (
    <div className="flex flex-col min-h-[60vh]">
      <div className="flex-1 flex flex-col justify-center">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Daily reminder</h1>
        <p className="text-muted-foreground text-sm mb-8">A nudge each evening to keep your streak alive.</p>

        <button
          onClick={() => setReminderEnabled(true)}
          className={`w-full rounded-2xl border p-4 flex items-center gap-4 transition-all ${
            reminderEnabled
              ? 'border-foreground bg-foreground/5'
              : 'border-border bg-card'
          }`}
        >
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
            reminderEnabled ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground'
          }`}>
            <Clock size={22} />
          </div>
          <div className="flex-1 text-left">
            <p className="text-sm font-semibold">Remind me at</p>
            <input
              type="time"
              value={reminderTime}
              onChange={(e) => setReminderTime(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              className="bg-transparent text-lg font-bold text-foreground outline-none [color-scheme:dark]"
            />
          </div>
        </button>

        <button
          onClick={() => setReminderEnabled(false)}
          className={`w-full rounded-2xl border p-4 flex items-center gap-4 transition-all mt-3 ${
            !reminderEnabled
              ? 'border-foreground bg-foreground/5'
              : 'border-border bg-card'
          }`}
        >
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
            !reminderEnabled ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground'
          }`}>
            <BellOff size={22} />
          </div>
          <div className="flex-1 text-left">
            <p className="text-sm font-semibold">No thanks</p>
            <p className="text-xs text-muted-foreground">I don't want reminders</p>
          </div>
        </button>
      </div>

      <div className="flex gap-3 mt-8">
        <button
          onClick={onBack}
          className="rounded-2xl border border-border px-5 py-4 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <button
          onClick={handleContinue}
          className="flex-1 rounded-2xl bg-foreground py-4 text-sm font-bold text-background flex items-center justify-center gap-2"
        >
          Continue <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
}