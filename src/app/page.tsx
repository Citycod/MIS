import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/server/security/auth";

export default async function HomePage() {
  const session = await getCurrentSession();

  if (!session) {
    redirect("/login");
  }

  if (session.user.role === "REGIONAL_MANAGER") {
    redirect("/regional/dashboard");
  } else {
    redirect("/ro/dashboard");
  }
}
