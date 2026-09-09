import type { Estado, Prioridad } from "@/lib/dominio";

/**
 * Las columnas que pide el tablero, en un solo sitio.
 *
 * Estaba repetida en cuatro archivos, y esa es exactamente la forma de
 * romperlo: se añade un campo al tipo, se olvida uno de los `select`, y esa
 * pantalla recibe `undefined` sin que TypeScript diga nada, porque el tipo
 * promete algo que la consulta no trajo.
 */
export const CAMPOS_VISTA =
  "id, organization_id, project_id, project_name, end_client_name, task_type_name, task_type_color, title, status, priority, sort_order, due_date, comment_count, attachment_count, is_overdue";

/** Una fila de v_board_tasks, que es lo que pinta el tablero. */
export type TareaDeTablero = {
  id: string;
  organization_id: string;
  project_id: string;
  project_name: string;
  end_client_name: string;
  task_type_name: string | null;
  task_type_color: string | null;
  title: string;
  status: Estado;
  priority: Prioridad;
  sort_order: number;
  due_date: string | null;
  comment_count: number;
  attachment_count: number;
  is_overdue: boolean;
};

export type FiltrosTablero = {
  proyecto?: string;
  tipo?: string;
  prioridad?: Prioridad;
  vencidas?: boolean;
  texto?: string;
};
