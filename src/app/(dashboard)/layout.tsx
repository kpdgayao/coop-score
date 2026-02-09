import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { Toaster } from "sonner";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <Sidebar />
      <div className="lg:pl-64">
        <Header />
        <main className="p-3 sm:p-4 lg:p-6 animate-in fade-in duration-300">{children}</main>
      </div>
      <Toaster position="top-right" richColors closeButton />
    </div>
  );
}
