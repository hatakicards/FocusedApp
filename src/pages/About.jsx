import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function About() {
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-2xl mx-auto px-6 py-12 md:py-20">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors mb-8"
        >
          <ArrowLeft size={16} />
          Back to home
        </Link>

        <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-6">
          About Focused
        </h1>

        <div className="space-y-4 text-white/70 leading-relaxed text-base md:text-lg">
          <p>
            Focused is a personal discipline and habit tracker built around a simple idea:
            small, consistent actions repeated every day are what turn ordinary people into
            high performers. Whether you are a student trying to stay on top of your studies,
            an athlete pushing for the next level, or a professional balancing work, health,
            and personal growth, Focused gives you a single place to track the habits that
            matter to you and see your progress over time.
          </p>
          <p>
            The app lets you create custom activities across categories like fitness, mind,
            learning, sport, work, and lifestyle. Each completed activity earns a rating
            from one to five, feeding into detailed statistics, streaks, and a ranking system
            that turns self-improvement into a measurable journey. Beyond habits, Focused
            includes a Body Fuel nutrition tracker, a Gym Tracker with scheduling, a Focus
            Time module for deep work, a Workspace for tasks and meetings, and a secured
            Quit Smoking module with end-to-end encryption. Focusy, the built-in AI assistant,
            analyzes your historical data to deliver personalized advice on nutrition,
            training, and motivation.
          </p>
          <p>
            Focused is built and maintained by a small independent team passionate about
            productivity, privacy, and clean design. We believe technology should help you
            build discipline, not distract you from it — so every feature is designed to be
            lightweight, private by default, and genuinely useful. We are constantly
            listening to our community and shipping improvements based on real user
            feedback.
          </p>
        </div>
      </div>
    </div>
  );
}