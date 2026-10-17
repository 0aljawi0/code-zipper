import { DEFAULT_SCAN_SETTINGS, ScanSettings } from "@/types";
import { useEffect, useState } from "react";

const STORAGE_KEY = "codezipper.scanSettings";

function load(): ScanSettings {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return DEFAULT_SCAN_SETTINGS;

        const parsed = JSON.parse(raw) as Partial<ScanSettings>;
        return {...DEFAULT_SCAN_SETTINGS, ...parsed};
    } catch {
        return DEFAULT_SCAN_SETTINGS;
    }
}

export function useSettings() {
    const [settings, setSettings] = useState<ScanSettings>(load);

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    }, [settings]);

    const reset = () => setSettings(DEFAULT_SCAN_SETTINGS);
    return {settings, setSettings, reset};
}