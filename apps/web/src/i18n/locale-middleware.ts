/** Sync localStorage preference to cookie before React hydrates (mirrors theme bootstrap). */
export const LOCALE_BOOTSTRAP_SCRIPT = `(function(){try{var ls=localStorage.getItem("doable_locale");if(ls!=="en"&&ls!=="zh-CN")return;var m=document.cookie.match(/(?:^|; )doable_locale=([^;]*)/);var cookie=m?decodeURIComponent(m[1]):null;if(cookie!==ls){document.cookie="doable_locale="+encodeURIComponent(ls)+";path=/;max-age=31536000;samesite=lax";if(cookie!==null)location.reload();}}catch(e){}})();`;

export function applyLocaleCookie(response: import("next/server").NextResponse, locale: string) {
  response.cookies.set({
    name: "doable_locale",
    value: locale,
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
}
