import type { Estado, Prioridad } from "@/lib/dominio";

/** Una fila de v_board_tasks, que es lo que pinta el tablero. */
export type TareaDeTablero = {
  id: string;
  organization_id: string;
  project_id: string;
  project_name: string;
  end_client_name: string;
  task_type_name: string | null;
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
