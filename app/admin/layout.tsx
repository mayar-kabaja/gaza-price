import type { Metadata } from "next";
import Link from "next/link";
import "react-day-picker/style.css";
import "./admin.css";
import { AdminLayoutClient } from "./AdminLayoutClient";

export const metadata: Metadata = {
  title: "Admin Dashboard — Gaza Price",
  description: "Gaza Price admin dashboard",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminLayoutClient>
      {children}
    </AdminLayoutClient>
  );
}
