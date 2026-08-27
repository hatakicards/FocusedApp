import { useState, useRef, useCallback } from 'react';
import { Loader2 } from 'lucide-react';

const THRESHOLD = 70;
const MAX_PULL = 120;

export default function PullToRefresh({ onRefresh, children }) {
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startYRef = useRef(null);
  const pullingRef = useRef(false);

  const onTouchStart = (e) => {
    if (refreshing) return;
    startYRef.current = window.scrollY > 0 ? null : e.touches[0].clientY;
  };

  const onTouchMove = (e) => {
    if (startYRef.current == null || refreshing) return;
    const delta = e.touches[0].clientY - startYRef.current;
    if (delta <= 0) {
      pullingRef.current = false;
      if (pull !== 0) setPull(0);
      return;
    }
    // Ignore tiny movements so a tap with finger jitter doesn't shift the
    // content and cancel the click (critical on iOS PWA standalone).
    if (delta < 10 && !pullingRef.current) return;
    pullingRef.current = true;
    setPull(Math.min(MAX_PULL, delta * 0.5));
  };

  const onTouchEnd = useCallback(async () => {
    if (!pullingRef.current) {
      startYRef.current = null;
      return;
    }
    pullingRef.current = false;
    startYRef.current = null;
    if (pull >= THRESHOLD) {
      setRefreshing(true);
      setPull(THRESHOLD);
      try {
        await onRefresh?.();
      } finally {
        setRefreshing(false);
        setPull(0);
      }
    } else {
      setPull(0);
    }
  }, [pull, refreshing, onRefresh]);

  const active = refreshing || pull >= THRESHOLD;
  const spin = active ? 'animate-spin' : '';

  return (
    <div
      className="relative"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <div
        className="pointer-events-none absolute top-0 left-0 right-0 flex items-end justify-center overflow-hidden"
        style={{ height: pull }}
      >
        <Loader2
          size={24}
          className={`text-muted-foreground mb-3 transition-transform ${spin}`}
          style={{
            transform: active ? undefined : `rotate(${Math.min(180, (pull / THRESHOLD) * 180)}deg)`,
          }}
        />
      </div>
      <div
        style={{
          transform: `translateY(${pull}px)`,
          transition: pullingRef.current ? 'none' : 'transform 0.3s ease',
        }}
      >
        {children}
      </div>
    </div>
  );
}