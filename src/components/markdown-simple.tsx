import { Fragment } from "react";

/**
 * Render del subconjunto de markdown que produce el brief: encabezados,
 * viñetas, negritas y párrafos.
 *
 * Un renderizador completo sería una dependencia más para un texto que
 * nosotros mismos pedimos corto y plano. Si algún día el brief necesita
 * tablas o enlaces, se cambia por una librería.
 */
export function MarkdownSimple({ texto }: { texto: string }) {
  const lineas = texto.split(/\r?\n/);
  const bloques: React.ReactNode[] = [];
  let vinetas: string[] = [];

  function cerrarVinetas(clave: number) {
    if (vinetas.length === 0) return;
    bloques.push(
      <ul key={`u${clave}`} className="text-body ml-4 list-disc space-y-1">
        {vinetas.map((v, i) => (
          <li key={i}>{conNegritas(v)}</li>
        ))}
      </ul>
    );
    vinetas = [];
  }

  lineas.forEach((linea, i) => {
    const limpia = linea.trim();

    if (limpia.startsWith("- ") || limpia.startsWith("* ")) {
      vinetas.push(limpia.slice(2));
      return;
    }

    cerrarVinetas(i);

    if (!limpia) return;

    if (limpia.startsWith("### ")) {
      bloques.push(
        <h3 key={i} className="text-title-card mt-3">
          {limpia.slice(4)}
        </h3>
      );
    } else if (limpia.startsWith("## ")) {
      bloques.push(
        <h2 key={i} className="text-title-section mt-4">
          {limpia.slice(3)}
        </h2>
      );
    } else if (limpia.startsWith("# ")) {
      bloques.push(
        <h2 key={i} className="text-title-section mt-4">
          {limpia.slice(2)}
        </h2>
      );
    } else {
      bloques.push(
        <p key={i} className="text-body">
          {conNegritas(limpia)}
        </p>
      );
    }
  });

  cerrarVinetas(lineas.length);

  return <div className="space-y-2">{bloques}</div>;
}

function conNegritas(texto: string) {
  return texto.split(/(\*\*[^*]+\*\*)/g).map((trozo, i) =>
    trozo.startsWith("**") && trozo.endsWith("**") ? (
      <strong key={i} className="font-semibold">
        {trozo.slice(2, -2)}
      </strong>
    ) : (
      <Fragment key={i}>{trozo}</Fragment>
    )
  );
}
