import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Megaphone, TrendingUp, MessageSquare, Phone, Image, Smartphone } from 'lucide-react';
import { useT } from '@/lib/i18n';

export default function WorkWithUs() {
  const t = useT();
  const navigate = useNavigate();

  return (
    <div className="p-5 space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-2xl font-bold">{t('wwu_title')}</h1>
      </div>

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Megaphone size={20} className="text-foreground" />
          <h2 className="text-lg font-semibold">{t('wwu_ads_title')}</h2>
        </div>
        <p className="text-sm text-muted-foreground">{t('wwu_ads_sub')}</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-card border border-border p-4">
            <div className="flex items-center gap-1.5 mb-1">
              <Image size={14} className="text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Banner</span>
            </div>
            <p className="text-2xl font-bold">€0,005</p>
            <p className="text-[11px] text-muted-foreground">per impressione</p>
          </div>
          <div className="rounded-xl bg-card border border-border p-4">
            <div className="flex items-center gap-1.5 mb-1">
              <Smartphone size={14} className="text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Full screen</span>
            </div>
            <p className="text-2xl font-bold">€0,02</p>
            <p className="text-[11px] text-muted-foreground">per impressione</p>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <TrendingUp size={20} className="text-foreground" />
          <h2 className="text-lg font-semibold">{t('wwu_sponsor')}</h2>
        </div>
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>{t('wwu_free_ads')}</p>
          <p>{t('wwu_banner_ads')}</p>
          <p>{t('wwu_niche')}</p>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <MessageSquare size={20} className="text-foreground" />
          <h2 className="text-lg font-semibold">{t('wwu_contact_title')}</h2>
        </div>
        <div className="rounded-xl bg-card border border-border p-4 space-y-2">
          <a href="sms:3894817235" className="flex items-center gap-2 text-lg font-medium hover:underline">
            <Phone size={18} />
            {t('wwu_phone')}
          </a>
          <p className="text-xs text-muted-foreground">{t('wwu_phone_note')}</p>
        </div>
        <p className="text-sm text-muted-foreground">{t('wwu_contact2')}</p>
      </section>
    </div>
  );
}