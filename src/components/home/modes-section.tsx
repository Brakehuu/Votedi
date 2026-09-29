export function ModesSection() {
  return (
    <section className="sec" id="che-do">
      <div className="sec-h">
        <h2>Hai kiểu đấu cho nhóm ít hay nhiều mẫu</h2>
        <p>Chủ phòng tự đặt số phiếu, thời gian mỗi vòng và số mẫu vào sơ đồ.</p>
      </div>
      <div className="modes">
        <div className="mode glass">
          <span className="tag">Nhiều mẫu, tối đa 32</span>
          <h3>Vòng loại rồi loại trực tiếp</h3>
          <p>Cả nhóm vote lọc trước, các mẫu nhiều phiếu nhất được bốc thăm vào sơ đồ.</p>
          <ul>
            <li>Mỗi người có nhiều phiếu, tùy chủ phòng đặt</li>
            <li>Hết giờ tự loại, tự bốc thăm vào nhánh</li>
          </ul>
          <div className="diagram">
            <div>
              <svg viewBox="0 0 300 110" fill="none" aria-hidden>
                <g fill="#E3F6F5" stroke="#0EA5A4" strokeWidth="1.5">
                  <rect x="4" y="8" width="22" height="22" rx="6" />
                  <rect x="32" y="8" width="22" height="22" rx="6" />
                  <rect x="60" y="8" width="22" height="22" rx="6" fill="#fff" stroke="#D8E6E6" />
                  <rect x="4" y="44" width="22" height="22" rx="6" fill="#fff" stroke="#D8E6E6" />
                  <rect x="32" y="44" width="22" height="22" rx="6" />
                  <rect x="60" y="44" width="22" height="22" rx="6" fill="#fff" stroke="#D8E6E6" />
                  <rect x="4" y="80" width="22" height="22" rx="6" />
                  <rect x="32" y="80" width="22" height="22" rx="6" fill="#fff" stroke="#D8E6E6" />
                  <rect x="60" y="80" width="22" height="22" rx="6" fill="#fff" stroke="#D8E6E6" />
                </g>
                <path d="M98 55h26" stroke="#0EA5A4" strokeWidth="2" strokeDasharray="3 4" />
                <path
                  d="M140 16h24v20h14M140 56h24V36M140 70h24v20h14M140 110h24V90M178 36h16v27h18M178 90h16V63"
                  stroke="#0C1B20"
                  strokeWidth="1.6"
                />
                <defs>
                  <linearGradient id="modeGrad1" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#19C9A7" />
                    <stop offset=".5" stopColor="#0EA5A4" />
                    <stop offset="1" stopColor="#0891B2" />
                  </linearGradient>
                </defs>
                <rect x="212" y="50" width="56" height="26" rx="13" fill="url(#modeGrad1)" />
                <path d="M232 63l4 4 8-8" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>
        </div>
        <div className="mode glass">
          <span className="tag">Ít mẫu, từ 2 đến 16</span>
          <h3>Loại trực tiếp</h3>
          <p>Bốc thăm thẳng vào sơ đồ nhánh, mỗi cặp một mẫu đi tiếp.</p>
          <ul>
            <li>Hai nhánh hội tụ về chung kết như World Cup</li>
            <li>Số mẫu lẻ thì có suất miễn đấu vòng đầu</li>
          </ul>
          <div className="diagram">
            <div>
              <svg viewBox="0 0 300 110" fill="none" strokeWidth="1.6" aria-hidden>
                <path
                  d="M8 14h30v22h18M8 58h30V36M292 14h-30v22h-18M292 58h-30V36M56 36h24v19h40M244 36h-24v19h-40"
                  stroke="#0C1B20"
                />
                <path
                  d="M8 72h30v16h18M8 104h30V88M292 72h-30v16h-18M292 104h-30V88M56 88h24V55M244 88h-24V55"
                  stroke="#D8E6E6"
                />
                <defs>
                  <linearGradient id="modeGrad2" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#19C9A7" />
                    <stop offset=".5" stopColor="#0EA5A4" />
                    <stop offset="1" stopColor="#0891B2" />
                  </linearGradient>
                </defs>
                <rect x="120" y="42" width="60" height="26" rx="13" fill="url(#modeGrad2)" />
                <path d="M142 55l4 4 8-8" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
