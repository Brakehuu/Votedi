import {
  Building2,
  CalendarDays,
  Camera,
  Globe2,
  Home,
  MapPin,
  Shirt,
  Star,
  UtensilsCrossed,
} from "lucide-react";

const USES = [
  { label: "Áo lớp, áo team", Icon: Shirt },
  { label: "Đi đâu chơi cuối tuần", Icon: MapPin },
  { label: "Ngày họp lớp", Icon: CalendarDays },
  { label: "Hôm nay ăn gì", Icon: UtensilsCrossed },
  { label: "Chuyến du lịch", Icon: Globe2 },
  { label: "Logo, tên thương hiệu", Icon: Star },
  { label: "Đặt tên cho bé", Icon: Home },
  { label: "Cuộc thi ảnh", Icon: Camera },
  { label: "Teambuilding", Icon: Building2 },
] as const;

export function UsesMarquee() {
  const items = [...USES, ...USES];
  return (
    <div className="wrap uses rv">
      <p>Dùng để chốt đủ thứ trong nhóm</p>
      <div className="marquee" aria-hidden>
        <div className="track">
          {items.map((item, index) => (
            <span key={`${item.label}-${index}`}>
              <item.Icon className="ico" width={17} height={17} strokeWidth={1.9} />
              {item.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
