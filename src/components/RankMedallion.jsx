import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { X, Check } from 'lucide-react';
import { useT } from '@/lib/i18n';
import { HOLO_RANKS } from '@/lib/constants';
import RankHolo from '@/components/RankHolo';

// Spessore della moneta CSS: copie scurite dell'immagine una dietro l'altra lungo l'asse Z.
const EDGE_LAYERS = 10;
// Rotazione massima 180 gradi in tutto (da -90 a +90): il retro del medaglione non si vede mai.
const MAX_ANGLE = 90;
// Secondi per andare da un lato all'altro e tornare.
const SWEEP_SECONDS = 7;
// Modello 3D (GLB, da Meshy) del rank: public/models/rank-<id>.glb. Se manca resta la moneta CSS.
const modelUrl = (rankId) => `/models/rank-${rankId}.glb`;

const clamp = (v) => Math.max(-MAX_ANGLE, Math.min(MAX_ANGLE, v));

// Pro ed Elite (HOLO_RANKS) hanno l'effetto olografico: riflessi arcobaleno che cambiano con l'angolo
// di vista (come una carta olografica), una banda di luce che scorre in diagonale e qualche scintilla.

const HOLO_VERTEX = `
  varying vec3 vNormal;
  varying vec3 vView;
  varying vec3 vPos;
  void main() {
    // Posizione nel mondo: il pivot porta ogni modello a circa 2 unita', anche se e' compresso (quantizzato).
    vPos = (modelMatrix * vec4(position, 1.0)).xyz;
    vNormal = normalize(normalMatrix * normal);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vView = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`;

const HOLO_FRAGMENT = `
  uniform float uTime;
  uniform float uAngle;
  varying vec3 vNormal;
  varying vec3 vView;
  varying vec3 vPos;
  vec3 hue(float h) {
    return clamp(abs(mod(h * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
  }
  void main() {
    vec3 p = vPos;
    float facing = abs(dot(normalize(vNormal), normalize(vView)));
    float fresnel = pow(1.0 - facing, 2.0);
    // Il colore dipende da normale, posizione e angolo: girando il medaglione l'arcobaleno scorre.
    float h = fract(dot(vNormal.xy, vec2(0.7, 0.45)) + p.x * 0.35 + p.y * 0.55 + uAngle * 0.45 + uTime * 0.06);
    vec3 rainbow = mix(hue(h), vec3(1.0), 0.15);
    float band = smoothstep(0.9, 1.0, sin((p.x + p.y) * 3.2 - uTime * 2.2) * 0.5 + 0.5);
    float sparkle = step(0.985, fract(sin(dot(floor(p.xy * 60.0), vec2(12.9898, 78.233))) * 43758.5453 + uTime * 0.7));
    float a = 0.16 + fresnel * 0.55 + band * 0.5 + sparkle * 0.6;
    gl_FragColor = vec4(rainbow * a, 1.0);
  }
`;

// Carica three.js solo quando si apre il medaglione e prepara la scena con il modello centrato.
async function loadModelScene(rankId, canvas) {
  const THREE = await import('three');
  const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
  const { MeshoptDecoder } = await import('three/examples/jsm/libs/meshopt_decoder.module.js');
  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);
  const gltf = await loader.loadAsync(modelUrl(rankId));

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.35;

  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xffffff, 0x222222, 1.6));
  const key = new THREE.DirectionalLight(0xffffff, 2.4);
  key.position.set(2, 3, 4);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xffffff, 1.2);
  rim.position.set(-3, 1, -2);
  scene.add(rim);

  // Centra e scala il modello cosi' che stia sempre nello stesso spazio, qualunque sia la sua misura.
  const model = gltf.scene;
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  model.position.sub(center);
  const pivot = new THREE.Group();
  pivot.add(model);
  pivot.scale.setScalar(2 / Math.max(size.x, size.y, size.z || 1));
  scene.add(pivot);

  // Olografico: la stessa geometria disegnata una seconda volta sopra, in modo additivo.
  let holo = null;
  if (HOLO_RANKS.has(rankId)) {
    holo = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uAngle: { value: 0 } },
      vertexShader: HOLO_VERTEX,
      fragmentShader: HOLO_FRAGMENT,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    const meshes = [];
    model.traverse((o) => { if (o.isMesh) meshes.push(o); });
    meshes.forEach((m) => m.add(new THREE.Mesh(m.geometry, holo)));
  }
  const clock = new THREE.Clock();

  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  camera.position.set(0, 0, 4.4);

  const resize = () => {
    const { clientWidth: w, clientHeight: h } = canvas;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  resize();

  return {
    render: (angleDeg) => {
      pivot.rotation.y = THREE.MathUtils.degToRad(angleDeg);
      if (holo) {
        holo.uniforms.uTime.value = clock.getElapsedTime();
        holo.uniforms.uAngle.value = pivot.rotation.y;
      }
      renderer.render(scene, camera);
    },
    resize,
    dispose: () => {
      holo?.dispose();
      renderer.dispose();
      model.traverse((o) => {
        o.geometry?.dispose?.();
        [].concat(o.material || []).forEach((m) => {
          Object.values(m).forEach((v) => v?.isTexture && v.dispose());
          m.dispose?.();
        });
      });
    },
  };
}

// Medaglione del rank a tutto schermo: oscilla da solo tra -90 e +90 gradi e si puo' girare col dito
// (sempre dentro quei 180 gradi). Usa il modello 3D se c'e', altrimenti l'immagine come moneta.
export default function RankMedallion({ categoryId, rankInfo, onClose }) {
  const t = useT();
  const coinRef = useRef(null);
  const canvasRef = useRef(null);
  const sceneRef = useRef(null);
  const [hasModel, setHasModel] = useState(false);
  // phase: posizione nell'oscillazione (angolo = MAX_ANGLE * sin(phase)).
  const state = useRef({ phase: 0, angle: 0, dragging: false, lastX: 0, lastDx: 0 });
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const rank = rankInfo?.rank;

  useEffect(() => {
    if (!rank) return undefined;
    let cancelled = false;
    loadModelScene(rank.id, canvasRef.current)
      .then((s) => {
        if (cancelled) { s.dispose(); return; }
        sceneRef.current = s;
        setHasModel(true);
      })
      .catch(() => { /* nessun modello per questo rank: resta la moneta */ });
    const onResize = () => sceneRef.current?.resize();
    window.addEventListener('resize', onResize);
    return () => {
      cancelled = true;
      window.removeEventListener('resize', onResize);
      sceneRef.current?.dispose();
      sceneRef.current = null;
    };
  }, [rank?.id]);

  useEffect(() => {
    let raf;
    let last = performance.now();
    const tick = (now) => {
      const s = state.current;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!s.dragging) {
        s.phase += (dt * 2 * Math.PI) / SWEEP_SECONDS;
        s.angle = MAX_ANGLE * Math.sin(s.phase);
      }
      if (sceneRef.current) sceneRef.current.render(s.angle);
      else if (coinRef.current) coinRef.current.style.transform = `rotateX(6deg) rotateY(${s.angle}deg)`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    const onKey = (e) => { if (e.key === 'Escape') closeRef.current(); };
    window.addEventListener('keydown', onKey);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('keydown', onKey); };
  }, []);

  const onPointerDown = (e) => {
    e.currentTarget.setPointerCapture?.(e.pointerId);
    Object.assign(state.current, { dragging: true, lastX: e.clientX, lastDx: 0 });
  };
  const onPointerMove = (e) => {
    const s = state.current;
    if (!s.dragging) return;
    const dx = e.clientX - s.lastX;
    s.angle = clamp(s.angle + dx * 0.5);
    if (dx) s.lastDx = dx;
    s.lastX = e.clientX;
  };
  // Quando lasci riparte l'oscillazione dal punto in cui l'hai messo, nel verso in cui lo stavi girando.
  const onPointerUp = () => {
    const s = state.current;
    if (!s.dragging) return;
    s.dragging = false;
    const base = Math.asin(s.angle / MAX_ANGLE);
    s.phase = s.lastDx >= 0 ? base : Math.PI - base;
  };

  if (!rank) return null;
  const nextReq = (rankInfo.requirements || []).find((r) => !r.completed);

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black px-6 safe-top"
      onClick={onClose}
    >
      <button onClick={onClose} aria-label={t('chiudi')} className="absolute right-5 top-[max(env(safe-area-inset-top),1.25rem)] mt-2 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white">
        <X size={20} />
      </button>

      <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.3em] text-white/50">{t('cat_' + categoryId)}</p>

      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 160, damping: 18 }}
        className="relative h-[min(72vw,320px)] w-[min(72vw,320px)] touch-none select-none"
        style={{ perspective: 1000 }}
        onClick={(e) => e.stopPropagation()}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <canvas ref={canvasRef} className={`absolute inset-0 h-full w-full ${hasModel ? '' : 'invisible'}`} />
        {!hasModel && (
          <div ref={coinRef} className="relative h-full w-full" style={{ transformStyle: 'preserve-3d' }}>
            {Array.from({ length: EDGE_LAYERS }, (_, i) => (
              <img
                key={i}
                src={rank.image}
                alt=""
                draggable={false}
                className="absolute inset-0 h-full w-full object-contain"
                style={{ transform: `translateZ(${-i - 1}px)`, filter: 'brightness(0.45)' }}
              />
            ))}
            <img src={rank.image} alt={t('rank_' + rank.id)} draggable={false} className="absolute inset-0 h-full w-full object-contain" />
            {HOLO_RANKS.has(rank.id) && <RankHolo image={rank.image} />}
          </div>
        )}
      </motion.div>

      <h2 className="mt-8 text-4xl font-bold tracking-tight text-white">{t('rank_' + rank.id)}</h2>

      <div className="mt-6 w-full max-w-sm space-y-2" onClick={(e) => e.stopPropagation()}>
        {nextReq ? (
          <>
            <p className="text-center text-[11px] font-semibold uppercase tracking-wider text-white/50">{t('rank_next')}</p>
            <p className="text-center text-sm text-white/80">{t('req_' + categoryId + '_' + nextReq.id)}</p>
          </>
        ) : (
          <p className="flex items-center justify-center gap-1.5 text-sm text-white/80"><Check size={15} /> {t('rank_max')}</p>
        )}
        <p className="pt-1 text-center text-[11px] text-white/40">
          {t('rank_progress').replace('{done}', rankInfo.completedCount).replace('{total}', (rankInfo.requirements || []).length)}
        </p>
      </div>
    </motion.div>,
    document.body,
  );
}
