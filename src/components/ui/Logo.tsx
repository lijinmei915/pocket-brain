export function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="28" height="28" rx="7" fill="#EF4444"/>
      <g transform="translate(4,4) scale(0.833)">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" fill="#8B5CF6"/>
      </g>
    </svg>
  )
}
