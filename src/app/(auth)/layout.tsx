import Link from "next/link";
import { Logo } from "@/components/ui/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen w-full">
      <div className="flex w-full flex-col justify-center px-6 py-12 sm:px-12 lg:w-1/2 lg:px-20">
        <Link href="/" className="mb-10">
          <Logo />
        </Link>
        <div className="mx-auto w-full max-w-sm">{children}</div>
      </div>
      <div className="relative hidden w-1/2 overflow-hidden bg-brand-black lg:block">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(124,58,237,0.35),transparent_45%),radial-gradient(circle_at_80%_70%,rgba(109,40,217,0.4),transparent_50%)]" />
        <div className="relative flex h-full flex-col justify-center px-16 text-white">
          <p className="font-display text-3xl font-bold leading-tight">
            Sell Smarter.
            <br />
            Manage Easier.
            <br />
            <span className="text-brand-purple-bright">Grow Faster.</span>
          </p>
          <p className="mt-6 max-w-sm text-white/60">
            The all-in-one cloud POS and inventory platform built for apparel,
            footwear, and modern retail businesses.
          </p>
        </div>
      </div>
    </div>
  );
}
