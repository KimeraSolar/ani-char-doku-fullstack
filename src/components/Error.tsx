import { AlertCircle } from "lucide-react";
import { ReactElement } from "react";

interface ErrorProps {
    icon?: ReactElement;
    title?: string;
    content?: string;
    actions?: ReactElement[];
}

export default function Error({ icon, title, content, actions }: ErrorProps) {
    return (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-800 bg-slate-900/20 p-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-500/10 text-rose-400">
                {icon || <AlertCircle className="w-6 h-6" />}
            </div>
            <h3 className="mt-4 text-base font-bold text-slate-200">{title || "Error"}</h3>
            <p className="mt-2 max-w-sm text-sm text-slate-400">
                {content || "Sorry, an unexpected error happened. Please try again."}
            </p>
            {actions && actions.map(action => action)}
        </div>
    );
}