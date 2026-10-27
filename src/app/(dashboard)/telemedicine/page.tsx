import { redirect } from "next/navigation";

export default function TelemedicineRedirectPage() {
  redirect("/messages?desk=vet");
}
