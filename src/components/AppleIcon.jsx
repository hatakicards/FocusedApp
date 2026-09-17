import React from "react";
import { Capacitor } from "@capacitor/core";

// Il carattere U+F8FF e' l'area ad uso privato del font di sistema Apple
// (San Francisco / SF Pro) in cui Apple stessa disegna il proprio logo — e'
// la tecnica standard per mostrare il vero marchio Apple senza scaricare gli
// asset proprietari di developer.apple.com/design/resources. Il precedente
// SVG disegnato a mano era un'imitazione del logo, motivo del rifiuto App
// Review (Guideline 4 - Design).
//
// Il glifo esiste SOLO nei font Apple: fuori da iOS/iPadOS/macOS (sito web
// su Windows/Android/Linux, o la preview desktop) il carattere non esiste in
// nessun font disponibile e non viene mostrato nulla. Per questo lo si usa
// solo quando l'app gira nativamente su iOS; ovunque altro si mostra un logo
// disegnato (non e' l'app iOS sottoposta a review, quindi la Guideline 4 non
// si applica li').
const isNativeIOS = Capacitor.getPlatform() === "ios";

function AppleGlyph({ className }) {
  return (
    <span
      className={className}
      style={{
        fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Apple Symbols", sans-serif',
        fontSize: '1.15em',
        lineHeight: 1,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      aria-hidden="true"
    >
      {''}
    </span>
  );
}

function AppleGlyphFallback({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M16.365 1.43c0 1.14-.462 2.098-1.14 2.847-.744.822-1.98 1.463-3 1.38-.132-1.11.42-2.28 1.11-3.03.762-.84 2.088-1.44 3.03-1.197zM20.4 17.19c-.492 1.14-.726 1.65-1.356 2.658-.882 1.41-2.124 3.165-3.666 3.18-1.368.015-1.722-.9-3.576-.888-1.854.012-2.244.9-3.612.885-1.542-.015-2.718-1.605-3.6-3.015-2.472-3.945-2.73-8.58-1.206-11.04.984-1.62 2.79-2.64 4.62-2.64 1.494 0 2.7.9 3.6.9.867 0 2.394-1.02 4.032-.87.687.03 2.616.276 3.858 2.085-.102.063-2.301 1.344-2.28 4.011.024 3.18 2.79 4.245 2.826 4.26-.024.078-.492 1.68-1.62 3.474z"/>
    </svg>
  );
}

export default function AppleIcon({ className = "w-5 h-5" }) {
  return isNativeIOS ? (
    <AppleGlyph className={className} />
  ) : (
    <AppleGlyphFallback className={className} />
  );
}
