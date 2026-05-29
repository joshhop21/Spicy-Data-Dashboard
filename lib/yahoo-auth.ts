/** Yahoo Finance cookie + crumb auth for quoteSummary (required since ~2024). */

type YahooAuth = { cookie: string; crumb: string; expiresAt: number };

let cache: YahooAuth | null = null;
const TTL_MS = 15 * 60 * 1000;

export const YAHOO_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

function parseSetCookies(response: Response): string {
  const headers = response.headers as Headers & { getSetCookie?: () => string[] };
  if (typeof headers.getSetCookie === "function") {
    const parts = headers.getSetCookie().map((c) => c.split(";")[0]?.trim()).filter(Boolean);
    if (parts.length) return parts.join("; ");
  }
  const raw = response.headers.get("set-cookie");
  if (!raw) return "";
  return raw
    .split(/,(?=[^;]+?=)/)
    .map((c) => c.split(";")[0]?.trim())
    .filter(Boolean)
    .join("; ");
}

export async function getYahooAuth(force = false): Promise<YahooAuth> {
  if (!force && cache && Date.now() < cache.expiresAt) {
    return cache;
  }

  const bootstrap = await fetch("https://fc.yahoo.com/", {
    headers: {
      "User-Agent": YAHOO_UA,
      Accept: "text/html,application/xhtml+xml",
    },
    cache: "no-store",
    redirect: "follow",
  });

  let cookie = parseSetCookies(bootstrap);
  if (!cookie) {
    const finance = await fetch("https://finance.yahoo.com/", {
      headers: { "User-Agent": YAHOO_UA, Accept: "text/html" },
      cache: "no-store",
    });
    cookie = parseSetCookies(finance);
  }

  if (!cookie) {
    throw new Error("Yahoo auth: could not obtain session cookie");
  }

  const crumbRes = await fetch("https://query1.finance.yahoo.com/v1/test/getcrumb", {
    headers: {
      "User-Agent": YAHOO_UA,
      Accept: "*/*",
      Cookie: cookie,
      Referer: "https://finance.yahoo.com/",
    },
    cache: "no-store",
  });

  if (!crumbRes.ok) {
    throw new Error(`Yahoo auth: getcrumb ${crumbRes.status}`);
  }

  const crumb = (await crumbRes.text()).trim();
  if (!crumb || crumb.startsWith("{")) {
    throw new Error("Yahoo auth: invalid crumb");
  }

  cache = { cookie, crumb, expiresAt: Date.now() + TTL_MS };
  return cache;
}

export async function yahooFetch(url: string, retry = true): Promise<Response> {
  const auth = await getYahooAuth();
  const sep = url.includes("?") ? "&" : "?";
  const authedUrl = `${url}${sep}crumb=${encodeURIComponent(auth.crumb)}`;

  const res = await fetch(authedUrl, {
    headers: {
      "User-Agent": YAHOO_UA,
      Accept: "application/json",
      Cookie: auth.cookie,
      Referer: "https://finance.yahoo.com/",
    },
    cache: "no-store",
  });

  if (retry && (res.status === 401 || res.status === 403)) {
    cache = null;
    const auth2 = await getYahooAuth(true);
    const authedUrl2 = `${url}${sep}crumb=${encodeURIComponent(auth2.crumb)}`;
    return fetch(authedUrl2, {
      headers: {
        "User-Agent": YAHOO_UA,
        Accept: "application/json",
        Cookie: auth2.cookie,
        Referer: "https://finance.yahoo.com/",
      },
      cache: "no-store",
    });
  }

  return res;
}
