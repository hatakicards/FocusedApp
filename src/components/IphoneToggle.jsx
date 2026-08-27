export default function IphoneToggle({ checked, onChange, disabled }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        onChange(!checked);
      }}
      className={`relative h-[31px] w-[51px] shrink-0 rounded-full transition-colors duration-300 disabled:opacity-50 ${
        checked ? 'bg-[#34C759]' : 'bg-[#39393D]'
      }`}
    >
      <span
        className={`absolute top-[2px] left-[2px] h-[27px] w-[27px] rounded-full bg-white shadow-md transition-transform duration-300 ${
          checked ? 'translate-x-[20px]' : 'translate-x-0'
        }`}
      />
    </button>
  );
}