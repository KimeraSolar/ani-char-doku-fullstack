import { Trait } from "@shared/types";
import { Pencil, Trash2 } from "lucide-react";

interface TraitCardProps {
    trait: Trait;
}

export default function TraitCard({ trait }: TraitCardProps) {
    const { id, name, values } = trait;

    return (
        <div
            key={id}
            id={`trait-card-${id}`}
            className="group flex flex-col rounded-xl border border-slate-850 bg-slate-955/20 p-5 hover:bg-slate-900/25 hover:border-slate-800 shadow-xs transition-all duration-150"
        >
            <div className="flex flex-col h-full justify-between space-y-4">
                <div className="flex items-start justify-between gap-2">
                    {/* Title */}
                    <div>
                        <h4 className="text-sm font-black text-white tracking-tight font-sans">
                            {name}
                        </h4>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
                        <div className="text-[11px] font-extrabold px-1.5 py-0.5 rounded-lg border border-slate-850 bg-slate-950 text-indigo-400 font-sans shadow-inner mr-1">
                            0 characters
                        </div>

                        <button
                            onClick={() => { }}
                            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-800 hover:text-slate-200 cursor-pointer"
                            title="Edit trait"
                        >
                            <Pencil className="h-3.5 w-3.5 text-amber-500" />
                        </button>

                        <button
                            onClick={() => { }}
                            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-800 hover:text-red-400 cursor-pointer"
                            title="Delete trait"
                        >
                            <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                        </button>
                    </div>
                </div>
                <div className="flex flex-wrap gap-2 pt-2">
                    {values.length === 0 && (
                        <span className="text-[10px] text-slate-500 italic">No values registered for this trait yet.</span>
                    )}
                    {values.length > 0 && (
                        values.slice(0, 15).map((value) => (
                            <div
                                key={value.key}
                                title={value.description}
                                className="group/pill relative rounded-lg border border-slate-850 bg-slate-950/40 px-2.5 py-1 text-[11px] font-bold text-slate-350 cursor-help hover:border-indigo-500/35 hover:text-white transition-all"
                            >
                                <span>{value.name}</span>
                                {value.description && (
                                    <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover/pill:block w-48 bg-slate-950 text-slate-200 text-[9px] font-semibold rounded p-1.5 shadow-xl border border-slate-800 text-center z-20">
                                        {value.description}
                                    </span>
                                )}
                            </div>
                        ))
                    )}
                    {values.length > 15 && (
                        <span className="rounded-lg border border-slate-855 bg-slate-900 px-2 py-0.5 text-[10px] font-extrabold text-indigo-400">
                            + {values.length - 15} more
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}