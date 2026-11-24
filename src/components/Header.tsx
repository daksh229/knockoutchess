import Link from "next/link";
import { logout } from "@/app/actions/auth";
import { APP_NAME } from "@/lib/app";
import { getCurrentUser } from "@/lib/users";
import { Avatar } from "./Avatar";
import { buttonGhost } from "./ui";

export async function Header() {
  const user = await getCurrentUser();

  return (
    <header className="border-b border-zinc-200 bg-white/80 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/80">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between gap-4 px-4">
        <Link
          href={user ? "/tournaments" : "/"}
          className="flex items-center gap-2 font-semibold tracking-tight"
        >
          <span aria-hidden className="text-xl leading-none">
            ♞
          </span>
          {APP_NAME}
        </Link>

        {user && (
          <nav className="flex items-center gap-1 text-sm">
            <Link href="/tournaments" className={buttonGhost}>
              Tournaments
            </Link>
            <Link href="/settings" className={`${buttonGhost} gap-2`}>
              <Avatar name={user.displayName} photoUrl={user.photoUrl} size={24} />
              <span className="hidden max-w-40 truncate sm:inline">{user.displayName}</span>
            </Link>
            <form action={logout}>
              <button type="submit" className={buttonGhost}>
                Log out
              </button>
            </form>
          </nav>
        )}
      </div>
    </header>
  );
}
