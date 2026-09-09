import { SubNavegacion } from "@/components/shell/sub-navegacion";

export default function LayoutConfiguracion({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-border shrink-0 border-b px-6 pt-5">
        <h1 className="text-title-page mb-3">Configuración</h1>
        <SubNavegacion
          base="/configuracion"
          apartados={[
            { href: "", etiqueta: "General" },
            { href: "/llm", etiqueta: "Modelo y resumen diario" },
          ]}
        />
      </div>
      <div className="min-h-0 flex-1 overflow-auto">{children}</div>
    </div>
  );
}
