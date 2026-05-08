import { Link, useRouter } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

export function AppHeader({ showBack = true, showLogout = false }: { showBack?: boolean; showLogout?: boolean }) {
  const router = useRouter();
  const { signOut } = useAuth();
  return (
    <header className="bg-header text-header-foreground h-14 flex items-center justify-between px-4 shadow-md">
      {showBack ? (
        <button
          aria-label="Back"
          onClick={() => router.history.back()}
          className="p-1 rounded-full hover:bg-white/15 transition"
        >
          <ArrowLeft size={22} />
        </button>
      ) : (
        <span />
      )}
      {showLogout ? (
        <button
          onClick={async () => {
            await signOut();
            router.navigate({ to: "/" });
          }}
          className="font-medium hover:underline"
        >
          Logout
        </button>
      ) : (
        <Link to="/" className="sr-only">Home</Link>
      )}
    </header>
  );
}
