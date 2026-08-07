import { Trait } from "@shared/types";
import { Loader2, Pencil, Trash2 } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";

interface TraitCardProps {
    trait: Trait;
    onDelete: (trait: Trait) => Promise<boolean>
}

export default function TraitCard({ trait, onDelete }: TraitCardProps) {
    const { id, name, values } = trait;
    const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);

    function handleOpenDeleteModal() {
        setShowDeleteModal(true);
    }

    function handleCloseDeleteModal() {
        setShowDeleteModal(false);
    }

    async function handleDeleteTrait(trait: Trait) {
        const deleted = await onDelete(trait);
        return deleted;
    }

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
                            onClick={handleOpenDeleteModal}
                            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-800 hover:text-red-400 cursor-pointer"
                            title="Delete trait"
                        >
                            <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                        </button>
                    </div>
                </div>

                {/* Values */}
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

            {/* Delete Modal */}
            { showDeleteModal && (
                <DeleteTraitModal trait={trait} onCancel={handleCloseDeleteModal} onConfirm={handleDeleteTrait} />
            )}
        </div>
    );
}

interface DeleteTraitModalProps {
    trait: Trait;
    onCancel: () => void;
    onConfirm: (trait: Trait) => Promise<boolean>;
}

function DeleteTraitModal({ trait, onCancel, onConfirm }: DeleteTraitModalProps) {
    const [processing, setProcessing] = useState<boolean>(false);

    async function handleConfirmDelete() {
        setProcessing(true);
        const deleted = await onConfirm(trait);
        setProcessing(false);
        if (deleted) onCancel();
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-xs">
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 space-y-5 shadow-2xl"
            >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-500/10 text-red-500 border border-red-500/20">
                    <Trash2 className="h-5 w-5" />
                </div>

                <div className="space-y-2">
                    <h3 className="text-base font-black text-white font-sans">Delete Registered Trait?</h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                        You are about to delete the trait <strong className="text-red-450">"{trait.name}"</strong> from the database.
                    </p>
                    <div className="rounded-xl bg-red-950/30 border border-red-900/40 p-3 text-[11px] font-bold text-red-300 leading-relaxed">
                        ⚠️ This will remove this property from all{" "}
                        <span className="text-white font-extrabold underline">{"X"}</span> registered characters currently using it. This action is irreversible.
                    </div>
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={onCancel}
                        className="flex-1 rounded-xl border border-slate-805 bg-slate-900 py-2.5 text-xs font-bold text-slate-300 hover:bg-slate-800 cursor-pointer"
                    >
                        Back
                    </button>
                    <button
                        onClick={() => handleConfirmDelete()}
                        disabled={processing}
                        className="flex items-center justify-center flex-1 rounded-xl bg-red-800 hover:bg-red-500 disabled:opacity-45 py-2.5 text-xs font-black text-white shadow-lg shadow-red-650/15 cursor-pointer"
                    >
                        {processing ? (<><Loader2 className="h-5 w-5 animate-spin text-white mr-2" /> Deleting...</>) : "Confirm Deletion"}
                    </button>
                </div>
            </motion.div>
        </div>
    );
}