import type { ReactNode } from "react";
import { AuthBootstrap } from "@/components/auth-bootstrap";

export default function RoomLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <AuthBootstrap />
      {children}
    </>
  );
}
