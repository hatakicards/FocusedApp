import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { X, Check } from 'lucide-react';
import { useT } from '@/lib/i18n';
import { SHINE_RANKS } from '@/lib/constants';
import RankShine from '@/components/RankShine';

// Spessore della moneta CSS: copie scurite dell'immagine una dietro l'altra lungo l'asse Z.
const EDGE_LAYERS = 10;
// Rotazione massima in ogni direzione (sinistra/destra e su/giu'): il retro del medaglione non si vede mai.
const MAX_ANGLE = 90;
// Gradi per pixel di trascinamento.
const DRAG_SPEED = 0.45;
// Quanto resta della spinta a ogni frame quando lasci il dito (poi il medaglione si ferma dov'e'),
// e la spinta massima in gradi per frame, cosi' un colpo veloce non lo manda di taglio.
const FRICTION = 0.85;
const MAX_SPIN = 4;
// Modello 3D (GLB, da Meshy) del rank: public/models/rank-<id>.glb. Se manca resta la moneta CSS.
const modelUrl = (rankId) => `/models/rank-${rankId}.glb`;
// Alcuni modelli di Meshy escono girati: il fronte in rilievo guarda dalla parte opposta e la camera
// vedrebbe il retro (specchiato e piu' piatto). Qui la rotazione in gradi che li rimette di fronte.
const MODEL_YAW = { elite: 180 };

const clamp = (v) => Math.max(-MAX_ANGLE, Math.min(MAX_ANGLE, v));

// Pro ed Elite (SHINE_RANKS) sono brillanti: superfici piu' lucide e scintille bianche sulle pietre,
// che si accendono e si spengono quando giri il medaglione (da fermo restano ferme).
const SPARKLE_VERTEX = `
  varying vec3 vNormal;
  varying vec3 vView;
  varying vec3 vPos;
  void main() {
    vPos = (modelMatrix * vec4(position, 1.0)).xyz;
    vNormal = normalize(normalMatrix * normal);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vView = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`;

const SPARKLE_FRAGMENT = `
  uniform float uTurn;
  varying vec3 vNormal;
  varying vec3 vView;
  varying vec3 vPos;
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
  }
  void main() {
    vec3 n = normalize(vNormal);
    vec3 v = normalize(vView);
    vec3 h = normalize(normalize(vec3(0.35, 0.6, 1.0)) + v);
    float facing = max(dot(n, h), 0.0);
    // Riflesso stretto della luce principale: il "lampo" sulle parti lucide.
    float glint = pow(facing, 90.0) * 0.55;
    // Scintille: piccole celle che si accendono solo se la faccetta guarda la luce e cambiano con la rotazione.
    vec2 grid = vPos.xy * 70.0;
    float r = hash(floor(grid));
    float on = step(0.965, fract(r * 13.0 + uTurn));
    // Punto rotondo e sfumato al centro della cella, non un quadratino.
    float dotShape = smoothstep(0.32, 0.0, length(fract(grid) - 0.5));
    float sparkle = on * dotShape * pow(facing, 6.0) * 1.6;
    gl_FragColor = vec4(vec3(glint + sparkle), 1.0);
  }
`;

// Carica three.js solo quando si apre il medaglione e prepara la scena con il modello centrato.
async function loadModelScene(rankId, canvas) {
  const THREE = await import('three');
  const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
  const { MeshoptDecoder } = await import('three/examples/jsm/libs/meshopt_decoder.module.js');
  const { RoomEnvironment } = await import('three/examples/jsm/environments/RoomEnvironment.js');
  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);
  const gltf = await loader.loadAsync(modelUrl(rankId));

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.25;

  const scene = new THREE.Scene();
  // Ambiente riflesso dal metallo: senza, i materiali metallici sembrano opachi.
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envMap = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = envMap;
  scene.add(new THREE.HemisphereLight(0xffffff, 0x222222, 0.8));
  const key = new THREE.DirectionalLight(0xffffff, 2.2);
  key.position.set(2, 3, 4);
  scene.add(key);

  // Centra e scala il modello cosi' che stia sempre nello stesso spazio, qualunque sia la sua misura.
  const model = gltf.scene;
  model.rotation.y = THREE.MathUtils.degToRad(MODEL_YAW[rankId] || 0);
  model.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  model.position.sub(center);
  const pivot = new THREE.Group();
  pivot.add(model);
  pivot.scale.setScalar(2 / Math.max(size.x, size.y, size.z || 1));
  scene.add(pivot);

  const meshes = [];
  model.traverse((o) => { if (o.isMesh) meshes.push(o); });

  // Brillante: superfici piu' lucide e riflettenti, piu' le scintille disegnate sopra in modo additivo.
  let sparkle = null;
  if (SHINE_RANKS.has(rankId)) {
    meshes.forEach((m) => {
      [].concat(m.material).forEach((mat) => {
        if (!mat?.isMeshStandardMaterial) return;
        mat.roughness = Math.min(mat.roughness ?? 1, 0.35);
        mat.envMapIntensity = 1.8;
      });
    });
    sparkle = new THREE.ShaderMaterial({
      uniforms: { uTurn: { value: 0 } },
      vertexShader: SPARKLE_VERTEX,
      fragmentShader: SPARKLE_FRAGMENT,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    meshes.forEach((m) => m.add(new THREE.Mesh(m.geometry, sparkle)));
  }

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
    render: (rotX, rotY) => {
      pivot.rotation.set(THREE.MathUtils.degToRad(rotX), THREE.MathUtils.degToRad(rotY), 0);
      if (sparkle) sparkle.uniforms.uTurn.value = (rotX + rotY) * 0.03;
      renderer.render(scene, camera);
    },
    resize,
    dispose: () => {
      sparkle?.dispose();
      envMap.dispose();
      pmrem.dispose();
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

// Medaglione del rank a tutto schermo: fermo finche' non lo tocchi, poi lo giri col dito a destra/sinistra
// e su/giu' (ognuna tra -90 e +90 gradi). Usa il modello 3D se c'e', altrimenti l'immagine come moneta.
export default function RankMedallion({ categoryId, rankInfo, onClose }) {
  const t = useT();
  const coinRef = useRef(null);
  const canvasRef = useRef(null);
  const sceneRef = useRef(null);
  const [hasModel, setHasModel] = useState(false);
  const state = useRef({ rotX: 0, rotY: 0, velX: 0, velY: 0, dragging: false, lastX: 0, lastY: 0, dirty: true });
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
        state.current.dirty = true;
        setHasModel(true);
      })
      .catch(() => { /* nessun modello per questo rank: resta la moneta */ });
    const onResize = () => { sceneRef.current?.resize(); state.current.dirty = true; };
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
    const tick = () => {
      const s = state.current;
      // Dopo che lasci il dito la spinta si esaurisce in fretta; ai bordi (+-90) si ferma.
      if (!s.dragging && (Math.abs(s.velX) > 0.01 || Math.abs(s.velY) > 0.01)) {
        const nx = clamp(s.rotX + s.velX);
        const ny = clamp(s.rotY + s.velY);
        s.velX = nx === s.rotX + s.velX ? s.velX * FRICTION : 0;
        s.velY = ny === s.rotY + s.velY ? s.velY * FRICTION : 0;
        s.rotX = nx;
        s.rotY = ny;
        s.dirty = true;
      }
      // Si ridisegna solo quando qualcosa si muove: da fermo il medaglione e' davvero fermo.
      if (s.dirty) {
        s.dirty = false;
        if (sceneRef.current) sceneRef.current.render(s.rotX, s.rotY);
        else if (coinRef.current) coinRef.current.style.transform = `rotateX(${-s.rotX}deg) rotateY(${s.rotY}deg)`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    const onKey = (e) => { if (e.key === 'Escape') closeRef.current(); };
    window.addEventListener('keydown', onKey);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('keydown', onKey); };
  }, []);

  const onPointerDown = (e) => {
    e.currentTarget.setPointerCapture?.(e.pointerId);
    Object.assign(state.current, { dragging: true, lastX: e.clientX, lastY: e.clientY, velX: 0, velY: 0 });
  };
  const onPointerMove = (e) => {
    const s = state.current;
    if (!s.dragging) return;
    const dy = (e.clientY - s.lastY) * DRAG_SPEED;
    const dx = (e.clientX - s.lastX) * DRAG_SPEED;
    // Trascinare in giu' inclina la parte alta verso di te.
    s.rotX = clamp(s.rotX + dy);
    s.rotY = clamp(s.rotY + dx);
    s.velX = Math.max(-MAX_SPIN, Math.min(MAX_SPIN, dy));
    s.velY = Math.max(-MAX_SPIN, Math.min(MAX_SPIN, dx));
    s.lastX = e.clientX;
    s.lastY = e.clientY;
    s.dirty = true;
  };
  const onPointerUp = () => { state.current.dragging = false; };

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
        className="relative h-[min(72vw,320px)] w-[min(72vw,320px)] cursor-grab touch-none select-none active:cursor-grabbing"
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
            {SHINE_RANKS.has(rank.id) && <RankShine image={rank.image} />}
          </div>
        )}
      </motion.div>

      <p className="mt-3 text-[11px] text-white/35">{t('rank_drag_hint')}</p>

      <h2 className="mt-5 text-4xl font-bold tracking-tight text-white">{t('rank_' + rank.id)}</h2>

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
