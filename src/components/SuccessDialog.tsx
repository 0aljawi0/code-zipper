import { revealItemInDir } from "@tauri-apps/plugin-opener";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { CheckCircle2, FolderOpen } from "lucide-react";
import { Button } from "./ui/button";

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    outputPath: string;
};

export function SuccessDialog({ open, onOpenChange, outputPath }: Props) {
    const reveal = async () => {
        try {
            await revealItemInDir(outputPath);
            onOpenChange(false);
        } catch (e) {
            console.error("Failed to reveal output:", e);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <div className="mb-2 flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <CheckCircle2 className="size-6" />
                    </div>
                    <DialogTitle>Export complete</DialogTitle>
                    <DialogDescription className="break-all">{outputPath}</DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Close
                    </Button>
                    <Button onClick={reveal}>
                        <FolderOpen className="size-4" />
                        Go to folder
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}