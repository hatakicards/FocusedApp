// Riflesso brillante sopra l'immagine di un rank (Pro, Elite): una luce bianca fissa e qualche punto
// luminoso, ritagliati sulla forma del medaglione con la stessa immagine come maschera. Nessuna
// animazione automatica. Stili in index.css (.rank-shine).
export default function RankShine({ image, className = '' }) {
  const mask = `url(${image}) center / contain no-repeat`;
  return (
    <div aria-hidden className={`pointer-events-none absolute inset-0 ${className}`} style={{ WebkitMask: mask, mask }}>
      <div className="rank-shine absolute inset-0" />
    </div>
  );
}
