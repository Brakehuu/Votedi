const USES = [
  "👕 Áo team",
  "🎓 Áo lớp",
  "✏️ Logo",
  "🎁 Quà cưới",
  "🍜 Menu quán",
  "🏷️ Tên thương hiệu",
  "🖼️ Poster",
  "📦 Bao bì",
  "🎨 Màu sơn nhà",
];

export function UsesMarquee() {
  return (
    <div className="uses">
      <p>Dùng để chốt đủ thứ trong nhóm</p>
      <div className="marquee">
        <div className="track">
          {[...USES, ...USES].map((item, index) => (
            <span key={`${item}-${index}`}>{item}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
