import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /*
   * Permite compilar sin apagar el servidor de desarrollo. Los dos procesos
   * escriben en .next y se pisan; con NEXT_DIST_DIR el build usa su propia
   * carpeta:  NEXT_DIST_DIR=.next-build npm run build
   */
  distDir: process.env.NEXT_DIST_DIR || ".next",

  /*
   * Empaqueta el servidor y solo las dependencias que de verdad se usan en
   * .next/standalone, con su propio server.js. Es lo que hace que la imagen
   * de Docker pese ~200 MB en vez de arrastrar node_modules entero.
   */
  output: "standalone",
};

export default nextConfig;
