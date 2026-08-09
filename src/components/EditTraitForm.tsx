import { Trait, TraitValue } from "@shared/types";
import { toSlug } from "@shared/utils";
import { traitValueKeyExists } from "@shared/utils/trait.utils";
import { AlertCircle, Loader2, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import lodash, { update } from "lodash";

interface EditTraitFormProps {
    trait: Trait;
    onCancel: () => void;
    onUpdate: (updatedTrait: Trait) => Promise<boolean>;
}

export default function EditTraitForm({ trait, onCancel, onUpdate }: EditTraitFormProps) {
    const [name, setName] = useState<string>(trait.name);
    const [values, setValues] = useState<TraitValue[]>(trait.values);
    const [newValue, setNewValue] = useState<{ key?: string, name?: string, description?: string } | null>(null);
    const [formError, setFormError] = useState<string>("");
    const [showCancelModal, setShowCancelModal] = useState<boolean>(false);
    const [saving, setSaving] = useState<boolean>(false);
    const valuesListRef = useRef<HTMLDivElement>(null);
    const newValueInputRef = useRef<HTMLInputElement>(null);

    function handleUpdateValue(newValue: TraitValue) {
        const currentValues = [...values];
        const currentValueIndex = currentValues.findIndex(value => value.key === newValue.key);
        if (currentValueIndex < 0) {
            setFormError("Trait value not found, please refresh the traits page and try again.");
        } else {
            const newValueKey = toSlug(newValue.name);
            const keyIsValid = !traitValueKeyExists(newValueKey, currentValues.filter((_, index) => index !== currentValueIndex));
            if (!keyIsValid) {
                setFormError("Cannot have two trait values with the same name.");
            } else {
                const updatedNewValue = {
                    ...newValue,
                    key: newValueKey,
                }
                const updatedValues = currentValues.map((value, index) => index === currentValueIndex ? { ...value, ...updatedNewValue } : value);
                setValues(updatedValues);
            }
        }
    }

    function handleRemoveValue(value: TraitValue) {
        const currentValueIndex = values.findIndex(val => val.key === value.key);
        if (currentValueIndex < 0) {
            setFormError("Trait value not found, please refresh the traits page and try again.");
        } else {
            const updatedValues = values.filter(val => val.key !== value.key);
            setValues(updatedValues);
        }
    }

    function handleChangeNewValue(newValue: TraitValue) {
        setNewValue(newValue);
    }

    function clearNewValue() {
        setNewValue({});
    }

    function handleAddTraitValue(): boolean {
        if (!newValue?.name || newValue?.name?.length < 1) {
            setFormError("Cannot add trait value with empty name.");
        } else {
            const newValueKey = toSlug(newValue?.name);
            if (traitValueKeyExists(newValueKey, values)) {
                setFormError("Cannot add trait value with same name as other existing trait value.");
            } else {
                setValues([
                    ...values,
                    {
                        key: newValueKey,
                        name: newValue.name,
                        description: newValue.description
                    }
                ]);
                clearNewValue();
                return true;
            }
        }
        return false;
    }

    function handleAddTraitValueOnEnter() {
        const success = handleAddTraitValue();
        if (success && newValueInputRef.current) {
            newValueInputRef.current.focus();
        }
    }

    function handleOpenCancelModal() {
        setShowCancelModal(true);
    }

    function handleCloseCancelModal() {
        setShowCancelModal(false);
    }

    function handleCancel() {
        const updatedTrait: Trait = {
            id: trait.id,
            name,
            values
        }
        if (lodash.isEqual(trait, updatedTrait)) {
            onCancel();
        } else {
            handleOpenCancelModal();
        }
    }

    function hasEmptyTraitValue() {
        return values.some(value => value.name.trim().length < 1);
    }

    async function handleSaveTrait() {
        if (!name || name.trim().length < 1) {
            setFormError("Cannot save trait with empty name.");
            return;
        }
        if (!values || values.length < 1) {
            setFormError("Cannot save trait with no values.");
            return;
        }
        if (hasEmptyTraitValue()) {
            setFormError("Cannot save trait with an empty value name.");
            return;
        }
        setSaving(true);
        const updated = await onUpdate({
            id: trait.id,
            name,
            values
        });
        setSaving(false);
        if (updated) {
            onCancel();
        } else {
            setFormError("Cannot save trait, please refresh the page and try again.");
        }
    }

    useEffect(() => {
        setFormError("");
    }, [name, values, newValue]);

    useEffect(() => {
        if (valuesListRef.current) {
            valuesListRef.current.scrollTo({
                top: valuesListRef.current.scrollHeight,
                behavior: 'smooth',
            });
        }
    }, [values.length]);

    return (
        <div className="space-y-4">
            <div className="flex flex-col gap-2">
                <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider font-mono">Trait Name</label>
                <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-xl border border-slate-850 bg-slate-950 p-2 text-xs text-white font-black"
                    required
                />
            </div>

            <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider font-mono block">Trait Values & Descriptions</label>

                {/* Trait Values */}
                <div ref={valuesListRef} className="space-y-2.5 max-h-48 overflow-y-auto p-1.5 rounded-lg bg-slate-950/40 border border-slate-900">
                    {values.length <= 0 && (
                        <span className="text-[10px] text-slate-600 py-2 px-2 italic block text-center">No values registered for this trait yet.</span>
                    )}
                    {values.length > 0 && (
                        values.map((value, index) => (
                            <div
                                key={`edit-opt-${index}`}
                                className="flex flex-col sm:flex-row gap-2 bg-slate-900/50 p-2 border border-slate-850/60 rounded-lg items-stretch sm:items-center justify-between"
                            >
                                <div className="flex-1 space-y-1">
                                    <input
                                        type="text"
                                        value={value.name ?? ""}
                                        onChange={(e) => handleUpdateValue({ ...value, name: e.target.value })}
                                        placeholder="Option Name"
                                        className="w-full rounded bg-slate-950 px-2 py-0.5 text-[11px] font-bold text-indigo-300 focus:outline-hidden"
                                    />
                                    <input
                                        type="text"
                                        value={value.description ?? ""}
                                        onChange={(e) => handleUpdateValue({ ...value, description: e.target.value })}
                                        placeholder="Option Description"
                                        className="w-full rounded bg-slate-950 px-2 py-0.5 text-[10px] text-slate-400 focus:outline-hidden"
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={() => handleRemoveValue(value)}
                                    className="rounded p-1.5 text-red-500 hover:bg-slate-750 hover:text-red-450 self-end sm:self-center cursor-pointer"
                                    title="Remove value"
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                </button>
                            </div>
                        ))
                    )}
                </div>

                {/* Input line to append option inside working definition */}
                <div className="bg-slate-900/30 border border-slate-850/50 p-2 rounded-lg space-y-2">
                    <p className="text-[9px] font-bold text-indigo-400 uppercase font-mono">Create New Option</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input
                            ref={newValueInputRef}
                            type="text"
                            value={newValue?.name ?? ""}
                            onChange={(e) => handleChangeNewValue({
                                key: newValue?.key || "",
                                name: e.target.value,
                                description: newValue?.description || "",
                            })}
                            placeholder="Name: e.g. giant"
                            className="rounded bg-slate-950 border border-slate-850 py-1 px-2 text-[10px] text-white"
                        />
                        <input
                            type="text"
                            value={newValue?.description ?? ""}
                            onChange={(e) => handleChangeNewValue({
                                key: newValue?.key || "",
                                name: newValue?.name || "",
                                description: e.target.value
                            })}
                            onKeyDown={(e) => e.code === "Enter" ? handleAddTraitValueOnEnter() : null}
                            placeholder="Description: e.g. Exceeds heights"
                            className="rounded bg-slate-950 border border-slate-850 py-1 px-2 text-[10px] text-white"
                        />
                    </div>
                    <button
                        type="button"
                        onClick={handleAddTraitValue}
                        disabled={!newValue?.name?.trim()}
                        className="w-full rounded bg-indigo-650 hover:bg-indigo-600 disabled:opacity-40 py-1 text-[11px] font-black text-white cursor-pointer"
                    >
                        Add value
                    </button>
                </div>
            </div>

            {/* Operation Actions */}
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-900">
                <button
                    type="button"
                    onClick={handleCancel}
                    className="rounded-lg border border-slate-850 bg-slate-900/60 hover:bg-slate-800/60 px-3 py-1.5 text-xs font-bold text-slate-400 hover:text-slate-205 cursor-pointer"
                >
                    Cancel
                </button>
                <button
                    type="button"
                    disabled={saving}
                    onClick={handleSaveTrait}
                    className="rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-45 px-4.5 py-1.5 text-xs font-black text-white shadow-md shadow-indigo-600/10 cursor-pointer"
                >
                   {saving ? (
                            <div className="flex"><Loader2 className="h-4 w-4 animate-spin text-indigo-400 mr-2" /> Saving...</div>
                        ) : "Save Changes"}
                </button>
            </div>

            {/* Form Error */}
            {formError && (
                <p className="text-[11px] font-bold text-red-400 mt-2 flex items-center gap-1">
                    <AlertCircle className="h-3.5 w-3.5" />
                    <span>{formError}</span>
                </p>
            )}

            {/* Cancel Modal */}
            {showCancelModal && <CancelModal onCancelChanges={onCancel} onBack={handleCloseCancelModal} />}
        </div>
    );
}

interface CancelModalProps {
    onCancelChanges: () => void;
    onBack: () => void;
}

function CancelModal({ onCancelChanges, onBack }: CancelModalProps) {
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
                    <h3 className="text-base font-black text-white font-sans">Cancel Trait Editing?</h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                        You may have unsaved changes, are you sure you wish to cancel and close the editing form?
                    </p>
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={onBack}
                        className="flex-1 rounded-xl border border-slate-805 bg-slate-900 py-2.5 text-xs font-bold text-slate-300 hover:bg-slate-800 cursor-pointer"
                    >
                        Back
                    </button>
                    <button
                        onClick={onCancelChanges}
                        className="flex items-center justify-center flex-1 rounded-xl bg-red-800 hover:bg-red-500 disabled:opacity-45 py-2.5 text-xs font-black text-white shadow-lg shadow-red-650/15 cursor-pointer"
                    >
                        Cancel Editing
                    </button>
                </div>
            </motion.div>
        </div>
    );
}