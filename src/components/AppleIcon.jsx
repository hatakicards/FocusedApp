import React from "react";

// Il carattere U+F8FF e' l'area ad uso privato del font di sistema Apple
// (San Francisco / SF Pro, presente su ogni dispositivo iOS/iPadOS/macOS) in
// cui Apple stessa disegna il proprio logo — e' la tecnica standard per
// mostrare il vero marchio Apple senza dover scaricare/includere gli asset
// proprietari di developer.apple.com/design/resources. Il precedente SVG
// disegnato a mano era un'imitazione del logo non scaricata da Apple, motivo
// del rifiuto App Review (Guideline 4 - Design).
export default function AppleIcon({ className = "w-5 h-5" }) {
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
