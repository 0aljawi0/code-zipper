import { useCallback, useEffect, useState } from "react";


export type ThemeMode = "light" | "dark" | "system"
const STORAGE_KEY = "codezipper.theme";

export function useTheme() {
    const [mode, setMode] = useState<ThemeMode>(() => {
        if (typeof window === "undefined") return "system";
        return (localStorage.getItem(STORAGE_KEY) as ThemeMode | null) ?? "system";
    });

    useEffect(() => {
        const root = document.documentElement;
        const mql = window.matchMedia('(prefers-color-scheme: dark)');

        const apply = () => {
            const isDark = mode === "dark" || (mode === "system" && mql.matches);
            root.classList.toggle("dark", isDark);
            root.style.colorScheme = isDark ? "dark" : "light";
        }

        apply();
        localStorage.setItem(STORAGE_KEY, mode);

        if (mode === "system") {
            mql.addEventListener("change", apply);
            return () => mql.removeEventListener("change", apply);
        }
    }, [mode]);

    const cycle = useCallback(() => {
        setMode(m => (m === "light" ? "dark" : m === "dark" ? "system" : "light"));
    }, []);

    return { mode, setMode, cycle };
}