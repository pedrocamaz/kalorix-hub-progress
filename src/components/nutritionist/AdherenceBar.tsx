export function AdherenceBar({ percent }: { percent: number }) {
  return (
    <div className="w-full">
      <div className="h-2 bg-gray-200 rounded">
        <div className="h-2 bg-green-600 rounded" style={{ width: `${percent}%` }} />
      </div>
      <p className="mt-1 text-xs text-gray-600">{percent}% adesão</p>
    </div>
  );
}