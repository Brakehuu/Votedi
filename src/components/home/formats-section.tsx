import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { Chip, ChipRow } from "@/components/content/chip";
import { FORMAT_LIST } from "@/lib/formats";

const VISUAL: Record<string, { bg: string; node: ReactNode }> = {
  quick: {
    bg: "linear-gradient(135deg,#E6F6F4,#F4FAFA)",
    node: (
      <div className="v-q">
        <div className="top">
          <span style={{ textAlign: "left", color: "var(--ink)" }}>Lẩu</span>
          <i style={{ ["--w" as string]: "86%" }} />
          <span>6</span>
        </div>
        <div>
          <span style={{ textAlign: "left", color: "var(--ink)" }}>Nướng</span>
          <i style={{ ["--w" as string]: "57%" }} />
          <span>4</span>
        </div>
        <div>
          <span style={{ textAlign: "left", color: "var(--ink)" }}>Bún bò</span>
          <i style={{ ["--w" as string]: "28%" }} />
          <span>2</span>
        </div>
      </div>
    ),
  },
  bracket: {
    bg: "linear-gradient(135deg,#DCEBFF,#EEF5FF)",
    node: (
      <div className="v-b">
        <svg viewBox="0 0 300 130" fill="none" strokeWidth="1.8" aria-hidden>
          <g fill="#fff" stroke="#9FB6BA">
            <rect x="4" y="6" width="54" height="22" rx="8" />
            <rect x="4" y="34" width="54" height="22" rx="8" />
            <rect x="4" y="74" width="54" height="22" rx="8" />
            <rect x="4" y="102" width="54" height="22" rx="8" />
          </g>
          <path d="M58 17h22v14M58 45h22V31M58 85h22v14M58 113h22V99" stroke="#0C1B20" />
          <g fill="#fff" stroke="#9FB6BA">
            <rect x="80" y="20" width="54" height="22" rx="8" />
            <rect x="80" y="88" width="54" height="22" rx="8" />
          </g>
          <path d="M134 31h22v34M134 99h22V65" stroke="#0C1B20" />
          <rect x="156" y="52" width="60" height="26" rx="13" fill="url(#homeFmtGrad)" stroke="none" />
          <path d="M178 65l4 4 8-8" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          <defs>
            <linearGradient id="homeFmtGrad" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
              <stop stopColor="#19C9A7" />
              <stop offset=".5" stopColor="#0EA5A4" />
              <stop offset="1" stopColor="#0891B2" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    ),
  },
  schedule: {
    bg: "linear-gradient(135deg,#E3F6F5,#F2FAF9)",
    node: (
      <div className="v-h" aria-hidden>
        {Array.from({ length: 15 }, (_, i) => (
          <i
            key={i}
            style={{
              background: ["#DDF7EA", "#FFF1D6", "#F1F4F4", "#DDF7EA", "#DDF7EA"][i % 5],
            }}
          />
        ))}
      </div>
    ),
  },
  swipe: {
    bg: "linear-gradient(135deg,#FFF1D6,#FFF8EA)",
    node: (
      <div className="v-s" aria-hidden>
        <div className="cd c1" />
        <div className="cd c2" />
        <div className="cd c3">Bún bò Huế</div>
        <span className="tag" style={{ color: "#096965", borderColor: "#096965" }}>
          THÍCH
        </span>
      </div>
    ),
  },
  ranking: {
    bg: "linear-gradient(135deg,#FFE4E6,#FFF1F2)",
    node: (
      <div className="v-r" aria-hidden>
        <div style={{ height: 80, background: "#B86E00" }}>2</div>
        <div style={{ height: 112, background: "linear-gradient(180deg,#19C9A7,#0891B2)" }}>1</div>
        <div style={{ height: 58, background: "#3F5358" }}>3</div>
      </div>
    ),
  },
  rating: {
    bg: "linear-gradient(135deg,#FFF6E0,#FFFBF0)",
    node: (
      <div className="v-t" aria-hidden>
        <div className="stars">
          {Array.from({ length: 4 }, (_, i) => (
            <svg key={i} viewBox="0 0 24 24">
              <path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z" />
            </svg>
          ))}
          <svg className="h" viewBox="0 0 24 24">
            <path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z" />
          </svg>
        </div>
        <b>4,6</b>
        <small>12 lượt chấm · 2 giám khảo</small>
      </div>
    ),
  },
};

export function FormatsSection() {
  const formats = FORMAT_LIST.filter((f) => f.available);
  return (
    <section className="sec wrap" id="kieu-vote">
      <div className="sec-h rv">
        <ChipRow>
          <Chip>6 kiểu vote</Chip>
        </ChipRow>
        <h2>
          Mỗi việc một kiểu vote, <em>đúng cách nhóm cần</em>
        </h2>
        <p>
          Không phải việc nào cũng hợp với &quot;bình chọn một lựa chọn&quot;. Chọn kiểu vote hợp với việc bạn cần chốt.
        </p>
      </div>
      <div className="fmts">
        {formats.map((f) => {
          const vis = VISUAL[f.id] ?? VISUAL.quick;
          const Icon = f.icon;
          return (
            <Link key={f.id} href={`/kieu-vote/${f.slug}`} className="fmt rv">
              <div className="fv" style={{ background: vis.bg }} aria-hidden>
                {vis.node}
              </div>
              <div className="fb">
                <div className="t">
                  <span className="ic">
                    <Icon width={19} height={19} strokeWidth={1.9} aria-hidden />
                  </span>
                  <h3>{f.name}</h3>
                </div>
                <p>{f.description}</p>
                <p className="use">
                  <b>Dùng cho:</b> {f.useFor}
                </p>
                <span className="go">
                  Xem kiểu vote <ArrowRight width={16} height={16} strokeWidth={1.9} aria-hidden />
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
