import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/server/security/auth";

export default async function HomePage() {
  const session = await getCurrentSession();

  if (!session) {
    redirect("/login");
  }

  if (session.user.role === "REGIONAL_MANAGER") {
    redirect("/regional/dashboard?source=financial-sample");
  } else {
    redirect("/ro/dashboard?source=financial-sample");
  }
}
