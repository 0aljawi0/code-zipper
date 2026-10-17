import { useTheme } from "@/hooks/useTheme";
import { getCurrentWindow } from "@tauri-apps/api/window"
import { Minus, Monitor, Moon, Square, Sun, X } from "lucide-react";
import { Button } from "./ui/button";

const win = getCurrentWindow();

export function TitleBar() {
    const { mode, cycle } = useTheme();
    const Icon = mode === "light" ? Sun : mode === "dark" ? Moon : Monitor;

    return (
        <header data-tauri-drag-region className="flex h-12 shrink-0 items-center justify-between border-b bg-transparent px-4">
            <div className="flex items-center gap-2 pl-1">
                <span className="text-sm font-semibold tracking-tight">Code Zipper</span>
            </div>

            <div className="flex items-center gap-0.5">
                <Button variant="ghost" size="icon" onClick={cycle} className="size-8" title={`Theme: ${mode}`}>
                    <Icon className="size-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => win.minimize()} className="size-8">
                    <Minus className="size-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => win.toggleMaximize()} className="size-8">
                    <Square className="size-3.5" />
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => win.close()}
                    className="size-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                >
                    <X className="size-4" />
                </Button>
            </div>
        </header>
    )
}