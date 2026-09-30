"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";
import { ChevronDown } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { FORMAT_LIST } from "@/lib/formats";

const FORMATS = FORMAT_LIST.filter((f) => f.available);

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const createRef = useRef<HTMLDivElement>(null);
  const { resolvedTheme, setTheme } = useTheme();

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

  function close() {
    setOpen(false);
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
              <Link href="/phong-cua-toi" className="btn btn-ghost btn-sm desk-ghost">
                Phòng của tôi
              </Link>
              <Link href="/tao-phong" className="btn btn-primary btn-sm desk-create">
                Tạo phòng
              </Link>
              <button className="menu-btn" aria-label="Mở menu" type="button" onClick={() => setOpen(true)}>
                <span />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className={open ? "sheet open" : "sheet"} aria-hidden={!open} inert={!open}>
        <div className="sheet-top">
          <Link href="/" onClick={close}>
            <Logo />
          </Link>
          <button className="close" type="button" aria-label="Đóng menu" onClick={close}>
            ×
          </button>
        </div>
        <nav className="space-y-4">
          <div>
            <p className="mb-2 px-1 text-xs font-bold tracking-wide text-muted-foreground uppercase">Tạo vote</p>
            {FORMATS.map((f) => (
              <Link key={f.id} href={`/tao-phong?kieu=${f.id}`} onClick={close}>
                {f.name}
              </Link>
            ))}
            <Link href="/mau" onClick={close}>
              Xem tất cả mẫu
            </Link>
          </div>
          <div>
            <p className="mb-2 px-1 text-xs font-bold tracking-wide text-muted-foreground uppercase">Khám phá</p>
            <Link href="/mau" onClick={close}>
              Mẫu có sẵn
            </Link>
            <Link href="/kieu-vote" onClick={close}>
              Kiểu vote
            </Link>
            <Link href="/huong-dan" onClick={close}>
              Hướng dẫn
            </Link>
            <Link href="/blog" onClick={close}>
              Blog
            </Link>
            <Link href="/gioi-thieu" onClick={close}>
              Giới thiệu
            </Link>
          </div>
          <div>
            <p className="mb-2 px-1 text-xs font-bold tracking-wide text-muted-foreground uppercase">Tài khoản</p>
            <Link href="/phong-cua-toi" onClick={close}>
              Phòng của tôi
            </Link>
          </div>
        </nav>
        <button
          type="button"
          className="theme-toggle"
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
        >
          <span className="dark:hidden">Giao diện tối</span>
          <span className="hidden dark:inline">Giao diện sáng</span>
        </button>
        <Link href="/tao-phong" className="btn btn-primary" onClick={close}>
          Tạo phòng miễn phí
        </Link>
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
