import { Loader2 } from "lucide-react";

interface LoadingProps {
    message?: string;
}

export default function Loading({ message }: LoadingProps) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] text-slate-400">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-400 mb-2" />
        {message && <p className="text-xs font-mono">{message}</p>}
      </div>
    );
}