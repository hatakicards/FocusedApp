import { ExternalLink, BookOpen } from 'lucide-react';
import { useT } from '@/lib/i18n';

// Fonti delle informazioni su salute, alimentazione e sonno mostrate nell'app
// (richiesto da App Review, linea guida 1.4.1): ogni formula e raccomandazione
// ha un riferimento verificabile, con link.
const SOURCES = {
  nutrition: [
    { title: 'Harris JA, Benedict FG. A biometric study of human basal metabolism. PNAS 1918;4(12):370-373', url: 'https://doi.org/10.1073/pnas.4.12.370' },
    { title: 'Mifflin MD, St Jeor ST, et al. A new predictive equation for resting energy expenditure in healthy individuals. Am J Clin Nutr 1990;51(2):241-247', url: 'https://pubmed.ncbi.nlm.nih.gov/2305711/' },
    { title: 'FAO/WHO/UNU. Human energy requirements: report of a joint expert consultation (2001) — physical activity levels', url: 'https://www.fao.org/4/y5686e/y5686e00.htm' },
    { title: 'WHO. Obesity and overweight — BMI classification', url: 'https://www.who.int/news-room/fact-sheets/detail/obesity-and-overweight' },
    { title: 'Jäger R, et al. International Society of Sports Nutrition position stand: protein and exercise. J Int Soc Sports Nutr 2017;14:20', url: 'https://doi.org/10.1186/s12970-017-0177-8' },
    { title: 'WHO. Healthy diet — fat and carbohydrate intake', url: 'https://www.who.int/news-room/fact-sheets/detail/healthy-diet' },
  ],
  sleep: [
    { title: 'Hirshkowitz M, et al. National Sleep Foundation\'s sleep time duration recommendations. Sleep Health 2015;1(1):40-43', url: 'https://doi.org/10.1016/j.sleh.2014.12.010' },
  ],
  food: [
    { title: 'USDA FoodData Central', url: 'https://fdc.nal.usda.gov/' },
    { title: 'CREA — Alimenti e nutrizione', url: 'https://www.crea.gov.it/' },
  ],
};

const HEADINGS = { nutrition: 'hs_nutrition_h', sleep: 'hs_sleep_h', food: 'hs_food_h' };

export default function HealthSources({ topics = ['nutrition', 'sleep', 'food'], className = '' }) {
  const t = useT();
  return (
    <div className={`rounded-2xl border border-border bg-card p-4 ${className}`}>
      <div className="mb-2 flex items-center gap-2">
        <BookOpen size={14} className="text-muted-foreground" />
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('hs_title')}</p>
      </div>
      <p className="mb-3 text-[11px] leading-snug text-muted-foreground">{t('hs_disclaimer')}</p>
      <div className="space-y-3">
        {topics.map((topic) => (
          <div key={topic}>
            <p className="mb-1 text-[11px] font-semibold">{t(HEADINGS[topic])}</p>
            {topic === 'food' && <p className="mb-1 text-[11px] text-muted-foreground">{t('hs_food_note')}</p>}
            <ul className="space-y-1.5">
              {SOURCES[topic].map((s) => (
                <li key={s.url}>
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-start gap-1.5 text-[11px] leading-snug text-muted-foreground underline-offset-2 hover:underline"
                  >
                    <ExternalLink size={11} className="mt-0.5 shrink-0" />
                    <span>{s.title}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
