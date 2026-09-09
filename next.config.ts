import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /*
   * Permite compilar sin apagar el servidor de desarrollo. Los dos procesos
   * escriben en .next y se pisan; con NEXT_DIST_DIR el build usa su propia
   * carpeta:  NEXT_DIST_DIR=.next-build npm run build
   */
  distDir: process.env.NEXT_DIST_DIR || ".next",
};

export default nextConfig;
