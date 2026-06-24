import { redirect } from "next/navigation";
import { withAppBasePath } from "@/lib/runtime-urls";

export default function HomePage() {
  redirect(withAppBasePath("/dashboard"));
}
