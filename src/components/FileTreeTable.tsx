import { useMemo, useState } from "react";
import {
    ChevronRight,
    ChevronDown,
    Check,
    Minus,
    File as FileIcon,
    Folder,
    FolderOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { buildTree, collectFiles, flattenTree, type TreeNode } from "@/lib/tree";
import { formatSize, type FileEntry } from "@/types";

type Props = {
    files: FileEntry[];
    selected: Set<string>;
    onSelectionChange: (next: Set<string>) => void;
};

/** Plain-button checkbox — guaranteed to fire onClick, no Radix involved. */
function TreeCheckbox({
    state,
    onToggle,
    label,
}: {
    state: boolean | "indeterminate";
    onToggle: () => void;
    label: string;
}) {
    return (
        <button
            type="button"
            role="checkbox"
            aria-checked={state === "indeterminate" ? "mixed" : state}
            aria-label={label}
            onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onToggle();
            }}
            className={cn(
                "flex size-4 shrink-0 items-center justify-center rounded-lg border shadow-sm transition-colors outline-none",
                "focus-visible:ring-2 focus-visible:ring-ring/50",
                state === false
                    ? "border-input bg-transparent hover:border-ring"
                    : "border-primary bg-primary text-primary-foreground"
            )}
        >
            {state === true && <Check className="size-3" strokeWidth={3} />}
            {state === "indeterminate" && <Minus className="size-3" strokeWidth={3} />}
        </button>
    );
}

export function FileTreeTable({ files, selected, onSelectionChange }: Props) {
    const tree = useMemo(() => buildTree(files), [files]);
    // Empty = all folders expanded by default. We only track what the user CLOSED.
    const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

    const rows = useMemo(() => flattenTree(tree, collapsed), [tree, collapsed]);

    const toggleCollapsed = (path: string) => {
        setCollapsed((prev) => {
            const next = new Set(prev);
            if (next.has(path)) next.delete(path);
            else next.add(path);
            return next;
        });
    };

    const toggleFile = (path: string) => {
        const next = new Set(selected);
        if (next.has(path)) next.delete(path);
        else next.add(path);
        onSelectionChange(next);
    };

    const toggleFolder = (node: TreeNode) => {
        const descendants = collectFiles(node);
        const allSelected =
            descendants.length > 0 && descendants.every((p) => selected.has(p));
        const next = new Set(selected);
        if (allSelected) descendants.forEach((p) => next.delete(p));
        else descendants.forEach((p) => next.add(p));
        onSelectionChange(next);
    };

    const folderState = (node: TreeNode): boolean | "indeterminate" => {
        const descendants = collectFiles(node);
        if (descendants.length === 0) return false;
        const count = descendants.filter((p) => selected.has(p)).length;
        if (count === 0) return false;
        if (count === descendants.length) return true;
        return "indeterminate";
    };

    if (files.length === 0) {
        return (
            <div className="flex h-full flex-col items-center justify-center gap-3 rounded-lg border border-dashed text-muted-foreground">
                <Folder className="size-10 opacity-50" />
                <div className="text-center">
                    <p className="text-sm font-medium text-foreground">No files yet</p>
                    <p className="text-xs">Add files or scan a folder to get started.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-full flex-col overflow-hidden rounded-lg border bg-card">
            <div className="flex shrink-0 items-center gap-3 border-b bg-muted/40 px-4 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <span className="w-4" />
                <span className="w-4" />
                <span className="flex-1">Name</span>
                <span className="w-20 text-right">Size</span>
            </div>

            <div className="flex-1 overflow-auto">
                {rows.map((node) => {
                    const indent = node.depth * 16;
                    const hasChildren = node.isFolder && node.children.length > 0;
                    const isOpen = !collapsed.has(node.path);
                    const state: boolean | "indeterminate" = node.isFolder
                        ? folderState(node)
                        : selected.has(node.path);

                    return (
                        <div
                            key={node.path}
                            className={cn(
                                "group flex items-center gap-2 border-b border-border/50 px-4 py-1.5 text-sm transition-colors last:border-b-0",
                                node.depth % 2 === 1 && "bg-muted/20",
                                "hover:bg-accent/60"
                            )}
                        >
                            <div style={{ paddingLeft: indent }} className="flex items-center">
                                {hasChildren ? (
                                    <button
                                        type="button"
                                        onClick={() => toggleCollapsed(node.path)}
                                        className="grid size-5 place-items-center rounded hover:bg-accent"
                                        tabIndex={-1}
                                    >
                                        {isOpen ? (
                                            <ChevronDown className="size-3.5 text-muted-foreground" />
                                        ) : (
                                            <ChevronRight className="size-3.5 text-muted-foreground" />
                                        )}
                                    </button>
                                ) : (
                                    <span className="size-5" />
                                )}
                            </div>

                            <TreeCheckbox
                                state={state}
                                onToggle={() =>
                                    node.isFolder ? toggleFolder(node) : toggleFile(node.path)
                                }
                                label={`${node.isFolder ? "Folder" : "File"} ${node.name}`}
                            />

                            <div className="flex min-w-0 flex-1 items-center gap-2">
                                {node.isFolder ? (
                                    isOpen ? (
                                        <FolderOpen className="size-4 shrink-0 text-amber-500" />
                                    ) : (
                                        <Folder className="size-4 shrink-0 text-amber-500" />
                                    )
                                ) : (
                                    <FileIcon className="size-4 shrink-0 text-muted-foreground" />
                                )}
                                <span className={cn("truncate", node.isFolder && "font-medium")}>
                                    {node.name}
                                </span>
                            </div>

                            <span className="w-20 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                                {node.isFolder ? "" : formatSize(node.size)}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}