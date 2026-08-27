import { useRef, useEffect } from 'react';
import { PROFILE_VIDEOS } from '@/lib/constants';

export default function CharacterVideo({ profileType }) {
  const videoRef = useRef(null);
  const videoUrl = PROFILE_VIDEOS[profileType];

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.play().catch(() => {});
    }
  }, [videoUrl]);

  if (!videoUrl) return null;

  return (
    <div className="relative w-28 h-28 mb-3 overflow-hidden rounded-2xl bg-black blend-screen">
      <video
        ref={videoRef}
        src={videoUrl}
        autoPlay
        muted
        playsInline
        className="w-full h-full object-contain"
      />
    </div>
  );
}