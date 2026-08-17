import { NextResponse } from 'next/server'

// Outil privé : aucune page ne doit être indexée ni archivée.
//
// L'authentification ne peut pas se faire ici : le token vit dans le
// localStorage et n'accompagne pas les navigations du navigateur, donc le
// proxy ne voit jamais qui est connecté. Le verrou réel est dans getUser()
// (src/lib/auth.ts), au niveau des routes API — là où le token arrive.
export function proxy() {
  const response = NextResponse.next()
  response.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive')
  return response
}

// Sans matcher, le proxy s'exécuterait aussi sur les fichiers statiques.
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
