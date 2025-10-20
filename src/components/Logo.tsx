import { Flame } from "lucide-react";

export const Logo = ({ className = "" }: { className?: string }) => {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Flame className="h-8 w-8 text-primary" />
      <span className="text-2xl font-bold text-primary tracking-tight">KALORIX</span>
    </div>
  );
};
