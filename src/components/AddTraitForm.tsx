import { Trait, TraitValue } from "@shared/types";
import { toSlug } from "@shared/utils";
import { AlertCircle, Loader2, Trash2, X } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useState } from "react";

interface AddTraitFormProps {
    onCancel: () => void;
    onSubmit: (trait: Trait) => Promise<boolean>;
}

export default function AddTraitForm({ onCancel, onSubmit }: AddTraitFormProps) {
    const [name, setName] = useState<string>("");
    const [values, setValues] = useState<TraitValue[]>([]);
    const [newValue, setNewValue] = useState<{ key?: string, name?: string, description?: string } | null>(null);
    const [formError, setFormError] = useState<string>("");
    const [submitting, setSubmitting] = useState<boolean>(false);

    function clearForm() {
        setName("");
        setValues([]);
        setNewValue(null);
        setFormError("");
    }

    function valueKeyAlreadyExists(key: string): boolean {
        const valueKey = values.find(value => value.key === key);
        if (valueKey) return true;
        return false;
    }

    function handleCancel() {
        clearForm();
        onCancel();
    }

    function handleSetValueName(valName: string) {
        setNewValue({
            ...newValue,
            key: toSlug(valName),
            name: valName
        });
    }

    function handleSetValueDescription(valDescription: string) {
        setNewValue({
            ...newValue,
            description: valDescription,
        });
    }

    function handleCleanValueForm() {
        setFormError("");
        setNewValue(null);
    }

    function handleSetValue() {
        if (!newValue?.name?.trim() || !newValue?.description?.trim()) {
            setFormError("Please fill both trait value's name and description to add it to the trait.");
        } else {
            if (valueKeyAlreadyExists(newValue.key!)) {
                setFormError("Cannot add a trait value with the same key as another already added trait value.");
            } else {
                setFormError("");
                const updatedValues = values;
                updatedValues.push({
                    key: newValue.key!,
                    name: newValue.name,
                    description: newValue.description
                });
                setValues(updatedValues);
                handleCleanValueForm();
            }
        }
    }

    function handleRemoveValue(valKey: string) {
        const updatedValues = values.filter(value => value.key !== valKey);
        setValues(updatedValues);
    }

    async function handleSave() {
        if (!name.trim()) {
            setFormError("Trait must have a valid name.");
            return;
        }
        if (!values.length) {
            setFormError("Trait must have at least 1 value.");
            return;
        }

        setSubmitting(true);
        const submitOk = await onSubmit({
            id: "",
            name,
            values,
        });
        if (!submitOk) {
            setFormError("Error registering new trait, please try again.");
        } else {
            clearForm();
        }
        setSubmitting(false);
    }

    useEffect(() => {
        setFormError("");
    }, [name, values, newValue]);

    return (
        <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="rounded-2xl border border-slate-850 bg-slate-900/40 p-6 space-y-4 shadow-xl overflow-hidden"
        >
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-white font-sans flex items-center gap-1.5">
                    <span>Register New Trait</span>
                </h3>
                <button
                    onClick={handleCancel}
                    className="text-slate-505 hover:text-white cursor-pointer"
                >
                    <X className="h-4 w-4" />
                </button>
            </div>

            <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider font-mono">Trait Name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="ex.: Hair Color"
                            className="w-full rounded-xl border border-slate-800 bg-slate-950/70 p-2.5 text-xs text-white placeholder-slate-600 focus:outline-hidden focus:border-indigo-500 font-bold"
                            required
                        />
                    </div>
                </div>

                <div className="space-y-2 border-t border-slate-850/50 pt-3">
                    <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wider font-mono block">Trait Values ({values.length})</span>

                    {/* Option List Table */}
                    <div className="rounded-xl border border-slate-850 bg-slate-950/40 p-1.5 max-h-48 overflow-y-auto space-y-2">
                        {values.length <= 0 && (<p className="text-xs text-slate-500 py-4 text-center italic font-semibold">No values added yet. Register values below.</p>)}
                        {values.length > 0 &&
                            values.map(value => (
                                <div key={value.key} className="flex items-center justify-between gap-3 bg-slate-900/40 border border-slate-850/65 rounded-lg p-2">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-bold text-indigo-300 truncate">{value.name}</p>
                                        <p className="text-[10px] text-slate-400 truncate">{value.description || "No description"}</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveValue(value.key)}
                                        className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-800 hover:text-red-400 cursor-pointer"
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            ))
                        }
                    </div>

                    {/* Add Option Inputs */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-end pt-2">
                        <div className="space-y-1">
                            <label className="text-[9px] font-bold text-slate-500 uppercase font-mono">Option Name <span className="text-indigo-500">(key: {newValue?.key || "None"})</span></label>
                            <input
                                type="text"
                                value={newValue?.name ?? ""}
                                onChange={(e) => handleSetValueName(e.target.value)}
                                placeholder="ex: White"
                                className="w-full rounded-lg border border-slate-850 bg-slate-955 py-1.5 px-2.5 text-[11px] text-slate-205 placeholder-slate-600"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[9px] font-bold text-slate-500 uppercase font-mono">Option Description</label>
                            <input
                                type="text"
                                value={newValue?.description ?? ""}
                                onChange={(e) => handleSetValueDescription(e.target.value)}
                                placeholder="ex: Character has white hair."
                                className="w-full rounded-lg border border-slate-850 bg-slate-955 py-1.5 px-2.5 text-[11px] text-slate-205 placeholder-slate-600"
                            />
                        </div>
                        <button
                            type="button"
                            onClick={handleSetValue}
                            className="rounded-lg bg-indigo-600 hover:bg-indigo-500 px-4 py-2 text-xs font-black text-white cursor-pointer"
                        >
                            Add Option
                        </button>
                    </div>
                </div>

                <div className="flex gap-2.5 justify-end border-t border-slate-850/50 pt-3">
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={values.length < 1 || submitting}
                        className="rounded-xl bg-indigo-650 hover:bg-indigo-600 disabled:opacity-45 border border-indigo-500/20 px-5 py-2 text-xs font-black text-white transition-all cursor-pointer shadow-md"
                    >
                        {submitting ? (
                            <div className="flex"><Loader2 className="h-4 w-4 animate-spin text-indigo-400 mr-2"/> Saving...</div>
                        ) : "Save Trait"}
                    </button>
                    <button
                        type="button"
                        onClick={handleCancel}
                        className="rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 px-4.5 py-2 text-xs font-bold text-slate-450 hover:text-white transition-all cursor-pointer"
                    >
                        Cancel
                    </button>
                </div>
            </div>

            {formError && (
                <p className="text-[11px] font-bold text-red-400 mt-2 flex items-center gap-1">
                    <AlertCircle className="h-3.5 w-3.5" />
                    <span>{formError}</span>
                </p>
            )}

        </motion.div>
    );
}