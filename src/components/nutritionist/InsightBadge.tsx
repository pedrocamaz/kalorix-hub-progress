import { AlertTriangle, CheckCircle, Info } from 'lucide-react';

export function InsightBadge({ text }: { text: string }) {
  const critical = /proteína abaixo|baixa adesão/i.test(text);
  const good = /alta consistência/i.test(text);
  return (
    <div
      className={`flex items-center gap-1 text-xs px-2 py-1 rounded ${
        critical ? 'bg-red-50 text-red-700' : good ? 'bg-green-50 text-green-700' : 'bg-blue-50 text-blue-700'
      }`}
    >
      {critical ? <AlertTriangle className="h-3 w-3" /> : good ? <CheckCircle className="h-3 w-3" /> : <Info className="h-3 w-3" />}
      <span>{text}</span>
    </div>
  );
}