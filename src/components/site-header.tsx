"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  DoorOpen,
  Info,
  Layers,
  LayoutTemplate,
  Moon,
  PenLine,
  type LucideIcon,
} from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { FORMAT_LIST } from "@/lib/formats";

const FORMATS = FORMAT_LIST.filter((f) => f.available);

const EXPLORE: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/mau", label: "Mẫu có sẵn", icon: LayoutTemplate },
  { href: "/kieu-vote", label: "Kiểu vote", icon: Layers },
  { href: "/huong-dan", label: "Hướng dẫn", icon: BookOpen },
  { href: "/blog", label: "Blog", icon: PenLine },
  { href: "/gioi-thieu", label: "Giới thiệu", icon: Info },
];

export function SiteHeader() {
  const pathname = usePathname();
  return <SiteHeaderInner key={pathname} />;
}

function SiteHeaderInner() {
  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const createRef = useRef<HTMLDivElement>(null);
  const openBtnRef = useRef<HTMLButtonElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const { resolvedTheme, setTheme } = useTheme();
  const titleId = useId();
  const dark = resolvedTheme === "dark";

  useEffect(() => {
    let last = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      setHidden(y > last && y > 72);
      last = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!createRef.current?.contains(e.target as Node)) setCreateOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useEffect(() => {
    if (!open) return;
    const sheet = sheetRef.current;
    const focusables = () =>
      sheet
        ? ([
            ...sheet.querySelectorAll<HTMLElement>(
              'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
            ),
          ].filter((el) => !el.hasAttribute("disabled") && el.offsetParent !== null))
        : [];

    closeBtnRef.current?.focus();

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
        queueMicrotask(() => openBtnRef.current?.focus());
        return;
      }
      if (e.key !== "Tab") return;
      const list = focusables();
      if (!list.length) return;
      const first = list[0]!;
      const last = list[list.length - 1]!;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  function close() {
    setOpen(false);
    setCreateOpen(false);
    queueMicrotask(() => openBtnRef.current?.focus());
  }

  function openMenu() {
    setOpen(true);
    setCreateOpen(false);
  }

  return (
    <>
      <header className={hidden && !open ? "nav is-hidden" : "nav"}>
        <div className="wrap">
          <div className="bar glass">
            <Link href="/" aria-label="Vote Đi" onClick={close}>
              <Logo />
            </Link>
            <nav className="links" aria-label="Menu chính">
              <div className="relative" ref={createRef}>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 font-semibold"
                  aria-expanded={createOpen}
                  onClick={() => setCreateOpen((v) => !v)}
                >
                  Tạo vote <ChevronDown className="size-4 opacity-70" />
                </button>
                {createOpen ? (
                  <div className="absolute left-0 top-full z-50 mt-2 w-64 rounded-2xl border border-[var(--line)] bg-white p-2 shadow-lg dark:bg-[var(--card)]">
                    {FORMATS.map((f) => (
                      <Link
                        key={f.id}
                        href={`/tao-phong?kieu=${f.id}`}
                        prefetch={false}
                        className="block rounded-xl px-3 py-2.5 text-sm font-semibold hover:bg-muted"
                        onClick={close}
                      >
                        {f.name}
                      </Link>
                    ))}
                    <Link
                      href="/mau"
                      className="mt-1 block rounded-xl border-t border-[var(--line)] px-3 py-2.5 text-sm font-semibold text-primary"
                      onClick={close}
                    >
                      Xem tất cả mẫu
                    </Link>
                  </div>
                ) : null}
              </div>
              <Link href="/mau">Mẫu có sẵn</Link>
              <Link href="/huong-dan">Hướng dẫn</Link>
              <Link href="/blog">Blog</Link>
            </nav>
            <div className="nav-cta">
              <Link href="/phong-cua-toi" prefetch={false} className="btn btn-ghost btn-sm desk-ghost">
                Phòng của tôi
              </Link>
              <Link href="/tao-phong" prefetch={false} className="btn btn-primary btn-sm desk-create">
                Tạo phòng
              </Link>
              <button
                ref={openBtnRef}
                className="menu-btn"
                aria-label="Mở menu"
                type="button"
                aria-expanded={open}
                aria-controls="mobile-nav-drawer"
                onClick={openMenu}
              >
                <span />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div
        className={open ? "sheet-scrim open" : "sheet-scrim"}
        aria-hidden={!open}
        onClick={close}
      />
      <div
        ref={sheetRef}
        id="mobile-nav-drawer"
        className={open ? "sheet open" : "sheet"}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-hidden={!open}
        inert={!open ? true : undefined}
      >
        <div className="sheet-top">
          <Link href="/" onClick={close} aria-label="Vote Đi">
            <Logo />
          </Link>
          <span id={titleId} className="sr-only">
            Menu chính
          </span>
          <button
            ref={closeBtnRef}
            className="close"
            type="button"
            aria-label="Đóng menu"
            onClick={close}
          >
            ×
          </button>
        </div>

        <div className="sheet-scroll">
          <span className="sheet-lab">Tạo vote</span>
          <div className="sheet-fgrid">
            {FORMATS.map((f) => {
              const Icon = f.icon;
              return (
                <Link
                  key={f.id}
                  href={`/tao-phong?kieu=${f.id}`}
                  prefetch={false}
                  className="sheet-ft"
                  onClick={close}
                >
                  <span className="sheet-ft-ic" aria-hidden>
                    <Icon />
                  </span>
                  {f.name}
                </Link>
              );
            })}
          </div>
          <Link href="/mau" className="sheet-all" onClick={close}>
            Xem tất cả mẫu
            <ChevronRight aria-hidden />
          </Link>

          <span className="sheet-lab">Khám phá</span>
          {EXPLORE.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} className="sheet-row" onClick={close}>
                <Icon className="sheet-row-ic" aria-hidden />
                {item.label}
                <ChevronRight className="sheet-row-ch" aria-hidden />
              </Link>
            );
          })}

          <span className="sheet-lab">Tài khoản</span>
          <Link href="/phong-cua-toi" prefetch={false} className="sheet-row" onClick={close}>
            <DoorOpen className="sheet-row-ic" aria-hidden />
            Phòng của tôi
            <ChevronRight className="sheet-row-ch" aria-hidden />
          </Link>
        </div>

        <div className="sheet-foot">
          <button
            type="button"
            className="sheet-theme"
            role="switch"
            aria-checked={dark}
            aria-label="Giao diện tối"
            onClick={() => setTheme(dark ? "light" : "dark")}
          >
            <span>
              <Moon aria-hidden />
              Giao diện tối
            </span>
            <i className={dark ? "sheet-sw on" : "sheet-sw"} aria-hidden />
          </button>
          <Link href="/tao-phong" prefetch={false} className="btn btn-primary" onClick={close}>
            Tạo phòng miễn phí
          </Link>
        </div>
      </div>
    </>
  );
}

export function Mesh() {
  return (
    <div className="mesh" aria-hidden>
      <i />
      <i />
      <i />
      <i />
    </div>
  );
}
