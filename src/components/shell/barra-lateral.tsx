"use client";

import { cn } from "cn";
import {
  ChevronRight,
  Building2,
  FolderOpen,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Settings,
  Sun,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Input } from "@/components/ui/input";
import type { ClienteConProyectos } from "@/lib/consultas";

const ANCHO_MINIMO = 220;
const ANCHO_MAXIMO = 360;
const ANCHO_POR_DEFECTO = 264;
/** A partir de aquí el navegador deja de pintar lo que no se ve. */
const UMBRAL_VIRTUALIZAR = 50;

type Nodo =
  | { tipo: "cliente"; id: string; nombre: string; abierto: boolean; hijos: number }
  | { tipo: "proyecto"; id: string; orgId: string; nombre: string; ultimo: boolean };

function leerAbiertos(): string[] {
  try {
    const bruto = localStorage.getItem("sidebar:abiertos");
    return bruto ? (JSON.parse(bruto) as string[]) : [];
  } catch {
    return [];
  }
}

export function BarraLateral({
  clientes,
}: {
  clientes: ClienteConProyectos[];
}) {
  const ruta = usePathname();
  const router = useRouter();

  const [abiertos, setAbiertos] = useState<Set<string>>(new Set());
  const [colapsado, setColapsado] = useState(false);
  const [ancho, setAncho] = useState(ANCHO_POR_DEFECTO);
  const [busqueda, setBusqueda] = useState("");
  const [enfocado, setEnfocado] = useState(0);

  const buscadorRef = useRef<HTMLInputElement>(null);
  const listaRef = useRef<HTMLDivElement>(null);
  const redimensionando = useRef(false);

  // El guion del layout ya pintó el ancho correcto con la variable CSS, así que
  // aquí solo se sincroniza el estado de React con lo que quedó guardado.
  useEffect(() => {
    setAbiertos(new Set(leerAbiertos()));
    try {
      setColapsado(localStorage.getItem("sidebar:colapsado") === "true");
      const guardado = Number(localStorage.getItem("sidebar:ancho"));
      if (Number.isFinite(guardado) && guardado >= ANCHO_MINIMO && guardado <= ANCHO_MAXIMO) {
        setAncho(guardado);
      }
    } catch {
      // Sin almacenamiento, se queda con los valores por defecto.
    }
  }, []);

  const guardar = useCallback((clave: string, valor: unknown) => {
    try {
      localStorage.setItem(`sidebar:${clave}`, JSON.stringify(valor));
    } catch {
      // Navegación privada: el estado dura la sesión y ya.
    }
  }, []);

  const alternarCliente = useCallback(
    (id: string) => {
      setAbiertos((previos) => {
        const siguiente = new Set(previos);
        if (siguiente.has(id)) siguiente.delete(id);
        else siguiente.add(id);
        guardar("abiertos", [...siguiente]);
        return siguiente;
      });
    },
    [guardar]
  );

  const alternarColapso = useCallback(() => {
    setColapsado((previo) => {
      const siguiente = !previo;
      guardar("colapsado", siguiente);
      document.documentElement.style.setProperty(
        "--ancho-sidebar",
        `${siguiente ? 56 : ancho}px`
      );
      return siguiente;
    });
  }, [ancho, guardar]);

  // ---------------------------------------------------------------- búsqueda
  const clientesFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return clientes;

    return clientes
      .map((c) => {
        const coincideCliente = c.name.toLowerCase().includes(q);
        const proyectos = c.proyectos.filter(
          (p) =>
            p.name.toLowerCase().includes(q) || p.end_client_name.toLowerCase().includes(q)
        );
        if (!coincideCliente && proyectos.length === 0) return null;
        // Si el que coincide es el cliente, se muestran todos sus proyectos.
        return { ...c, proyectos: coincideCliente ? c.proyectos : proyectos };
      })
      .filter((c): c is ClienteConProyectos => c !== null);
  }, [busqueda, clientes]);

  // Buscar despliega todo lo que coincide, sin tocar lo que el usuario eligió.
  const hayBusqueda = busqueda.trim().length > 0;

  const nodos = useMemo<Nodo[]>(() => {
    const lista: Nodo[] = [];
    for (const c of clientesFiltrados) {
      const abierto = hayBusqueda || abiertos.has(c.id);
      lista.push({
        tipo: "cliente",
        id: c.id,
        nombre: c.name,
        abierto,
        hijos: c.proyectos.length,
      });
      if (abierto) {
        c.proyectos.forEach((p, i) =>
          lista.push({
            tipo: "proyecto",
            id: p.id,
            orgId: c.id,
            nombre: p.name,
            ultimo: i === c.proyectos.length - 1,
          })
        );
      }
    }
    return lista;
  }, [abiertos, clientesFiltrados, hayBusqueda]);

  useEffect(() => {
    if (enfocado > nodos.length - 1) setEnfocado(Math.max(0, nodos.length - 1));
  }, [enfocado, nodos.length]);

  // ------------------------------------------------------------- atajos
  useEffect(() => {
    function alTeclado(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (colapsado) alternarColapso();
        buscadorRef.current?.focus();
        buscadorRef.current?.select();
      }
    }
    window.addEventListener("keydown", alTeclado);
    return () => window.removeEventListener("keydown", alTeclado);
  }, [alternarColapso, colapsado]);

  function enfocarIndice(i: number) {
    setEnfocado(i);
    const nodo = listaRef.current?.querySelectorAll<HTMLElement>("[data-nodo]")[i];
    nodo?.focus();
  }

  function alTecladoDeArbol(e: React.KeyboardEvent) {
    const nodo = nodos[enfocado];
    if (!nodo) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        enfocarIndice(Math.min(enfocado + 1, nodos.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        enfocarIndice(Math.max(enfocado - 1, 0));
        break;
      case "ArrowRight":
        e.preventDefault();
        if (nodo.tipo === "cliente" && !nodo.abierto && nodo.hijos > 0) alternarCliente(nodo.id);
        else if (nodo.tipo === "cliente" && nodo.abierto) enfocarIndice(enfocado + 1);
        break;
      case "ArrowLeft":
        e.preventDefault();
        if (nodo.tipo === "cliente" && nodo.abierto) alternarCliente(nodo.id);
        else if (nodo.tipo === "proyecto") {
          const padre = nodos.findIndex((n) => n.tipo === "cliente" && n.id === nodo.orgId);
          if (padre >= 0) enfocarIndice(padre);
        }
        break;
      case "Home":
        e.preventDefault();
        enfocarIndice(0);
        break;
      case "End":
        e.preventDefault();
        enfocarIndice(nodos.length - 1);
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        if (nodo.tipo === "cliente") {
          router.push(`/clientes/${nodo.id}`);
          if (!nodo.abierto && nodo.hijos > 0) alternarCliente(nodo.id);
        } else {
          router.push(`/clientes/${nodo.orgId}?proyecto=${nodo.id}`);
        }
        break;
    }
  }

  // ---------------------------------------------------------- redimensionar
  useEffect(() => {
    function alMover(e: PointerEvent) {
      if (!redimensionando.current) return;
      const nuevo = Math.min(ANCHO_MAXIMO, Math.max(ANCHO_MINIMO, e.clientX));
      setAncho(nuevo);
      document.documentElement.style.setProperty("--ancho-sidebar", `${nuevo}px`);
    }
    function alSoltar() {
      if (!redimensionando.current) return;
      redimensionando.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      setAncho((a) => {
        guardar("ancho", a);
        return a;
      });
    }
    window.addEventListener("pointermove", alMover);
    window.addEventListener("pointerup", alSoltar);
    return () => {
      window.removeEventListener("pointermove", alMover);
      window.removeEventListener("pointerup", alSoltar);
    };
  }, [guardar]);

  const orgActiva = ruta.startsWith("/clientes/") ? ruta.split("/")[2] : null;
  const proyectoActivo = useSearchParams().get("proyecto");

  const muchos = clientes.length > UMBRAL_VIRTUALIZAR;

  return (
    <nav
      aria-label="Clientes y proyectos"
      className="bg-sidebar border-border relative flex h-svh shrink-0 flex-col overflow-hidden border-r"
      style={{ width: "var(--ancho-sidebar, 264px)" }}
    >
      <div className={cn("flex items-center gap-1 p-2", colapsado && "justify-center")}>
        {!colapsado && (
          <div className="relative flex-1">
            <Search
              className="text-ink-faint pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2"
              strokeWidth={1.5}
            />
            <Input
              ref={buscadorRef}
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar"
              aria-label="Buscar cliente o proyecto"
              className="bg-surface h-8 pr-12 pl-8"
            />
            <kbd className="text-ink-faint pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-[11px]">
              Ctrl K
            </kbd>
          </div>
        )}
        <button
          type="button"
          onClick={alternarColapso}
          aria-label={colapsado ? "Expandir el menú" : "Colapsar el menú"}
          title={colapsado ? "Expandir el menú" : "Colapsar el menú"}
          className="text-ink-soft hover:bg-surface hover:text-ink rounded-control focus-visible:ring-ring/50 grid size-8 shrink-0 place-items-center outline-none focus-visible:ring-3"
        >
          {colapsado ? (
            <PanelLeftOpen className="size-4" strokeWidth={1.5} />
          ) : (
            <PanelLeftClose className="size-4" strokeWidth={1.5} />
          )}
        </button>
      </div>

      <div className="px-2 pb-1">
        <EnlaceFijo
          href="/"
          activo={ruta === "/"}
          colapsado={colapsado}
          icono={<Sun className="size-[18px]" strokeWidth={1.5} />}
          etiqueta="Hoy"
        />
        <EnlaceFijo
          href="/clientes"
          activo={ruta === "/clientes"}
          colapsado={colapsado}
          icono={<Building2 className="size-[18px]" strokeWidth={1.5} />}
          etiqueta="Clientes"
        />
      </div>

      {!colapsado && (
        <div
          ref={listaRef}
          role="tree"
          aria-label="Clientes"
          onKeyDown={alTecladoDeArbol}
          className="min-h-0 flex-1 overflow-y-auto px-2 pb-3"
        >
          {nodos.length === 0 ? (
            <p className="text-meta text-ink-soft px-2 py-3">
              {hayBusqueda
                ? "Ningún cliente ni proyecto coincide con lo que escribiste."
                : "Todavía no hay clientes. Da de alta el primero desde Clientes."}
            </p>
          ) : (
            nodos.map((nodo, i) =>
              nodo.tipo === "cliente" ? (
                <div
                  key={`c-${nodo.id}`}
                  style={
                    muchos
                      ? { contentVisibility: "auto", containIntrinsicSize: "auto 32px" }
                      : undefined
                  }
                >
                  <ItemCliente
                    nodo={nodo}
                    activo={orgActiva === nodo.id && !proyectoActivo}
                    tabIndex={i === enfocado ? 0 : -1}
                    onFocus={() => setEnfocado(i)}
                    onAlternar={() => alternarCliente(nodo.id)}
                  />
                </div>
              ) : (
                <ItemProyecto
                  key={`p-${nodo.id}`}
                  nodo={nodo}
                  activo={proyectoActivo === nodo.id}
                  tabIndex={i === enfocado ? 0 : -1}
                  onFocus={() => setEnfocado(i)}
                />
              )
            )
          )}
        </div>
      )}

      {colapsado && <div className="flex-1" />}

      <div className="border-border border-t p-2">
        <EnlaceFijo
          href="/configuracion"
          activo={ruta.startsWith("/configuracion")}
          colapsado={colapsado}
          icono={<Settings className="size-[18px]" strokeWidth={1.5} />}
          etiqueta="Configuración"
        />
      </div>

      {!colapsado && (
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Cambiar el ancho del menú"
          onPointerDown={() => {
            redimensionando.current = true;
            document.body.style.cursor = "col-resize";
            document.body.style.userSelect = "none";
          }}
          className="hover:bg-border-strong absolute top-0 -right-1 h-full w-2 cursor-col-resize"
        />
      )}
    </nav>
  );
}

function EnlaceFijo({
  href,
  activo,
  colapsado,
  icono,
  etiqueta,
}: {
  href: string;
  activo: boolean;
  colapsado: boolean;
  icono: React.ReactNode;
  etiqueta: string;
}) {
  return (
    <Link
      href={href}
      title={colapsado ? etiqueta : undefined}
      aria-current={activo ? "page" : undefined}
      className={cn(
        "rounded-control text-body flex h-8 items-center gap-2 px-2",
        "duration-(--duracion-rapida) ease-(--curva) transition-colors",
        colapsado && "justify-center px-0",
        activo ? "bg-surface text-ink font-medium" : "text-ink-soft hover:bg-surface hover:text-ink"
      )}
    >
      <span className="shrink-0">{icono}</span>
      {!colapsado && <span className="truncate">{etiqueta}</span>}
    </Link>
  );
}

function ItemCliente({
  nodo,
  activo,
  tabIndex,
  onFocus,
  onAlternar,
}: {
  nodo: Extract<Nodo, { tipo: "cliente" }>;
  activo: boolean;
  tabIndex: number;
  onFocus: () => void;
  onAlternar: () => void;
}) {
  return (
    <div
      data-nodo
      role="treeitem"
      aria-expanded={nodo.hijos > 0 ? nodo.abierto : undefined}
      aria-selected={activo}
      aria-level={1}
      tabIndex={tabIndex}
      onFocus={onFocus}
      className={cn(
        "rounded-control relative mt-0.5 flex h-8 items-center gap-1 pr-2 pl-1 outline-none",
        "duration-(--duracion-rapida) ease-(--curva) transition-colors",
        // El cliente activo lleva barra vertical; el proyecto activo no. Los dos
        // tratamientos tienen que distinguirse entre sí, no solo del resto.
        activo
          ? "bg-surface text-ink font-[550] before:bg-ink before:absolute before:top-1 before:bottom-1 before:-left-1 before:w-0.5 before:rounded-full before:content-['']"
          : "text-ink-soft hover:bg-surface hover:text-ink"
      )}
    >
      <button
        type="button"
        tabIndex={-1}
        onClick={(e) => {
          e.stopPropagation();
          onAlternar();
        }}
        aria-hidden
        className={cn(
          "grid size-5 shrink-0 place-items-center rounded",
          nodo.hijos === 0 && "invisible"
        )}
      >
        <ChevronRight
          className={cn(
            "size-3.5 duration-(--duracion-media) ease-(--curva) transition-transform",
            nodo.abierto && "rotate-90"
          )}
          strokeWidth={1.5}
        />
      </button>

      <Link href={`/clientes/${nodo.id}`} tabIndex={-1} className="text-body min-w-0 flex-1 truncate">
        {nodo.nombre}
      </Link>

      {nodo.hijos > 0 && (
        <span className="text-meta text-ink-faint shrink-0" data-cifras>
          {nodo.hijos}
        </span>
      )}
    </div>
  );
}

function ItemProyecto({
  nodo,
  activo,
  tabIndex,
  onFocus,
}: {
  nodo: Extract<Nodo, { tipo: "proyecto" }>;
  activo: boolean;
  tabIndex: number;
  onFocus: () => void;
}) {
  return (
    <div
      data-nodo
      role="treeitem"
      aria-selected={activo}
      aria-level={2}
      tabIndex={tabIndex}
      onFocus={onFocus}
      className="relative ml-[14px] pl-[14px]"
    >
      {/* Guía de anidado: se tiñe de tinta a la altura del proyecto activo. */}
      <span
        aria-hidden
        className={cn(
          "absolute top-0 left-0 w-px",
          nodo.ultimo ? "h-4" : "h-full",
          activo ? "bg-ink" : "bg-border"
        )}
      />
      <Link
        href={`/clientes/${nodo.orgId}?proyecto=${nodo.id}`}
        tabIndex={-1}
        aria-current={activo ? "page" : undefined}
        className={cn(
          "rounded-control text-body mt-0.5 flex h-8 items-center gap-2 px-2",
          "duration-(--duracion-rapida) ease-(--curva) transition-colors",
          activo
            ? "bg-surface text-ink font-medium"
            : "text-ink-soft hover:bg-surface hover:text-ink"
        )}
      >
        <FolderOpen className="size-4 shrink-0" strokeWidth={1.5} />
        <span className="truncate">{nodo.nombre}</span>
      </Link>
    </div>
  );
}

