import { invoke } from "@tauri-apps/api/core";
import { open, save } from "@tauri-apps/plugin-dialog";
import { desktopDir, join } from "@tauri-apps/api/path";
import { useCallback, useState } from "react";
import { useSettings } from "@/hooks/useSettings";
import { FileEntry } from "@/types";
import { Button } from "@/components/ui/button";
import { FilePlus2, FolderPlus, Play, Settings2, Trash2 } from "lucide-react";
import { FileTreeTable } from "@/components/FileTreeTable";
import { Input } from "@/components/ui/input";
import { SettingsDialog } from "@/components/SettingsDialog";
import { SuccessDialog } from "@/components/SuccessDialog";

function baseName(p: string): string {
    const parts = p.split(/[/\\]/).filter(Boolean);
    return parts[parts.length - 1] || "";
}

async function suggestOutputPath(sourceName: string): Promise<string> {
    const name = sourceName || "codezipper";
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const stamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(
        now.getDate()
    )}_${pad(now.getHours())}-${pad(now.getMinutes())}`;
    const file = `${name}_${stamp}.pdf`;
    try {
        const desktop = await desktopDir();
        return await join(desktop, file);
    } catch {
        return file;
    }
}

export function CodeZipper() {
    const [files, setFiles] = useState<FileEntry[]>([]);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [sourceName, setSourceName] = useState("");
    const [outputPath, setOutputPath] = useState("");
    const [busy, setBusy] = useState(false);
    const [scanning, setScanning] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [successOpen, setSuccessOpen] = useState(false);

    const { settings, setSettings, reset } = useSettings();

    const mergeFiles = useCallback((incoming: FileEntry[]) => {

        setFiles((prev) => {
            const seen = new Set(prev.map((f) => f.path));
            const merged = [...prev];
            for (const e of incoming) {
                if (!seen.has(e.path)) {
                    merged.push(e);
                    seen.add(e.path);
                }
            }
            return merged;
        });

        setSelected((prev) => {
            const next = new Set(prev);
            for (const e of incoming) next.add(e.path);
            return next;
        });
    }, []);

    const addFiles = async () => {
        setError(null);
        try {
            const picked = await open({ multiple: true, title: "Select source files" });
            if (!picked) return;
            const paths = Array.isArray(picked) ? picked : [picked];
            const entries: FileEntry[] = [];
            for (const p of paths) {
                const fe = await invoke<FileEntry | null>("file_entry", { path: p });
                if (fe) entries.push(fe);
            }
            mergeFiles(entries);

            if (!sourceName && entries.length > 0) {
                const name = baseName(entries[0].path.replace(/[/\\][^/\\]+$/, ""));
                const finalName = name || "codezipper";
                setSourceName(finalName);
                setOutputPath(await suggestOutputPath(finalName));
            }
        } catch (e) {
            setError(String(e));
        }
    };

    const addFolder = async () => {
        setError(null);
        setScanning(true);
        try {
            const picked = await open({ directory: true, title: "Select source folder" });
            if (!picked || Array.isArray(picked)) return;
            const entries = await invoke<FileEntry[]>("scan_folder", {
                root: picked,
                options: {
                    useRecommendedFolders: settings.useRecommendedFolders,
                    useRecommendedExtensions: settings.useRecommendedExtensions,
                    extraExcludedFolders: settings.extraExcludedFolders,
                    extraIncludedExtensions: settings.extraIncludedExtensions,
                },
            });
            mergeFiles(entries);

            const name = baseName(picked) || "codezipper";
            setSourceName(name);
            setOutputPath(await suggestOutputPath(name));
        } catch (e) {
            setError(String(e));
        } finally {
            setScanning(false);
        }
    };

    const clearAll = () => {
        setFiles([]);
        setSelected(new Set());
        setSourceName("");
        setOutputPath("");
        setError(null);
    };

    const browseOutput = async () => {
        const path = await save({
            title: "Save PDF as",
            defaultPath: outputPath || "codezipper.pdf",
            filters: [{ name: "PDF document", extensions: ["pdf"] }],
        });
        if (path) setOutputPath(path);
    };

    const runExport = async () => {
        setError(null);
        const toExport = files.filter((f) => selected.has(f.path));
        if (toExport.length === 0) {
            setError("Select at least one file to export.");
            return;
        }
        let target = outputPath.trim();
        if (!target) {
            target = await suggestOutputPath(sourceName || "codezipper");
            setOutputPath(target);
        }
        if (!target.toLowerCase().endsWith(".pdf")) target += ".pdf";

        setBusy(true);
        try {
            await invoke("generate_pdf_cmd", {
                output: target,
                files: toExport.map((f) => f.path),
            });
            setOutputPath(target);
            setSuccessOpen(true);
        } catch (e) {
            setError(String(e));
        } finally {
            setBusy(false);
        }
    };

    const disabled = busy || files.length === 0;

    return (
        <div className="flex h-full flex-col gap-3 p-5">
            {/* Toolbar */}
            <div className="flex items-center gap-2">
                <Button variant="outline" onClick={addFiles} disabled={scanning}>
                    <FilePlus2 className="size-4" />
                    Add files
                </Button>
                <Button variant="outline" onClick={addFolder} disabled={scanning}>
                    <FolderPlus className="size-4" />
                    {scanning ? "Scanning…" : "Add folder"}
                </Button>

                <span className="ml-2 text-xs text-muted-foreground">
                    {selected.size} of {files.length} file{files.length === 1 ? "" : "s"} selected
                </span>

                <div className="ml-auto flex items-center gap-1">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setSettingsOpen(true)}
                        title="Scan settings"
                    >
                        <Settings2 className="size-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={clearAll}
                        disabled={files.length === 0}
                        title="Clear queue"
                    >
                        <Trash2 className="size-4" />
                    </Button>
                </div>
            </div>

            {/* File tree */}
            <div className="min-h-0 flex-1">
                <FileTreeTable
                    files={files}
                    selected={selected}
                    onSelectionChange={setSelected}
                />
            </div>

            {/* Output */}
            <div className="flex items-center gap-2">
                <span className="shrink-0 text-sm font-medium text-muted-foreground">Output</span>
                <Input
                    value={outputPath}
                    onChange={(e) => setOutputPath(e.target.value)}
                    placeholder="Auto-filled from the scanned folder — or click Browse"
                    className="flex-1"
                />
                <Button variant="outline" onClick={browseOutput}>
                    Browse
                </Button>
                <Button onClick={runExport} disabled={disabled}>
                    <Play className="size-4" />
                    {busy ? "Exporting…" : "Export"}
                </Button>
            </div>

            {error && (
                <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {error}
                </div>
            )}

            <SettingsDialog
                open={settingsOpen}
                onOpenChange={setSettingsOpen}
                settings={settings}
                onSave={setSettings}
                onReset={reset}
            />
            <SuccessDialog
                open={successOpen}
                onOpenChange={setSuccessOpen}
                outputPath={outputPath}
            />
        </div>
    )
}