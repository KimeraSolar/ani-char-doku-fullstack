import { motion } from "motion/react";
import { ReactElement } from "react";

interface PopupModalProps {
    icon?: { icon: ReactElement, color: string };
    title?: string | ReactElement;
    subtitle?: string | ReactElement;
    content?: ReactElement;
    actions?: ReactElement[];
}

export default function PopupModal({ icon, title, subtitle, content, actions }: PopupModalProps) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-xs">
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 space-y-5 shadow-2xl"
            >
                {/* Icon */}
                {icon && <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-${icon.color}-500/10 text-${icon.color}-500 border border-${icon.color}-500/20`}>
                    {icon.icon}
                </div>}

                {/* Title and Subtitle */}
                { (title || subtitle) && <div className="space-y-2">
                    {title && <h3 className="text-base font-black text-white font-sans">{title}</h3>}
                    {subtitle && <p className="text-xs text-slate-400 leading-relaxed">
                        {subtitle}
                    </p>}
                </div>}

                {/* Content */}
                {content && <div className="space-y-2">
                    {content}
                </div>}

                {/* Actions */}
                {actions && actions.length > 0 && <div className="flex gap-3">
                    {actions.map(action => action)}
                </div>}
            </motion.div>
        </div>
    );
}