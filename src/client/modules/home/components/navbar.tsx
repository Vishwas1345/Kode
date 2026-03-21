"use client";

import Link from "next/link";
import { SignedIn, SignedOut, SignInButton, SignUpButton } from "@clerk/nextjs";
import { BlocksIcon } from "lucide-react";

import { cn } from "@/server/lib/utils";
import { useScroll } from "@/client/hooks/use-scroll";
import { Button } from "@/client/components/ui/button";
import { UserControl } from "@/client/components/user-control";

export const Navbar = () => {
  const isScrolled = useScroll();

  return (
    <nav
      className={cn(
        "px-6 py-4 bg-[#0A0A0A] fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b border-[#1F1F1F]",
        isScrolled && "shadow-md shadow-black/50"
      )}
    >
      <div className="max-w-7xl mx-auto w-full flex justify-between items-center">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-3 transition-opacity hover:opacity-80">
            <div className="flex items-center justify-center p-1.5 rounded-lg bg-[#111111] border border-[#1F1F1F] shadow-[0_0_15px_rgba(0,255,136,0.15)]">
              <BlocksIcon className="size-5 text-[#00FF88]" />
            </div>
            <span className="text-xl font-bold text-white tracking-tight">Kode</span>
          </Link>
        </div>

        <div className="flex items-center gap-6">
          <SignedOut>
            <SignInButton>
              <Button variant="ghost" className="text-white hover:text-[#00FF88] hover:bg-transparent transition-colors font-medium">
                Log in
              </Button>
            </SignInButton>
            <SignUpButton>
              <Button className="bg-[#00FF88] text-black hover:bg-[#00CC6A] hover:shadow-[0_0_20px_rgba(0,255,136,0.4)] transition-all duration-300 font-semibold tracking-wide rounded-xl">
                Sign up
              </Button>
            </SignUpButton>
          </SignedOut>

          <SignedIn>
            <div className="flex items-center gap-4">
              <UserControl showName={false} />
            </div>
          </SignedIn>
        </div>
      </div>
    </nav>
  );
};
