// Strato olografico sopra l'immagine di un rank (Pro, Elite): un arcobaleno che scorre, ritagliato
// sulla forma del medaglione grazie alla maschera con la stessa immagine. Stili in index.css (.rank-holo).
export default function RankHolo({ image, className = '' }) {
  const mask = `url(${image}) center / contain no-repeat`;
  return (
    <div aria-hidden className={`pointer-events-none absolute inset-0 ${className}`} style={{ WebkitMask: mask, mask }}>
      <div className="rank-holo absolute inset-0" />
      <div className="rank-holo-glint absolute inset-0" />
    </div>
  );
}
