import Link from "next/link";
import { CreditCard, Globe, Home, LogOut, Users } from "lucide-react";
import { Wordmark } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/cn";

type Props = {
  user: { login: string; name: string | null; avatar: string };
  planName: string | null;
  planNote: string | null;
  showTeam: boolean;
  /** Pays for a plan themselves, so there's a billing page to open. */
  paysOwn?: boolean;
};

function Row({
  href,
  icon: Icon,
  label,
  active,
  plain,
}: {
  href: string;
  icon: typeof Home;
  label: string;
  active?: boolean;
  /** A route that redirects off-site — a plain link, not a client-side one. */
  plain?: boolean;
}) {
  const className = cn(
    "flex h-[28px] items-center gap-2 rounded-sm px-2 text-[14px]",
    "transition-[background] duration-[20ms] ease-in",
    active ? "bg-active font-medium text-primary" : "text-secondary hover:bg-hover",
  );
  const inner = (
    <>
      <Icon className="size-4 shrink-0 text-tertiary" />
      <span className="truncate">{label}</span>
    </>
  );
  return plain ? (
    <a href={href} className={className}>
      {inner}
    </a>
  ) : (
    <Link href={href} className={className}>
      {inner}
    </Link>
  );
}

/** Notion's sidebar: the places you go, then who you are at the bottom. */
export function DashboardSidebar({ user, planName, planNote, showTeam, paysOwn }: Props) {
  return (
    <aside className="hidden w-60 shrink-0 flex-col bg-sidebar md:flex">
      <div className="flex items-center px-2 pt-2.5 pb-2">
        <Link href="/dashboard" aria-label="Codarc home" className="notion-hover px-1 py-0.5">
          <Wordmark size="sm" />
        </Link>
        <span className="ml-auto">
          <ThemeToggle />
        </span>
      </div>

      <nav className="space-y-px px-2 pt-1">
        <Row href="/dashboard" icon={Home} label="Home" active />
        {showTeam && <Row href="/team" icon={Users} label="Your team" />}
        {paysOwn ? (
          <Row href="/api/billing/portal" icon={CreditCard} label="Billing" plain />
        ) : (
          <Row
            href={`/choose?back=${encodeURIComponent("/dashboard")}`}
            icon={CreditCard}
            label={planName ? "Plans" : "Choose a plan"}
          />
        )}
        <Row href="/?site" icon={Globe} label="Codarc website" />
      </nav>

      <div className="mt-auto pb-2">
        {planName && (
          <div className="px-4 pb-1 text-[11px] leading-[1.6] text-tertiary">
            <span className="font-medium text-secondary">{planName}</span>
            {planNote && <> · {planNote}</>}
          </div>
        )}
        <div className="reveal-parent mx-2 flex items-center gap-2 rounded-sm px-2 py-1.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={user.avatar} alt="" width={20} height={20} className="size-5 shrink-0 rounded-full" />
          <span className="min-w-0 flex-1 truncate text-[12.5px] text-secondary">
            {user.name || user.login}
          </span>
          <a
            href="/api/auth/signout?back=/"
            className="reveal grid size-6 shrink-0 place-items-center rounded-sm text-tertiary hover:bg-hover"
            aria-label="Sign out"
            title="Sign out"
          >
            <LogOut className="size-3.5" />
          </a>
        </div>
      </div>
    </aside>
  );
}

/** Below tablet width the sidebar folds into a single bar. */
export function DashboardTopBar({ user, showTeam }: Pick<Props, "user" | "showTeam">) {
  return (
    <header className="flex h-12 items-center gap-1 px-4 md:hidden">
      <Link href="/dashboard" aria-label="Codarc home">
        <Wordmark size="sm" />
      </Link>
      <div className="ml-auto flex items-center gap-1">
        {showTeam && (
          <Link href="/team" className="notion-hover px-2 py-1 text-[13px] text-secondary">
            Team
          </Link>
        )}
        <ThemeToggle />
        <a
          href="/api/auth/signout?back=/"
          aria-label="Sign out"
          title="Sign out"
          className="grid size-7 place-items-center rounded-sm text-tertiary hover:bg-hover"
        >
          <LogOut className="size-4" />
        </a>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={user.avatar} alt="" width={24} height={24} className="ml-1 size-6 rounded-full" />
      </div>
    </header>
  );
}
