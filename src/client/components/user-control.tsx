"use client";

import { useEffect, useState } from "react";
import { dark } from "@clerk/themes";
import { UserButton } from "@clerk/nextjs";

import { useCurrentTheme } from "@/client/hooks/use-current-theme";

interface Props {
  showName?: boolean;
};

/**
 * Clerk's UserButton + next-themes can produce different markup on server vs client.
 * Render only after mount so SSR and the first client pass match (avoids hydration errors).
 */
export const UserControl = ({ showName }: Props) => {
  const [mounted, setMounted] = useState(false);
  const currentTheme = useCurrentTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div
        className="size-8 shrink-0 rounded-md border border-[#1F1F1F] bg-[#111111]"
        aria-hidden
      />
    );
  }

  return (
    <UserButton
      showName={showName}
      appearance={{
        elements: {
          userButtonBox: "rounded-md!",
          userButtonAvatarBox: "rounded-md! size-8!",
          userButtonTrigger: "rounded-md!"
        },
        baseTheme: currentTheme === "dark" ? dark : undefined,
      }}
    />
  );
};
