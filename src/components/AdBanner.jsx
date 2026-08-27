import { useNavigate } from 'react-router-dom';
import { useT } from '@/lib/i18n';

export default function AdBanner() {
  const t = useT();
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate('/work-with-us')}
      className="w-full px-3 py-1.5 bg-secondary/60 border-b border-border text-center hover:bg-secondary transition-colors"
    >
      <span className="text-[11px] text-muted-foreground">
        {t('ad2_title')} — {t('ad2_sub')}
      </span>
    </button>
  );
}