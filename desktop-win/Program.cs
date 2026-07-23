// ============================================================
//  FAÍSCA — versão desktop leve (WebView2)
//  Faz o mesmo que a versão em Electron, mas usa o motor do Edge
//  que já vem no Windows em vez de carregar um navegador próprio.
//  O login continua abrindo no navegador padrão da pessoa, pra ela
//  aproveitar as senhas salvas e a conta que já está logada.
// ============================================================
using System.Diagnostics;
using System.Net;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;

namespace Faisca;

static class Program
{
    public const string AppUrl = "https://randomicidio.github.io/faisca/";

    [STAThread]
    static void Main()
    {
        ApplicationConfiguration.Initialize();
        Application.Run(new JanelaPrincipal());
    }

    // Pasta ao lado do .exe: dá pra levar tudo num pendrive.
    // Se não for gravável (Arquivos de Programas), cai pro AppData.
    public static string PastaDados()
    {
        var aoLado = Path.Combine(AppContext.BaseDirectory, "Dados do Faisca");
        try
        {
            Directory.CreateDirectory(aoLado);
            var teste = Path.Combine(aoLado, ".escrita");
            File.WriteAllText(teste, "ok");
            File.Delete(teste);
            return aoLado;
        }
        catch
        {
            var alternativa = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "faisca-desktop");
            Directory.CreateDirectory(alternativa);
            return alternativa;
        }
    }
}

public class JanelaPrincipal : Form
{
    private readonly WebView2 _web = new();
    private readonly string _pastaDados = Program.PastaDados();
    private Sessao _sessao;

    public JanelaPrincipal()
    {
        Text = "Faísca";
        Width = 1200;
        Height = 820;
        MinimumSize = new Size(390, 640);
        StartPosition = FormStartPosition.CenterScreen;
        BackColor = ColorTranslator.FromHtml("#f3f1ec");
        try
        {
            using var ico = typeof(Program).Assembly.GetManifestResourceStream("faisca.icone");
            if (ico is not null) Icon = new Icon(ico);
        }
        catch { }

        _sessao = new Sessao(Path.Combine(_pastaDados, "google-drive-session.json"));
        _web.Dock = DockStyle.Fill;
        Controls.Add(_web);
        Load += async (_, _) => await IniciarAsync();
    }

    private async Task IniciarAsync()
    {
        try { CoreWebView2Environment.GetAvailableBrowserVersionString(); }
        catch (WebView2RuntimeNotFoundException)
        {
            var r = MessageBox.Show(
                "O Faísca precisa do WebView2, um componente da Microsoft que normalmente já vem com o Windows.\n\n" +
                "Quer abrir a página de download agora? É rápido e só precisa ser feito uma vez.",
                "Falta um componente do Windows", MessageBoxButtons.YesNo, MessageBoxIcon.Information);
            if (r == DialogResult.Yes) AbrirNoNavegador("https://go.microsoft.com/fwlink/p/?LinkId=2124703");
            Close();
            return;
        }

        var env = await CoreWebView2Environment.CreateAsync(null, _pastaDados);
        await _web.EnsureCoreWebView2Async(env);
        var core = _web.CoreWebView2;

        core.Settings.AreDefaultContextMenusEnabled = false;
        core.Settings.IsStatusBarEnabled = false;
        await core.AddScriptToExecuteOnDocumentCreatedAsync(PonteJs);
        core.WebMessageReceived += AoReceberMensagem;

        // links pra fora abrem no navegador da pessoa, não numa janela do app
        core.NewWindowRequested += (_, e) =>
        {
            e.Handled = true;
            AbrirNoNavegador(e.Uri);
        };

        core.Navigate(Program.AppUrl);
    }

    // Recria a mesma API que o preload do Electron expunha, pra não
    // precisar mudar uma linha do app web.
    private const string PonteJs = @"
(() => {
  const pendentes = new Map();
  const ouvintes = new Set();
  let seq = 0;
  window.chrome.webview.addEventListener('message', (e) => {
    const m = e.data;
    if (!m) return;
    if (m.type === 'resposta') {
      const p = pendentes.get(m.id);
      if (!p) return;
      pendentes.delete(m.id);
      if (m.ok) p.resolve(m.resultado);
      else p.reject(new Error(m.mensagem || 'Falha no login.'));
    } else if (m.type === 'oauth:result') {
      ouvintes.forEach((fn) => { try { fn(m.payload); } catch (x) {} });
    }
  });
  const chamar = (acao, dados) => new Promise((resolve, reject) => {
    const id = ++seq;
    pendentes.set(id, { resolve, reject });
    window.chrome.webview.postMessage({ id, acao, dados: dados || null });
  });
  window.FaiscaDesktopOAuth = {
    connect: (a) => chamar('connect', a),
    restore: (a) => chamar('restore', a),
    disconnect: () => chamar('disconnect'),
    onResult: (cb) => { ouvintes.add(cb); return () => ouvintes.delete(cb); },
  };
})();";

    private async void AoReceberMensagem(object sender, CoreWebView2WebMessageReceivedEventArgs e)
    {
        JsonNode msg;
        try { msg = JsonNode.Parse(e.WebMessageAsJson); }
        catch { return; }
        if (msg is null) return;

        var id = msg["id"]?.GetValue<int>() ?? 0;
        var acao = msg["acao"]?.GetValue<string>() ?? "";
        var dados = msg["dados"];

        try
        {
            switch (acao)
            {
                case "connect":
                {
                    var token = await ConectarAsync(
                        dados?["clientId"]?.GetValue<string>() ?? "",
                        dados?["scope"]?.GetValue<string>() ?? "",
                        dados?["selectAccount"]?.GetValue<bool>() ?? false);
                    Responder(id, true, token);
                    Avisar(new JsonObject { ["ok"] = true, ["token"] = token?.DeepClone() });
                    break;
                }
                case "restore":
                {
                    var token = await _sessao.RestaurarAsync(dados?["clientId"]?.GetValue<string>() ?? "");
                    Responder(id, true, token);
                    break;
                }
                case "disconnect":
                    _sessao.Limpar();
                    Responder(id, true, JsonValue.Create(true));
                    break;
                default:
                    Responder(id, false, null, "Ação desconhecida.");
                    break;
            }
        }
        catch (Exception ex)
        {
            Responder(id, false, null, ex.Message);
            if (acao == "connect")
                Avisar(new JsonObject { ["ok"] = false, ["message"] = ex.Message });
        }
    }

    private void Responder(int id, bool ok, JsonNode resultado, string mensagem = null)
    {
        var o = new JsonObject
        {
            ["type"] = "resposta",
            ["id"] = id,
            ["ok"] = ok,
            ["resultado"] = resultado?.DeepClone(),
            ["mensagem"] = mensagem,
        };
        try { _web.CoreWebView2?.PostWebMessageAsJson(o.ToJsonString()); } catch { }
    }

    private void Avisar(JsonObject payload)
    {
        var o = new JsonObject { ["type"] = "oauth:result", ["payload"] = payload };
        try { _web.CoreWebView2?.PostWebMessageAsJson(o.ToJsonString()); } catch { }
    }

    // ---- OAuth com PKCE, abrindo o navegador padrão ----
    private async Task<JsonNode> ConectarAsync(string clientId, string scope, bool selectAccount)
    {
        var verifier = Base64Url(RandomNumberGenerator.GetBytes(64));
        var challenge = Base64Url(SHA256.HashData(Encoding.ASCII.GetBytes(verifier)));
        var state = Base64Url(RandomNumberGenerator.GetBytes(18));

        var porta = PortaLivre();
        var redirectUri = $"http://127.0.0.1:{porta}/callback/";

        using var ouvinte = new HttpListener();
        ouvinte.Prefixes.Add(redirectUri);
        ouvinte.Start();

        var url = "https://accounts.google.com/o/oauth2/v2/auth" +
            $"?client_id={Uri.EscapeDataString(clientId)}" +
            $"&redirect_uri={Uri.EscapeDataString(redirectUri.TrimEnd('/'))}" +
            "&response_type=code" +
            $"&scope={Uri.EscapeDataString(scope)}" +
            "&access_type=offline" +
            $"&prompt={Uri.EscapeDataString(selectAccount ? "select_account consent" : "consent")}" +
            $"&code_challenge={challenge}&code_challenge_method=S256" +
            $"&state={state}";
        AbrirNoNavegador(url);

        var contexto = await ComPrazo(ouvinte.GetContextAsync(), TimeSpan.FromMinutes(3));
        var q = contexto.Request.QueryString;

        try
        {
            if (q["state"] != state) throw new Exception("Estado OAuth inválido.");
            var code = q["code"];
            if (string.IsNullOrEmpty(code)) throw new Exception("Autorização não concluída.");

            var token = await TrocarCodigoAsync(clientId, code, verifier, redirectUri.TrimEnd('/'));
            _sessao.Salvar(token, clientId);
            await Escrever(contexto, 200, PaginaSucesso);
            return token;
        }
        catch (Exception ex)
        {
            await Escrever(contexto, 500, PaginaErro(ex.Message));
            throw;
        }
        finally { try { ouvinte.Stop(); } catch { } }
    }

    private static async Task<JsonNode> TrocarCodigoAsync(string clientId, string code, string verifier, string redirectUri)
    {
        var campos = new Dictionary<string, string>
        {
            ["client_id"] = clientId,
            ["code"] = code,
            ["code_verifier"] = verifier,
            ["grant_type"] = "authorization_code",
            ["redirect_uri"] = redirectUri,
        };
        var segredo = Segredos.ClientSecret();
        if (!string.IsNullOrEmpty(segredo)) campos["client_secret"] = segredo;

        using var http = new HttpClient { Timeout = TimeSpan.FromSeconds(20) };
        var resp = await http.PostAsync("https://oauth2.googleapis.com/token", new FormUrlEncodedContent(campos));
        var texto = await resp.Content.ReadAsStringAsync();
        var json = JsonNode.Parse(texto);
        if (!resp.IsSuccessStatusCode)
        {
            var detalhe = json?["error_description"]?.GetValue<string>()
                       ?? json?["error"]?.GetValue<string>()
                       ?? "Falha ao concluir login no Google.";
            throw new Exception(detalhe);
        }
        return json;
    }

    private static int PortaLivre()
    {
        var l = new System.Net.Sockets.TcpListener(IPAddress.Loopback, 0);
        l.Start();
        var porta = ((IPEndPoint)l.LocalEndpoint).Port;
        l.Stop();
        return porta;
    }

    private static async Task<T> ComPrazo<T>(Task<T> tarefa, TimeSpan prazo)
    {
        if (await Task.WhenAny(tarefa, Task.Delay(prazo)) != tarefa)
            throw new Exception("Tempo esgotado no login do Google.");
        return await tarefa;
    }

    private static async Task Escrever(HttpListenerContext ctx, int status, string html)
    {
        var bytes = Encoding.UTF8.GetBytes(html);
        ctx.Response.StatusCode = status;
        ctx.Response.ContentType = "text/html; charset=utf-8";
        ctx.Response.ContentLength64 = bytes.Length;
        await ctx.Response.OutputStream.WriteAsync(bytes);
        ctx.Response.Close();
    }

    public static void AbrirNoNavegador(string url)
    {
        try { Process.Start(new ProcessStartInfo(url) { UseShellExecute = true }); } catch { }
    }

    private static string Base64Url(byte[] b) =>
        Convert.ToBase64String(b).Replace('+', '-').Replace('/', '_').TrimEnd('=');

    private const string PaginaSucesso = @"<!doctype html><html lang=""pt-BR""><head><meta charset=""utf-8"">
<meta name=""viewport"" content=""width=device-width, initial-scale=1""><title>Fa&iacute;sca conectado</title><style>
:root{color-scheme:light dark;--accent:#e8452a;--accent2:#ff7a42;--bg:#f3f1ec;--text:#1d1a16;--dim:#6a6357;--card:#fff;--border:#e6e0d5}
@media(prefers-color-scheme:dark){:root{--bg:#16151a;--text:#f1eee8;--dim:#a49c96;--card:#201e26;--border:#302d38}}
*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;padding:24px;
font-family:system-ui,-apple-system,'Segoe UI',Roboto,Arial,sans-serif;color:var(--text);
background:radial-gradient(900px 420px at 70% -10%,rgba(255,122,66,.18),transparent 60%),var(--bg)}
.card{width:min(420px,100%);padding:28px;border-radius:18px;background:var(--card);border:1px solid var(--border);
box-shadow:0 18px 50px rgba(50,25,10,.16);text-align:center}
.mark{width:56px;height:56px;margin:0 auto 16px;border-radius:16px;display:grid;place-items:center;color:#fff;
font-size:34px;font-weight:900;background:linear-gradient(135deg,var(--accent2),var(--accent))}
h1{margin:0 0 8px;font-size:24px}p{margin:0;color:var(--dim);font-size:15px;line-height:1.55}
.note{margin-top:22px;border-radius:12px;padding:12px 16px;display:inline-block;color:#fff;font-weight:750;
background:linear-gradient(135deg,var(--accent2),var(--accent))}</style></head><body><main class=""card"">
<div class=""mark"">&#9889;</div><h1>Fa&iacute;sca conectado</h1>
<p>Seu Google Drive foi conectado. Voc&ecirc; j&aacute; pode voltar para o aplicativo.</p>
<span class=""note"">Volte para o Fa&iacute;sca</span></main></body></html>";

    private static string PaginaErro(string msg)
    {
        var seguro = System.Net.WebUtility.HtmlEncode(msg ?? "Falha ao concluir login.");
        return @"<!doctype html><html lang=""pt-BR""><head><meta charset=""utf-8""><title>Falha no login</title><style>
body{margin:0;min-height:100vh;display:grid;place-items:center;background:#16151a;color:#f1eee8;
font:16px system-ui;padding:24px}.box{max-width:520px;padding:28px;background:#201e26;border:1px solid #393540;
border-radius:12px}h1{font-size:22px;margin:0 0 12px;color:#ff6847}p{line-height:1.55;color:#c2bac2;
overflow-wrap:anywhere}</style></head><body><main class=""box""><h1>N&atilde;o foi poss&iacute;vel conectar</h1>
<p>" + seguro + @"</p><p>Volte ao Fa&iacute;sca e tente novamente.</p></main></body></html>";
    }
}

// ---- sessão do Google guardada em disco ----
public class Sessao
{
    private readonly string _arquivo;
    public Sessao(string arquivo) { _arquivo = arquivo; }

    public void Salvar(JsonNode tokens, string clientId)
    {
        var anterior = Ler();
        var expira = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()
                   + (long)((tokens?["expires_in"]?.GetValue<double>() ?? 3600) * 1000) - 60000;
        var o = new JsonObject
        {
            ["clientId"] = clientId,
            ["access_token"] = tokens?["access_token"]?.GetValue<string>(),
            ["refresh_token"] = tokens?["refresh_token"]?.GetValue<string>()
                              ?? anterior?["refresh_token"]?.GetValue<string>(),
            ["expires_at"] = expira,
        };
        try { File.WriteAllText(_arquivo, o.ToJsonString(), Encoding.UTF8); } catch { }
    }

    public JsonNode Ler()
    {
        try { return JsonNode.Parse(File.ReadAllText(_arquivo)); } catch { return null; }
    }

    public void Limpar() { try { File.Delete(_arquivo); } catch { } }

    // Devolve um token válido reaproveitando o refresh token, ou null.
    public async Task<JsonNode> RestaurarAsync(string clientId)
    {
        var s = Ler();
        if (s is null) return null;
        if (s["access_token"]?.GetValue<string>() is not string acesso || string.IsNullOrEmpty(acesso)) return null;
        if (s["clientId"]?.GetValue<string>() != clientId) return null;

        var expiraEm = s["expires_at"]?.GetValue<long>() ?? 0;
        var agora = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
        if (agora < expiraEm)
        {
            return new JsonObject
            {
                ["access_token"] = acesso,
                ["expires_in"] = Math.Max(60, (expiraEm - agora) / 1000 + 60),
            };
        }

        var refresh = s["refresh_token"]?.GetValue<string>();
        if (string.IsNullOrEmpty(refresh)) return null;

        var campos = new Dictionary<string, string>
        {
            ["client_id"] = clientId,
            ["refresh_token"] = refresh,
            ["grant_type"] = "refresh_token",
        };
        var segredo = Segredos.ClientSecret();
        if (!string.IsNullOrEmpty(segredo)) campos["client_secret"] = segredo;

        try
        {
            using var http = new HttpClient { Timeout = TimeSpan.FromSeconds(20) };
            var resp = await http.PostAsync("https://oauth2.googleapis.com/token", new FormUrlEncodedContent(campos));
            var json = JsonNode.Parse(await resp.Content.ReadAsStringAsync());
            if (!resp.IsSuccessStatusCode || json?["access_token"] is null) { Limpar(); return null; }
            Salvar(json, clientId);
            return json;
        }
        catch { return null; }
    }
}

// ---- client secret ----
// Vem embutido no .exe, pra pasta do programa ficar só com o executável.
// Um arquivo solto (ao lado do .exe ou na pasta de dados) ainda tem
// prioridade, caso seja preciso trocar sem recompilar.
public static class Segredos
{
    private static string _cache;
    private static bool _lido;

    public static string ClientSecret()
    {
        if (_lido) return _cache;
        _lido = true;
        _cache = DeArquivo(Path.Combine(AppContext.BaseDirectory, "secrets.local.json"))
              ?? DeArquivo(Path.Combine(Program.PastaDados(), "secrets.local.json"))
              ?? DoEmbutido();
        return _cache;
    }

    private static string DeArquivo(string caminho)
    {
        try { return Ler(File.ReadAllText(caminho)); } catch { return null; }
    }

    private static string DoEmbutido()
    {
        try
        {
            using var s = typeof(Segredos).Assembly.GetManifestResourceStream("faisca.segredos");
            if (s is null) return null;
            using var r = new StreamReader(s);
            return Ler(r.ReadToEnd());
        }
        catch { return null; }
    }

    private static string Ler(string texto)
    {
        var v = JsonNode.Parse(texto)?["googleDesktopClientSecret"]?.GetValue<string>();
        return string.IsNullOrEmpty(v) ? null : v;
    }
}
