import { useNavigate } from 'react-router-dom';

export default function WorkWithUsButton() {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate('/work-with-us')}
      className="fixed top-3 right-3 z-40 px-2 py-0.5 rounded-full bg-white/90 text-black text-[10px] font-semibold backdrop-blur-sm hover:bg-white transition-colors safe-top"
      style={{ marginTop: 'env(safe-area-inset-top)' }}
    >
      Work with Us
    </button>
  );
}