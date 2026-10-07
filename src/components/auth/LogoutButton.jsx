import { Button } from "@/components/ui/Button";
import { logoutAction } from "@/lib/auth/actions";

export function LogoutButton() {
  return (
    <form action={logoutAction}>
      <Button type="submit" variant="outline" className="w-full">
        Log out
      </Button>
    </form>
  );
}
