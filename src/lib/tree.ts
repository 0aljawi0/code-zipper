import type { FileEntry } from "@/types";

export type TreeNode = {
    id: string;
    name: string;
    path: string;
    isFolder: boolean;
    size: number;
    depth: number;
    children: TreeNode[];
};

const toPosix = (p: string) => p.replace(/\\/g, "/");

/** Longest common ancestor **directory** of a set of paths. */
export function getCommonRoot(paths: string[]): string {
    if (paths.length === 0) return "";
    const split = paths.map((p) => toPosix(p).split("/"));
    const first = split[0];
    let common = 0;
    for (let i = 0; i < first.length; i++) {
        if (split.every((s) => s[i] === first[i])) common = i + 1;
        else break;
    }
    // Never include the filename in the common root
    if (common === first.length) common -= 1;
    return first.slice(0, common).join("/");
}

export function buildTree(files: FileEntry[]): TreeNode[] {
    if (files.length === 0) return [];

    const common = getCommonRoot(files.map((f) => f.path));
    const folderMap = new Map<string, TreeNode>();
    const roots: TreeNode[] = [];

    for (const file of files) {
        const norm = toPosix(file.path);
        const rel = norm.substring(common.length).replace(/^\//, "");
        const parts = rel.split("/").filter(Boolean);
        if (parts.length === 0) continue;

        let currentPath = common;
        let level = roots;
        let depth = 0;

        for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
            const isLast = i === parts.length - 1;
            currentPath = currentPath ? `${currentPath}/${part}` : part;

            if (isLast) {
                level.push({
                    id: file.path,        // original path → matches `selected` set
                    name: part,
                    path: file.path,      // original path → matches `selected` set
                    isFolder: false,
                    size: file.size,
                    depth,
                    children: [],
                });
            } else {
                let folder = folderMap.get(currentPath);
                if (!folder) {
                    folder = {
                        id: currentPath,
                        name: part,
                        path: currentPath,  // normalized, only used for expand/collapse
                        isFolder: true,
                        size: 0,
                        depth,
                        children: [],
                    };
                    folderMap.set(currentPath, folder);
                    level.push(folder);
                }
                level = folder.children;
            }
            depth++;
        }
    }

    const sort = (nodes: TreeNode[]) => {
        nodes.sort((a, b) => {
            if (a.isFolder !== b.isFolder) return a.isFolder ? -1 : 1;
            return a.name.localeCompare(b.name);
        });
        nodes.forEach((n) => sort(n.children));
    };
    sort(roots);

    return roots;
}

/** Flatten tree for rendering. `collapsed` is a set of folder paths — empty means all expanded. */
export function flattenTree(nodes: TreeNode[], collapsed: Set<string>): TreeNode[] {
    const out: TreeNode[] = [];
    const walk = (list: TreeNode[]) => {
        for (const n of list) {
            out.push(n);
            if (n.isFolder && !collapsed.has(n.path)) walk(n.children);
        }
    };
    walk(nodes);
    return out;
}

export function collectFiles(node: TreeNode): string[] {
    if (!node.isFolder) return [node.path];
    return node.children.flatMap(collectFiles);
}