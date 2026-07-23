const SESSION_TTL = 60 * 60 * 24 * 180;
const STATE_TTL = 10 * 60;

const json = (data, status = 200, headers = {}) => new Response(JSON.stringify(data), {
  status,
  headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...headers },
});

function originAllowed(request, env) {
  const origin = request.headers.get("Origin");
  return !origin || origin === env.APP_ORIGIN;
}

function cors(request, env) {
  return originAllowed(request, env)
    ? { "Access-Control-Allow-Origin": env.APP_ORIGIN, "Access-Control-Allow-Headers": "Authorization, Content-Type", "Access-Control-Allow-Methods": "POST, DELETE, OPTIONS", Vary: "Origin" }
    : {};
}

function randomId() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function authToken(request) {
  const value = request.headers.get("Authorization") || "";
  return value.startsWith("Bearer ") ? value.slice(7) : "";
}

async function encrypt(value, env) {
  const keyBytes = Uint8Array.from(atob(env.TOKEN_ENCRYPTION_KEY), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey("raw", keyBytes, "AES-GCM", false, ["encrypt"]);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(value));
  return `${btoa(String.fromCharCode(...iv))}.${btoa(String.fromCharCode(...new Uint8Array(encrypted)))}`;
}

async function decrypt(value, env) {
  const [iv64, data64] = String(value || "").split(".");
  const keyBytes = Uint8Array.from(atob(env.TOKEN_ENCRYPTION_KEY), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey("raw", keyBytes, "AES-GCM", false, ["decrypt"]);
  const iv = Uint8Array.from(atob(iv64), (c) => c.charCodeAt(0));
  const data = Uint8Array.from(atob(data64), (c) => c.charCodeAt(0));
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, data);
  return new TextDecoder().decode(plain);
}

function appReturn(env) {
  return env.APP_ORIGIN + env.APP_PATH;
}

async function googleToken(body) {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.access_token) throw new Error(data.error_description || "O Google recusou a conexao.");
  return data;
}

async function start(request, env) {
  const url = new URL(request.url);
  const returnTo = url.searchParams.get("return_to");
  if (returnTo !== appReturn(env)) return json({ error: "Destino invalido." }, 400);
  const state = randomId();
  await env.SESSIONS.put(`state:${state}`, JSON.stringify({ selectAccount: url.searchParams.get("select_account") === "1" }), { expirationTtl: STATE_TTL });
  const callback = url.origin + "/auth/callback";
  const google = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  google.searchParams.set("client_id", env.GOOGLE_WEB_CLIENT_ID);
  google.searchParams.set("redirect_uri", callback);
  google.searchParams.set("response_type", "code");
  google.searchParams.set("scope", env.GOOGLE_SCOPE);
  google.searchParams.set("access_type", "offline");
  google.searchParams.set("prompt", url.searchParams.get("select_account") === "1" ? "select_account consent" : "consent");
  google.searchParams.set("state", state);
  return Response.redirect(google.toString(), 302);
}

async function callback(request, env) {
  const url = new URL(request.url);
  const state = url.searchParams.get("state") || "";
  const stored = await env.SESSIONS.get(`state:${state}`);
  await env.SESSIONS.delete(`state:${state}`);
  if (!stored || !url.searchParams.get("code")) return new Response("Nao foi possivel concluir o login. Volte ao Faisca e tente novamente.", { status: 400 });
  try {
    const token = await googleToken({
      client_id: env.GOOGLE_WEB_CLIENT_ID,
      client_secret: env.GOOGLE_WEB_CLIENT_SECRET,
      code: url.searchParams.get("code"),
      grant_type: "authorization_code",
      redirect_uri: url.origin + "/auth/callback",
    });
    if (!token.refresh_token) throw new Error("O Google nao devolveu a credencial de renovacao.");
    const session = randomId();
    await env.SESSIONS.put(`session:${session}`, JSON.stringify({ refresh: await encrypt(token.refresh_token, env) }), { expirationTtl: SESSION_TTL });
    return Response.redirect(`${appReturn(env)}#faisca_session=${encodeURIComponent(session)}`, 302);
  } catch (error) {
    return new Response(`Nao foi possivel concluir o login: ${error.message}`, { status: 500, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  }
}

async function refresh(request, env) {
  if (!originAllowed(request, env)) return json({ error: "Origem invalida." }, 403);
  const session = authToken(request);
  const stored = session && await env.SESSIONS.get(`session:${session}`);
  if (!stored) return json({ error: "Sessao encerrada." }, 401, cors(request, env));
  try {
    const data = JSON.parse(stored);
    const token = await googleToken({
      client_id: env.GOOGLE_WEB_CLIENT_ID,
      client_secret: env.GOOGLE_WEB_CLIENT_SECRET,
      refresh_token: await decrypt(data.refresh, env),
      grant_type: "refresh_token",
    });
    return json({ access_token: token.access_token, expires_in: token.expires_in || 3600 }, 200, cors(request, env));
  } catch (error) {
    await env.SESSIONS.delete(`session:${session}`);
    return json({ error: "Sessao encerrada." }, 401, cors(request, env));
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") return new Response(null, { headers: cors(request, env) });
    if (request.method === "GET" && url.pathname === "/auth/start") return start(request, env);
    if (request.method === "GET" && url.pathname === "/auth/callback") return callback(request, env);
    if (request.method === "POST" && url.pathname === "/token") return refresh(request, env);
    if (request.method === "DELETE" && url.pathname === "/session") {
      if (!originAllowed(request, env)) return json({ error: "Origem invalida." }, 403);
      const session = authToken(request);
      if (session) await env.SESSIONS.delete(`session:${session}`);
      return new Response(null, { status: 204, headers: cors(request, env) });
    }
    return json({ error: "Nao encontrado." }, 404);
  },
};
