interface MarkProps {
  size?: number;
}

/** An open ring cradling a small dot: care held close. */
export function LogoMark({ size = 32 }: MarkProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path
        d="M27 16a11 11 0 1 1-3.6-8.1"
        stroke="var(--teal)"
        strokeWidth="3.6"
        strokeLinecap="round"
      />
      <circle cx="16" cy="17.5" r="4" fill="var(--coral)" />
    </svg>
  );
}

function Logo({ size = 30 }: MarkProps) {
  return (
    <span className="logo" role="img" aria-label="MamaCare">
      <LogoMark size={size} />
      <span className="logo__word" aria-hidden="true">MamaCare</span>
    </span>
  );
}

export default Logo;
