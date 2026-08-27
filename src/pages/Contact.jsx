import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Mail, Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { base44 } from '@/api/base44Client';

export default function Contact() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSending(true);
    try {
      await base44.integrations.Core.SendEmail({
        to: 'focusedappp@gmail.com',
        subject: `Contact from ${name || 'a visitor'}`,
        body: `Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`,
      });
      setSent(true);
      setName('');
      setEmail('');
      setMessage('');
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setSending(false);
    }
  };

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

        <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
          Contact Us
        </h1>
        <p className="text-white/60 mb-8 text-base md:text-lg">
          Have a question, feedback, or need help? We'd love to hear from you.
        </p>

        <div className="space-y-8">
          <a
            href="mailto:focusedappp@gmail.com"
            className="flex items-center gap-3 p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
          >
            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center shrink-0">
              <Mail size={18} />
            </div>
            <div>
              <p className="text-sm text-white/50">Email us directly</p>
              <p className="text-sm font-medium">focusedappp@gmail.com</p>
            </div>
          </a>

          <div className="p-6 rounded-xl bg-white/5 border border-white/10">
            <h2 className="text-lg font-semibold mb-4">Send us a message</h2>
            {sent ? (
              <div className="py-8 text-center">
                <p className="text-white font-medium mb-1">Message sent!</p>
                <p className="text-sm text-white/60">We'll get back to you as soon as possible.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                    className="bg-black/40 border-white/10 h-11"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="bg-black/40 border-white/10 h-11"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="message">Message</Label>
                  <Textarea
                    id="message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="How can we help?"
                    className="bg-black/40 border-white/10 min-h-[120px]"
                    required
                  />
                </div>
                {error && (
                  <p className="text-sm text-red-400">{error}</p>
                )}
                <Button
                  type="submit"
                  disabled={sending}
                  className="w-full h-11 font-medium"
                >
                  {sending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send size={16} className="mr-2" />
                      Send Message
                    </>
                  )}
                </Button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}