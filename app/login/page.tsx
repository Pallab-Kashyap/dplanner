import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import LoginForm from "./LoginForm";

export default async function LoginPage() {
  const session = await getServerSession(authOptions);
  if (session?.user) redirect("/today");

  return (
    <main className="hero" style={{ minHeight: "100vh" }}>
      <div
        className="sketchy-card"
        style={{
          maxWidth: 400,
          width: "90%",
          textAlign: "center",
          padding: "2rem",
        }}
      >
        <div style={{ fontSize: "3rem", marginBottom: "0.5rem" }}>✏️</div>
        <h1 style={{ fontSize: "2.5rem", marginBottom: "0.3rem" }}>Welcome!</h1>
        <p className="text-muted" style={{ marginBottom: "1.5rem" }}>
          Sign in to start planning your day
        </p>
        <LoginForm />
      </div>
    </main>
  );
}
