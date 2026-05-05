export function GeoTrackLogo({ size = 36 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="GeoTrack224 logo"
    >
      <defs>
        <clipPath id="pin-clip">
          <path d="M18 2C11.373 2 6 7.373 6 14c0 8.5 12 20 12 20s12-11.5 12-20C30 7.373 24.627 2 18 2z" />
        </clipPath>
        <clipPath id="circle-clip">
          <circle cx="18" cy="13.5" r="5.5" />
        </clipPath>
      </defs>

      {/* Pin shape filled with Guinea flag tricolor (vertical stripes) */}
      <path d="M18 2C11.373 2 6 7.373 6 14c0 8.5 12 20 12 20s12-11.5 12-20C30 7.373 24.627 2 18 2z" fill="#CE1126" />
      <rect x="14" y="2" width="8" height="32" clipPath="url(#pin-clip)" fill="#FCD116" />
      <rect x="18" y="2" width="12" height="32" clipPath="url(#pin-clip)" fill="#009460" />

      {/* Pin border */}
      <path
        d="M18 2C11.373 2 6 7.373 6 14c0 8.5 12 20 12 20s12-11.5 12-20C30 7.373 24.627 2 18 2z"
        stroke="rgba(255,255,255,0.25)"
        strokeWidth="1"
        fill="none"
      />

      {/* Inner circle cutout — white */}
      <circle cx="18" cy="13.5" r="5.5" fill="white" opacity="0.9" />

      {/* Radar / signal rings inside circle */}
      <circle cx="18" cy="13.5" r="1.8" fill="#1e293b" />
      <circle cx="18" cy="13.5" r="3.2" stroke="#1e293b" strokeWidth="0.8" fill="none" opacity="0.4" />
    </svg>
  );
}
