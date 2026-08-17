import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Le CRM est passé de /dashboard à la racine. On garde des redirections
  // pour les anciens liens et favoris. Volontairement temporaires : un
  // permanent:true serait mis en cache durablement par le navigateur et
  // deviendrait pénible à défaire.
  async redirects() {
    return [
      { source: '/dashboard', destination: '/', permanent: false },
      { source: '/dashboard/:path*', destination: '/:path*', permanent: false },
    ]
  },
};

export default nextConfig;
