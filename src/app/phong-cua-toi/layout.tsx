import type { ReactNode } from "react";
import { AuthBootstrap } from "@/components/auth-bootstrap";

export default function MyRoomsLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <AuthBootstrap />
      {children}
    </>
  );
}
