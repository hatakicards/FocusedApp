import { useState, useRef } from 'react';
import { Image as ImageIcon, X, Send, Eye, EyeOff } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useT } from '@/lib/i18n';
import { SCHOOL_SYSTEMS } from '@/lib/schoolSystems';
import BottomSelect from '@/components/BottomSelect';
import { Image } from '@/components/ui/image';

export default function ForumPostForm({ onCreated }) {
  const t = useT();
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [postType, setPostType] = useState('notes');
  const [anonymous, setAnonymous] = useState(false);
  const [systemId, setSystemId] = useState('');
  const [yearId, setYearId] = useState('');
  const [images, setImages] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef(null);

  const selectedSystem = SCHOOL_SYSTEMS.find((s) => s.id === systemId);

  const handleUpload = async (files) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const urls = [];
      for (const file of Array.from(files).slice(0, 4)) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        urls.push(file_url);
      }
      setImages((prev) => [...prev, ...urls].slice(0, 4));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const removeImage = (idx) => {
    setImages((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async () => {
    if (!content.trim()) return;
    setSaving(true);
    try {
      const sys = SCHOOL_SYSTEMS.find((s) => s.id === systemId);
      const yr = sys?.years.find((y) => y.id === yearId);
      await base44.entities.ForumPost.create({
        title: title.trim() || null,
        content: content.trim(),
        post_type: postType,
        images,
        anonymous,
        school_system: sys?.label || null,
        school_year: yr?.label || null,
        author_name: anonymous ? null : (user?.full_name || user?.email),
      });
      setContent('');
      setTitle('');
      setPostType('notes');
      setAnonymous(false);
      setSystemId('');
      setYearId('');
      setImages([]);
      onCreated?.();
    } finally {
      setSaving(false);
    }
  };

  const typeOptions = [
    { value: 'notes', label: t('forum_type_notes') },
    { value: 'explanation', label: t('forum_type_explanation') },
    { value: 'question', label: t('forum_type_question') },
  ];

  return (
    <div className="rounded-2xl border border-border bg-card p-4 mb-4">
      {postType === 'question' && (
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t('forum_title_ph')}
          className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none mb-2 [color-scheme:dark]"
        />
      )}
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={t('forum_content_ph')}
        rows={3}
        className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none resize-none mb-3 [color-scheme:dark]"
      />

      <div className="flex gap-2 mb-3">
        <div className="flex-1">
          <BottomSelect
            value={postType}
            onValueChange={setPostType}
            options={typeOptions}
          />
        </div>
        <button
          onClick={() => setAnonymous(!anonymous)}
          className={`flex items-center gap-1.5 rounded-xl px-3 py-2.5 text-xs font-medium transition-colors ${
            anonymous ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground'
          }`}
        >
          {anonymous ? <EyeOff size={14} /> : <Eye size={14} />}
          {anonymous ? t('forum_anon') : t('forum_named')}
        </button>
      </div>

      <div className="flex gap-2 mb-3">
        <div className="flex-1">
          <BottomSelect
            value={systemId}
            onValueChange={(v) => { setSystemId(v); setYearId(''); }}
            options={[{ value: '', label: t('forum_system_ph') }, ...SCHOOL_SYSTEMS.map((s) => ({ value: s.id, label: s.label }))]}
          />
        </div>
        {selectedSystem && (
          <div className="flex-1">
            <BottomSelect
              value={yearId}
              onValueChange={setYearId}
              options={[{ value: '', label: t('forum_year_ph') }, ...selectedSystem.years.map((y) => ({ value: y.id, label: y.label }))]}
            />
          </div>
        )}
      </div>

      {images.length > 0 && (
        <div className="flex gap-2 mb-3 flex-wrap">
          {images.map((url, i) => (
            <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border border-border">
              <Image src={url} fittingType="fill" className="w-full h-full" />
              <button
                onClick={() => removeImage(i)}
                className="absolute top-0.5 right-0.5 bg-background/80 rounded-full p-0.5"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => handleUpload(e.target.files)}
          className="hidden"
        />
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading || images.length >= 4}
          className="flex items-center gap-1.5 rounded-xl border border-border px-3 py-2.5 text-xs font-medium text-muted-foreground disabled:opacity-40"
        >
          <ImageIcon size={14} />
          {uploading ? t('salvataggio') : t('forum_add_images')}
        </button>
        <button
          onClick={handleSubmit}
          disabled={saving || !content.trim()}
          className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-foreground py-2.5 text-sm font-semibold text-background disabled:opacity-40"
        >
          <Send size={14} />
          {saving ? t('salvataggio') : t('forum_post')}
        </button>
      </div>
    </div>
  );
}