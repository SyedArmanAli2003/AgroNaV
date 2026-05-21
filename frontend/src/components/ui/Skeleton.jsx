/**
 * Skeleton — loading placeholder with shimmer animation.
 * Uses @keyframes shimmer from design-tokens.css.
 */
function Skeleton({ width = '100%', height = '20px', borderRadius = '8px', style = {} }) {
  return (
    <div style={{
      width,
      height,
      borderRadius,
      background: 'linear-gradient(90deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 100%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.4s infinite',
      ...style,
    }} />
  );
}

export function SkeletonCard() {
  return (
    <div className="glass-card" style={{ padding: '20px', marginBottom: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <Skeleton height="20px" width="60%" />
        <Skeleton height="28px" width="28px" borderRadius="50%" />
      </div>
      <Skeleton height="8px" width="100%" borderRadius="4px" style={{ marginBottom: '12px' }} />
      <Skeleton height="14px" width="80%" style={{ marginBottom: '8px' }} />
      <Skeleton height="14px" width="65%" />
    </div>
  );
}

export default Skeleton;
