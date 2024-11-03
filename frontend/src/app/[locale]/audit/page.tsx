import { Metadata } from "next";
import AuditUI from "@/components/audit/AuditUI";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Auditoría de Transacciones | CLPD",
  description: "Visualiza y audita tus transacciones de CLPD"
};

export default function AuditPage() {
  return (
    <main className="min-h-screen max-w-screen bg-white text-black">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <AuditUI />
      </div>
      <Footer />
    </main>
  );
}