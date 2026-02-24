import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import SessionProvider from "@/components/SessionProvider";
import Navbar from "@/components/Navbar";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  return (
    <SessionProvider>
      <Navbar />
      <main className="container" style={{ paddingTop: "1.5rem", paddingBottom: "3rem" }}>
        {children}
      </main>
    </SessionProvider>
  );
}
