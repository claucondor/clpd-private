"use client";

// react
import React, { useCallback } from "react";

// next
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

// components
import { Button } from "./ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetDescription,
} from "./ui/sheet";

// translations
import { useTranslations } from "next-intl";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { LucideMenu } from "lucide-react";
import { useConnect } from "wagmi";
import { useGoogleConnect } from "@/hooks/useGoogleConnect";
import { useUserStore } from "@/context/global-store";
import { LoadingSpinner } from "./ui/spinner";

interface NavbarProps {}

const links = [
  {
    href: "/",
    label: "stableCoin",
  },
  // {
  //   href: "/earn",
  //   label: "earnWithPesos",
  // },
  // {
  //   href: "/about",
  //   label: "aboutUs",
  // },
  {
    href: "/reserve",
    label: "reserve",
  },
];

const currentPathStyle =
  "bg-white text-black h-auto px-6 py-2 text-xl rounded-xl border-2 border-black font-bold shadow-brutalist";

const Navbar: React.FC<NavbarProps> = () => {
  const t = useTranslations("navbar");
  const { handleConnect, isConnected, loadingUser } = useGoogleConnect();
  const { user } = useUserStore();
  const pathname = usePathname();
  const currentLang = pathname.startsWith("/es") ? "es" : "en";

  return (
    <nav className="bg-brand-blue px-6 py-2 lg:px-12 lg:py-4 flex justify-between items-center sticky top-0 z-50 h-auto lg:h-24 max-w-screen">
      {/* Desktop */}
      <div className="hidden md:flex flex-1 space-x-4 items-center justify-evenly font-bold font-helvetica">
        <Link href="/">
          <Image src="/images/clpa-logo-white.svg" alt="CLPD logo" width={64} height={64} />
        </Link>
        <div className="flex flex-1 space-x-4 items-center justify-evenly font-bold font-helvetica">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href === "/" ? `/${currentLang}` : `/${currentLang}${link.href}`}
              className={cn(
                pathname === (link.href === "/" ? `/${currentLang}` : `/${currentLang}${link.href}`)
                  ? currentPathStyle
                  : "text-white text-xl hover:text-blue-200"
              )}
            >
              {t(link.label)}
            </Link>
          ))}
        </div>
        {!isConnected ? (
          <Button
            onClick={handleConnect}
            className="bg-black text-white h-auto px-6 py-2 text-xl rounded-xl border-2 border-black font-bold shadow-brutalist"
          >
            {loadingUser ? "loading..." : t("login")}
          </Button>
        ) : (
          <Link
            href={`/${currentLang}/app`}
            className="bg-black text-white h-auto px-6 py-2 text-xl rounded-xl border-2 border-black font-bold shadow-brutalist"
          >
            {loadingUser ? <LoadingSpinner /> : user.name}
          </Link>
        )}
      </div>

      {/* Mobile */}
      <div className="md:hidden flex flex-1 justify-between items-center">
        <Link href="/">
          <Image src="/images/clpa-logo-white.svg" alt="CLPD logo" width={64} height={64} />
        </Link>

        <div className="flex items-center gap-2">
          {!isConnected ? (
            <Button
              onClick={handleConnect}
              className="bg-black text-white h-auto px-6 py-2 max-md:text-sm text-xl rounded-xl border-2 border-black font-bold shadow-brutalist"
            >
              {loadingUser ? "loading..." : t("login")}
            </Button>
          ) : (
            <Link href={`/${currentLang}/app`} className={currentPathStyle}>
              {loadingUser ? <LoadingSpinner /> : user.name}
            </Link>
          )}

          <Sheet>
            <SheetTrigger asChild>
              <Button className="bg-black text-white h-auto p-1.5 max-md:text-sm text-xl rounded-xl border-2 border-black font-bold shadow-brutalist">
                <LucideMenu />
              </Button>
            </SheetTrigger>
            <SheetContent
              side="bottom"
              className="bg-brand-blue border-t-2 border-x-2 border-black rounded-t-xl transition-all duration-300"
            >
              <SheetDescription className="flex flex-col gap-2 items-center justify-center">
                {links.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href === "/" ? `/${currentLang}` : `/${currentLang}${link.href}`}
                    className={cn(
                      pathname ===
                        (link.href === "/" ? `/${currentLang}` : `/${currentLang}${link.href}`)
                        ? currentPathStyle
                        : "text-white text-xl hover:text-blue-200 font-helvetica"
                    )}
                  >
                    {t(link.label)}
                  </Link>
                ))}
              </SheetDescription>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
