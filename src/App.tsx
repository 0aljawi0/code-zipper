import { TitleBar } from "./components/TitleBar";
import { CodeZipper } from "./pages/CodeZipper";

export default function App() {
  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-background text-foreground">
      <TitleBar />
      <main className="min-h-0 flex-1 overflow-hidden">
        <CodeZipper />
      </main>
    </div>
  );
}
