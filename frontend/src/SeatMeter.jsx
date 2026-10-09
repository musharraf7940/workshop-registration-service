export default function SeatMeter({ taken, capacity, size = "sm", hideLabel = false }) {
  const left = Math.max(capacity - taken, 0);
  const tone = left === 0 ? "full" : left <= Math.max(2, Math.ceil(capacity * 0.2)) ? "low" : "open";

  return (
    <div className={`meter ${tone} ${size}`} role="img" aria-label={`${taken} of ${capacity} seats taken`}>
      {capacity <= 30 ? (
        <div className="pips">
          {Array.from({ length: capacity }, (_, i) => (
            <span key={i} className={i < taken ? "pip on" : "pip"} />
          ))}
        </div>
      ) : (
        <div className="bar"><span style={{ width: `${Math.min(100, (taken / capacity) * 100)}%` }} /></div>
      )}
      {!hideLabel && (
        <div className="meter-label">
          {left === 0 ? "Full" : `${left} ${left === 1 ? "seat" : "seats"} left`}
        </div>
      )}
    </div>
  );
}