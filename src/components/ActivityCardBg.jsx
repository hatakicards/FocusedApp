import { Image } from '@/components/ui/image';
import { getActivityBackground, GYM_IMAGE_URL } from '@/lib/constants';

export default function ActivityCardBg({ activity, children, className = '', ...props }) {
  const bgUrl = activity?.is_gym
    ? GYM_IMAGE_URL
    : getActivityBackground(activity?.name, activity?.custom_category_name);
  return (
    <div
      className={`relative rounded-2xl border border-border overflow-hidden ${bgUrl ? 'bg-black' : 'bg-card'} ${className}`}
      {...props}
    >
      {bgUrl && (
        <div className="absolute inset-0">
          <Image src={bgUrl} alt={activity?.name || ''} fittingType="fill" className="w-full h-full" />
        </div>
      )}
      <div className={`relative ${bgUrl ? 'bg-black/60 backdrop-blur-sm' : ''}`}>
        {children}
      </div>
    </div>
  );
}