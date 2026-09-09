"use client";

import { Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { BadgeEstado } from "@/components/dominio/badge-estado";
import { ChipPrioridad } from "@/components/dominio/chip-prioridad";
import { ChipTipo } from "@/components/dominio/chip-tipo";
import { EstadoVacio } from "@/components/dominio/estado-vacio";
import { MensajeError } from "@/components/dominio/mensaje-error";
import { TarjetaKanban } from "@/components/dominio/tarjeta-kanban";
import { InterruptorTema } from "@/components/interruptor-tema";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Toaster } from "@/components/ui/sonner";
import { COLUMNAS, PRIORIDADES } from "@/lib/dominio";

function Seccion({
  titulo,
  nota,
  children,
}: {
  titulo: string;
  nota?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-title-section">{titulo}</h2>
        {nota ? <p className="text-meta text-ink-soft max-w-[68ch]">{nota}</p> : null}
      </div>
      {children}
      <Separator />
    </section>
  );
}

function Muestra({ nombre, variable }: { nombre: string; variable: string }) {
  return (
    <div className="space-y-1.5">
      <div
        className="border-border rounded-card h-14 w-full border"
        style={{ background: `var(${variable})` }}
      />
      <p className="text-label text-ink">{nombre}</p>
      <p className="text-meta text-ink-soft font-mono text-[11px]">{variable}</p>
    </div>
  );
}

export function Catalogo() {
  return (
    <main className="mx-auto max-w-4xl space-y-8 p-6 pb-24">
      <Toaster position="bottom-right" />

      <header className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-title-page">Estilo</h1>
          <p className="text-meta text-ink-soft max-w-[68ch]">
            Los componentes base con los tokens aplicados. Blanco y negro estricto: el estado y la
            prioridad se distinguen por glifo, relleno y peso, nunca por tono. Cambia el tema para
            revisar los dos modos.
          </p>
        </div>
        <InterruptorTema />
      </header>

      <Seccion
        titulo="Color"
        nota="Seis valores por modo, nombrados por función. Todos en escala de grises pura, croma 0 en OKLCH."
      >
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          <Muestra nombre="Papel" variable="--paper" />
          <Muestra nombre="Superficie" variable="--surface" />
          <Muestra nombre="Superficie hundida" variable="--surface-sunken" />
          <Muestra nombre="Superficie hover" variable="--surface-hover" />
          <Muestra nombre="Borde" variable="--border" />
          <Muestra nombre="Borde fuerte" variable="--border-strong" />
          <Muestra nombre="Tinta" variable="--ink" />
          <Muestra nombre="Tinta suave" variable="--ink-soft" />
          <Muestra nombre="Tinta tenue" variable="--ink-faint" />
        </div>
      </Seccion>

      <Seccion
        titulo="Tipografía"
        nota="Geist Sans. Escala calculada para interfaz densa: la mayor parte del sistema vive entre 12 y 14 píxeles."
      >
        <dl className="space-y-3">
          {(
            [
              ["Título de pantalla", "text-title-page", "20/28", "600"],
              ["Encabezado de bloque", "text-title-section", "16/24", "600"],
              ["Título de tarjeta", "text-title-card", "14/20", "600"],
              ["Texto general", "text-body", "14/20", "400"],
              ["Metadatos", "text-meta text-ink-soft", "13/18", "400"],
              ["Etiqueta de campo", "text-label", "12/16", "500"],
              ["Chip", "text-chip", "12/16", "500"],
            ] as const
          ).map(([nombre, clase, tamano, peso]) => (
            <div key={nombre} className="flex flex-wrap items-baseline justify-between gap-x-6">
              <dt className={clase}>{nombre}</dt>
              <dd className="text-meta text-ink-soft" data-cifras>
                {tamano}
                <span className="mx-2">peso {peso}</span>
              </dd>
            </div>
          ))}
        </dl>
        <p className="text-meta text-ink-soft" data-cifras>
          Cifras tabulares para contadores y fechas: 1 234 567 890
        </p>
      </Seccion>

      <Seccion
        titulo="Botones"
        nota="La acción dice lo que hace. En monocromo, el botón destructivo no puede avisar con color, así que siempre va detrás de una confirmación."
      >
        <div className="flex flex-wrap items-center gap-3">
          <Button>Guardar cambios</Button>
          <Button variant="secondary">Secundario</Button>
          <Button variant="outline">Con borde</Button>
          <Button variant="ghost">Sin fondo</Button>
          <Button variant="link">Enlace</Button>
          <Button disabled>Deshabilitado</Button>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button size="sm">Pequeño</Button>
          <Button>Estándar</Button>
          <Button size="lg">Grande</Button>
          <Button size="icon" aria-label="Agregar">
            <Plus />
          </Button>
          <Button variant="outline">
            <Plus /> Con icono
          </Button>
          <Button variant="destructive">
            <Trash2 /> Borrar cliente
          </Button>
        </div>
      </Seccion>

      <Seccion titulo="Campos" nota="Alto de control 32 píxeles en la interfaz densa, 36 en formularios largos.">
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="e-nombre">Nombre del proyecto</Label>
            <Input id="e-nombre" placeholder="Sitio Lumina" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="e-buscar">Buscar</Label>
            <div className="relative">
              <Search
                className="text-ink-faint pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2"
                strokeWidth={1.5}
              />
              <Input id="e-buscar" className="pl-8" placeholder="Cliente o proyecto" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="e-tipo">Tipo de tarea</Label>
            <Select>
              <SelectTrigger id="e-tipo" className="w-full">
                <SelectValue placeholder="Elige un tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="urgente">Urgente</SelectItem>
                <SelectItem value="cambio">Cambio rápido</SelectItem>
                <SelectItem value="desarrollo">Desarrollo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="e-error">Correo</Label>
            <Input id="e-error" aria-invalid defaultValue="correo-mal" />
            <MensajeError>Ese correo no tiene un formato válido.</MensajeError>
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="e-desc">Descripción</Label>
            <Textarea id="e-desc" rows={3} placeholder="Qué hay que hacer y para cuándo." />
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Checkbox id="e-check" defaultChecked />
              <Label htmlFor="e-check">Revisar accesos</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch id="e-switch" defaultChecked />
              <Label htmlFor="e-switch">Brief diario</Label>
            </div>
          </div>
        </div>
      </Seccion>

      <Seccion
        titulo="Estado y prioridad"
        nota="Los seis estados se distinguen por glifo y relleno; las cuatro prioridades escalan en peso. La inversión se reserva para urgente: es el recurso más fuerte que hay en blanco y negro."
      >
        <div className="flex flex-wrap gap-2">
          {COLUMNAS.map((c) => (
            <BadgeEstado key={c.estado} estado={c.estado} />
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {PRIORIDADES.map((p) => (
            <ChipPrioridad key={p.prioridad} prioridad={p.prioridad} />
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <ChipTipo nombre="Urgente" />
          <ChipTipo nombre="Cambio rápido" />
          <ChipTipo nombre="Desarrollo" />
          <ChipTipo nombre="Automatización" />
        </div>
      </Seccion>

      <Seccion
        titulo="Tarjeta de kanban"
        nota="Sobre el fondo hundido de la columna. La vencida es la única con filete izquierdo, así se localiza de un vistazo sin usar rojo."
      >
        <div className="bg-surface-sunken rounded-card border-border grid gap-2 border p-3 sm:w-72">
          <p className="text-label text-ink-soft flex items-center justify-between px-1">
            En progreso <span data-cifras>4</span>
          </p>
          <TarjetaKanban
            arrastrable
            datos={{
              titulo: "Rediseño de la página de contacto",
              tipo: "Desarrollo",
              prioridad: "alta",
              proyecto: "Sitio Lumina",
              fecha: "2026-09-14",
              comentarios: 3,
              adjuntos: 1,
            }}
          />
          <TarjetaKanban
            arrastrable
            datos={{
              titulo: "Formulario de citas manda correo duplicado",
              tipo: "Urgente",
              prioridad: "urgente",
              proyecto: "Lumina Dental",
              fecha: "2026-09-01",
              vencida: true,
              comentarios: 8,
            }}
          />
          <TarjetaKanban
            arrastrando
            datos={{
              titulo: "Optimizar imágenes del blog",
              tipo: "Rendimiento",
              prioridad: "baja",
              proyecto: "Sitio Lumina",
            }}
          />
        </div>
      </Seccion>

      <Seccion titulo="Tabla" nota="Filas de 40 píxeles, cifras tabulares, sin franjas de color.">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tarea</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Prioridad</TableHead>
              <TableHead className="text-right">Entrega</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell>Rediseño de la página de contacto</TableCell>
              <TableCell>
                <BadgeEstado estado="en_progreso" />
              </TableCell>
              <TableCell>
                <ChipPrioridad prioridad="alta" />
              </TableCell>
              <TableCell className="text-right">14 de septiembre</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Migrar el blog a WordPress</TableCell>
              <TableCell>
                <BadgeEstado estado="esperando_cliente" />
              </TableCell>
              <TableCell>
                <ChipPrioridad prioridad="media" />
              </TableCell>
              <TableCell className="text-right">28 de septiembre</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Respaldo mensual</TableCell>
              <TableCell>
                <BadgeEstado estado="hecho" />
              </TableCell>
              <TableCell>
                <ChipPrioridad prioridad="baja" />
              </TableCell>
              <TableCell className="text-right">1 de septiembre</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </Seccion>

      <Seccion
        titulo="Modal y avisos"
        nota="Las únicas capas con sombra son las que de verdad flotan. El aviso conserva el mismo verbo que la acción que lo disparó."
      >
        <div className="flex flex-wrap gap-3">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">Abrir modal</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Borrar Agencia Norte</DialogTitle>
                <DialogDescription>
                  Se van con ella sus clientes finales, proyectos y tareas. No hay forma de
                  recuperarlos.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="ghost">Cancelar</Button>
                </DialogClose>
                <DialogClose asChild>
                  <Button variant="destructive">Borrar cliente</Button>
                </DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Button variant="outline" onClick={() => toast.success("Cambios guardados")}>
            Aviso de éxito
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              toast.error("No se pudo mover la tarea", {
                description: "La regresamos a En progreso. Vuelve a intentarlo.",
              })
            }
          >
            Aviso de error
          </Button>
        </div>
      </Seccion>

      <Seccion
        titulo="Estados vacíos y carga"
        nota="Un estado vacío invita a actuar. Nunca dice que no hay datos disponibles."
      >
        <EstadoVacio
          titulo="Todavía no hay tareas en este proyecto"
          descripcion="Cuando la agencia mande la primera, va a caer en la columna Nuevas de este tablero."
          accion={
            <Button size="sm">
              <Plus /> Crear la primera
            </Button>
          }
        />
        <div className="space-y-2">
          <Skeleton className="h-4 w-52" />
          <Skeleton className="h-4 w-72" />
          <Skeleton className="h-4 w-40" />
        </div>
      </Seccion>

      <Seccion
        titulo="Forma y sombra"
        nota="Radios distintos por tipo de elemento. Los planos se separan con borde más cambio de superficie: en reposo no hay sombra."
      >
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            ["Chip", "rounded-chip", "6px"],
            ["Control", "rounded-control", "8px"],
            ["Tarjeta", "rounded-card", "10px"],
            ["Modal", "rounded-sheet", "12px"],
          ].map(([nombre, clase, valor]) => (
            <div key={nombre} className="space-y-1.5">
              <div className={`bg-surface border-border h-14 border ${clase}`} />
              <p className="text-label">{nombre}</p>
              <p className="text-meta text-ink-soft">{valor}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="bg-surface border-border rounded-card border p-4">
            <p className="text-label">En reposo</p>
            <p className="text-meta text-ink-soft">Borde, sin sombra</p>
          </div>
          <div className="bg-surface rounded-card shadow-flotante border-border border p-4">
            <p className="text-label">Capa flotante</p>
            <p className="text-meta text-ink-soft">Modal, menú, tooltip</p>
          </div>
          <div className="bg-surface rounded-card shadow-arrastre border-border border p-4">
            <p className="text-label">Arrastrando</p>
            <p className="text-meta text-ink-soft">Tarjeta levantada</p>
          </div>
        </div>
      </Seccion>
    </main>
  );
}
