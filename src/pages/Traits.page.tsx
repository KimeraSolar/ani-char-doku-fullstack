import { useEffect, useState } from "react";
import { useApp } from "../context"
import { Trait } from "@shared/types";
import { Loader2, Plus, RefreshCw } from "lucide-react";
import { TraitCard } from "../components";

export default function TraitsPage() {
    const { traitsCount } = useApp();
    const [traits, setTraits] = useState<Trait[]>([]);
    const [loading, setLoading] = useState<Boolean>(true);

    async function getAllTraits() {
        setLoading(true);
        try {
            const res = await fetch("/api/traits");
            if (!res.ok) {
                const { error } = await res.json();
                throw new Error(error);
            }

            const json = await res.json();
            const traits: Trait[] = json.traits
            setTraits(traits);
        } catch (err) {
            console.error("Error fetching traits from database:", err);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        if (!traits.length) {
            getAllTraits();
        }
    }, []);

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                {/* Top Banner and Stats info */}
                <div>
                    <h2 className="text-2xl font-black tracking-tight text-white font-sans flex flex-wrap items-center gap-2">
                        <span>Traits Configuration</span>
                        <span className="rounded-full bg-indigo-500/10 px-2.5 py-0.5 text-xs font-semibold text-indigo-400 border border-indigo-500/20">
                            {traitsCount} Registered
                        </span>
                    </h2>
                    <p className="mt-1 text-sm text-slate-400">
                        Manage traits that characters can have.
                    </p>
                </div>

                {/* Global Toolbar */}
                <div className="flex flex-wrap gap-2">
                    <button
                        onClick={() => { }}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-extrabold text-white transition-all hover:bg-indigo-500 shadow-md shadow-indigo-600/20 cursor-pointer"
                    >
                        <Plus className="h-4 w-4" />
                        <span>New Trait</span>
                    </button>

                    <button
                        onClick={getAllTraits}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2.5 text-xs font-bold text-slate-300 transition-colors hover:bg-slate-850 hover:text-white cursor-pointer"
                        title="Reload data"
                    >
                        <RefreshCw className="h-4 w-4" />
                    </button>
                </div>
            </div>

            {/* Traits view */}
            {loading ? (
                <div className="flex flex-col items-center justify-center min-h-[50vh] text-slate-400">
                    <Loader2 className="h-8 w-8 animate-spin text-indigo-400 mb-2" />
                    <p className="text-xs font-mono">Loading traits...</p>
                </div>
            ) : (
                <div className="rounded-2xl border border-slate-855 bg-slate-900/25 p-6 space-y-6">
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                        {traits.map((trait) => {
                            return (
                                <TraitCard trait={trait} />
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    )
}