import type { Metadata } from "next";
import { SiteFooter } from "@/components/home/footer";
import { MyRooms } from "@/components/home/my-rooms";

export const metadata: Metadata = {
  title: "Phòng của tôi",
  description: "Các phòng bình chọn bạn đã tạo hoặc từng vào trên trình duyệt này.",
  alternates: { canonical: "/phong-cua-toi" },
};

export default function MyRoomsPage() {
  return (
    <>
      <MyRooms />
      <SiteFooter />
    </>
  );
}
