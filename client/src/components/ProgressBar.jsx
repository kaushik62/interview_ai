export default function ProgressBar({ value, max, className = '', color = 'electric' }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;

  const trackColor = 'bg-white/[0.06]';
  const fillColor = {
    electric: 'bg-electric-500',
    plasma:   'bg-plasma-500',
    amber:    'bg-amber-400',
    danger:   'bg-danger',
  }[color] ?? 'bg-electric-500';

  return (
    <div className={`h-1.5 rounded-full overflow-hidden ${trackColor} ${className}`}>
      <div
        className={`h-full rounded-full transition-all duration-700 ease-out ${fillColor}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
