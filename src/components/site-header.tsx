"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Logo } from "@/components/brand/Logo";

const LINKS = [
  { href: "/#cach-hoat-dong", label: "Cách hoạt động" },
  { href: "/#che-do", label: "Chế độ đấu" },
  { href: "/#tinh-nang", label: "Tính năng" },
  { href: "/#hoi-dap", label: "Hỏi đáp" },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
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

  function close() {
    setOpen(false);
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
              {LINKS.map((link) => (
                <Link key={link.href} href={link.href}>
                  {link.label}
                </Link>
              ))}
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
        <nav>
          {LINKS.map((link) => (
            <Link key={link.href} href={link.href} onClick={close}>
              {link.label}
            </Link>
          ))}
          <Link href="/phong-cua-toi" onClick={close}>
            Phòng của tôi
          </Link>
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
