import { redirect } from "next/navigation";
import { getCurrentUserServer } from "../_lib/auth-api";
import AdminClientPage from "./client";

export default async function AdminPage() {
  const user = await getCurrentUserServer();

  if (!user || (!user.is_superadmin && user.role?.name !== "Admin")) {
    redirect("/dashboard");
  }

  return <AdminClientPage />;
}
