import BottomNav from "@/components/BottomNav";
import FloatingAddButton from "@/components/FloatingAddButton";

export default function AppFrame({ children, showFab = true }: { children: React.ReactNode; showFab?: boolean }) {
  return (
    <main className="app-shell">
      <div className="app-content">{children}</div>
      {showFab && <FloatingAddButton />}
      <BottomNav />
    </main>
  );
}
