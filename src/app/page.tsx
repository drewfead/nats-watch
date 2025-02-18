import { redirect } from "next/navigation";
import { JSX } from "react";

export default function Home(): JSX.Element {
  redirect("/core");
}
