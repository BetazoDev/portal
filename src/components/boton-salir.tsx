import { Button } from "@/components/ui/button";

export function BotonSalir() {
  return (
    <form action="/auth/salir" method="post">
      <Button type="submit" variant="outline" size="sm">
        Cerrar sesión
      </Button>
    </form>
  );
}
