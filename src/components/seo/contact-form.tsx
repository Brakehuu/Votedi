"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";

export function ContactForm() {
  const search = useSearchParams();
  const presetMessage = search.get("message") ?? "";
  const digest = search.get("digest") ?? "";
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    setBusy(true);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: String(data.get("name") ?? ""),
          email: String(data.get("email") ?? ""),
          message: String(data.get("message") ?? ""),
          company: String(data.get("company") ?? ""), // honeypot
          page: digest ? `/lien-he?digest=${digest}` : "/lien-he",
        }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) {
        toast.error(json.error ?? "Gửi chưa được. Thử lại sau.");
        return;
      }
      setDone(true);
      form.reset();
      toast.success("Đã gửi góp ý. Cảm ơn bạn!");
    } catch {
      toast.error("Mất mạng. Thử lại nhé.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="glass rounded-[22px] p-6 text-center">
        <p className="text-lg font-extrabold">Đã nhận góp ý</p>
        <p className="mt-1 text-sm text-muted-foreground">Cảm ơn bạn đã giúp Vote Đi tốt hơn.</p>
        <button type="button" className="btn btn-g mt-4" onClick={() => setDone(false)}>
          Gửi thêm
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="glass space-y-4 rounded-[22px] p-5">
      <input
        type="text"
        name="company"
        tabIndex={-1}
        autoComplete="off"
        className="absolute left-[-9999px] h-0 w-0 opacity-0"
        aria-hidden
      />
      {digest ? (
        <p className="rounded-xl bg-muted px-3 py-2 font-mono text-xs break-all">Digest: {digest}</p>
      ) : null}
      <label className="block space-y-1.5">
        <span className="text-sm font-semibold">Tên</span>
        <input name="name" required maxLength={80} className="h-11 w-full rounded-xl border border-input bg-card px-3" />
      </label>
      <label className="block space-y-1.5">
        <span className="text-sm font-semibold">Email</span>
        <input
          name="email"
          type="email"
          required
          maxLength={120}
          className="h-11 w-full rounded-xl border border-input bg-card px-3"
        />
      </label>
      <label className="block space-y-1.5">
        <span className="text-sm font-semibold">Nội dung</span>
        <textarea
          name="message"
          required
          maxLength={2000}
          rows={5}
          defaultValue={presetMessage}
          className="w-full resize-none rounded-xl border border-input bg-card px-3 py-2"
        />
      </label>
      <button type="submit" className="btn btn-primary w-full min-h-11" disabled={busy}>
        {busy ? "Đang gửi…" : "Gửi góp ý"}
      </button>
      <p className="text-center text-xs text-muted-foreground">Tối đa 3 lần / giờ để chống spam.</p>
    </form>
  );
}
