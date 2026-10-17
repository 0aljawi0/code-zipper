import { RecommendedScanSettings, ScanSettings } from "@/types";
import { invoke } from "@tauri-apps/api/core";
import { RotateCcw, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { Switch } from "./ui/switch";
import { Button } from "./ui/button";

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    settings: ScanSettings;
    onSave: (next: ScanSettings) => void;
    onReset: () => void;
};

function normalizeExt(v: string) {
    return v.trim().replace(/^\.+/, "").toLowerCase();
}

function ChipInput({ values, onChange, placeholder, mode, helperText }: {
    values: string[];
    onChange: (next: string[]) => void;
    placeholder?: string;
    mode: "folder" | "extension";
    helperText?: string;
}) {
    const [draft, setDraft] = useState("");

    const commit = (raw: string) => {
        const parts = raw
            .split(/[,\n]/)
            .map((p) => (mode === "extension" ? normalizeExt(p) : p.trim()))
            .filter(Boolean);
        if (parts.length === 0) return;
        const next = [...values];
        for (const p of parts) {
            if (!next.some((v) => v.toLowerCase() === p.toLowerCase())) next.push(p);
        }
        onChange(next);
        setDraft("");
    };

    return (
        <div className="rounded-md border bg-muted/30 p-2">
            <div className="flex flex-wrap items-center gap-1.5">
                {values.map((v) => (
                    <span
                        key={v}
                        className="inline-flex items-center gap-1 rounded-sm bg-secondary px-2 py-0.5 text-xs text-secondary-foreground"
                    >
                        {v}
                        <button
                            type="button"
                            onClick={() => onChange(values.filter((x) => x !== v))}
                            className="hover:text-destructive"
                        >
                            <X className="size-3" />
                        </button>
                    </span>
                ))}


                <input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === ",") {
                            e.preventDefault();
                            commit(draft);
                        } else if (e.key === "Backspace" && !draft && values.length) {
                            onChange(values.slice(0, -1));
                        }
                    }}
                    onPaste={(e) => {
                        const text = e.clipboardData.getData("text");
                        if (/[,\n]/.test(text)) {
                            e.preventDefault();
                            commit(text);
                        }
                    }}
                    onBlur={() => draft && commit(draft)}
                    placeholder={values.length === 0 ? placeholder : ""}
                    className="min-w-[140px] flex-1 bg-transparent px-1 py-0.5 text-sm outline-none"
                />
            </div>

            {helperText && (
                <p className="mt-1 px-1 text-[11px] text-muted-foreground">{helperText}</p>
            )}
        </div>
    )
}

export function SettingsDialog({
    open,
    onOpenChange,
    settings,
    onSave,
    onReset
}: Props) {
    const [draft, setDraft] = useState<ScanSettings>(settings);
    const [recommended, setRecommended] = useState<RecommendedScanSettings>({
        folders: [],
        extensions: [],
    });

    useEffect(() => {
        if (open) setDraft(settings);
    }, [open, settings]);

    useEffect(() => {
        invoke<RecommendedScanSettings>("get_recommended_scan_settings")
            .then(setRecommended)
            .catch(() => { });
    }, []);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[85vh] max-w-2xl overflow-hidden p-0">
                <div className="flex max-h-[85vh] flex-col">
                    <DialogHeader className="border-b px-6 py-4">
                        <DialogTitle>CodeZipper settings</DialogTitle>
                        <DialogDescription>
                            Applied to folder scans. Existing file queue is not affected.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-4">
                        {/* Excluded folders */}
                        <section className="space-y-3">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-sm font-medium">Excluded folders</h3>
                                    <p className="text-xs text-muted-foreground">
                                        Skipped during directory traversal.
                                    </p>
                                </div>

                                <Switch
                                    checked={draft.useRecommendedFolders}
                                    onCheckedChange={v =>
                                        setDraft(d => ({ ...d, useRecommendedFolders: v }))
                                    }
                                />
                            </div>

                            {draft.useRecommendedFolders && recommended.folders.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 rounded-md border bg-muted/20 p-2">
                                    {recommended.folders.map((f) => (
                                        <span
                                            key={f}
                                            className="rounded-sm bg-secondary px-2 py-0.5 font-mono text-[11px]"
                                        >
                                            {f}
                                        </span>
                                    ))}
                                </div>
                            )}

                            <ChipInput
                                mode="folder"
                                values={draft.extraExcludedFolders}
                                onChange={(v) =>
                                    setDraft((d) => ({ ...d, extraExcludedFolders: v }))
                                }
                                placeholder="Add folder name — e.g. coverage, .terraform"
                                helperText="Press Enter or comma to add. Wildcards like *.egg-info are supported."
                            />
                        </section>

                        {/* Included extensions */}
                        <section className="space-y-3">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-sm font-medium">Included file types</h3>
                                    <p className="text-xs text-muted-foreground">
                                        Only files with these extensions will be queued.
                                    </p>
                                </div>

                                <Switch
                                    checked={draft.useRecommendedExtensions}
                                    onCheckedChange={(v) =>
                                        setDraft((d) => ({ ...d, useRecommendedExtensions: v }))
                                    }
                                />
                            </div>

                            {draft.useRecommendedExtensions && recommended.extensions.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 rounded-md border bg-muted/20 p-2">
                                    {recommended.extensions.map((e) => (
                                        <span
                                            key={e}
                                            className="rounded-sm bg-secondary px-2 py-0.5 font-mono text-[11px]"
                                        >
                                            .{e}
                                        </span>
                                    ))}
                                </div>
                            )}

                            <ChipInput
                                mode="extension"
                                values={draft.extraIncludedExtensions}
                                onChange={(v) =>
                                    setDraft((d) => ({ ...d, extraIncludedExtensions: v }))
                                }
                                placeholder="Add extension — e.g. ex, exs, pas"
                                helperText="Case-insensitive. Leading dots are stripped automatically."
                            />
                        </section>
                    </div>

                    <DialogFooter className="items-center border-t px-6 py-3 sm:justify-between">
                        <Button
                            variant="ghost"
                            onClick={() =>
                                setDraft({
                                    useRecommendedFolders: true,
                                    useRecommendedExtensions: true,
                                    extraExcludedFolders: [],
                                    extraIncludedExtensions: [],
                                })
                            }
                        >
                            <RotateCcw className="size-4" />
                            Reset
                        </Button>

                        <div className="flex gap-2">
                            <Button variant="ghost" onClick={() => onOpenChange(false)}>
                                Cancel
                            </Button>
                            <Button
                                onClick={() => {
                                    onSave(draft);
                                    onOpenChange(false);
                                    onReset; // no-op, kept for API compat
                                }}
                            >
                                Save
                            </Button>
                        </div>
                    </DialogFooter>
                </div>
            </DialogContent>
        </Dialog>
    )
}