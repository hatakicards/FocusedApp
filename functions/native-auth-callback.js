// Ponte per il login nativo (Google/Apple): Supabase reindirizza qui dopo
// l'OAuth, e questa Pages Function passa il testimone all'app tramite lo
// scheme personalizzato "focusedapp://" (intercettato da appUrlOpen in
// AuthContext.jsx) con un VERO redirect HTTP (302), non un
// window.location.replace lato client.
//
// Era prima una pagina statica con uno script che faceva il redirect in
// JavaScript: iOS/Safari puo' bloccare silenziosamente (nessun errore in
// console, nessun crash) una navigazione verso uno scheme personalizzato
// se non e' innescata da un gesto reale dell'utente (un tap) — uno script
// non basta, anche se sintatticamente corretto. Un redirect HTTP emesso dal
// server, invece, iOS lo gestisce sempre in modo affidabile: e' lo stesso
// meccanismo che gia' funzionava per Google prima di introdurre questa
// pagina ponte (necessaria solo per Apple, che usa response_mode=form_post
// e altrimenti fa scattare il bug "scarica un file" — vedi commit 5971b75).
export function onRequest(context) {
  const url = new URL(context.request.url);
  const target = 'focusedapp://auth-callback' + url.search;
  return new Response(null, { status: 302, headers: { Location: target } });
}
