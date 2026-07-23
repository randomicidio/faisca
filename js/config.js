// ============================================================
//  FAÍSCA — Configuração
// ============================================================
//  Você só precisa mexer em UMA linha aqui: o CLIENT_ID.
//  Pegue ele no Google Cloud (veja o passo a passo no LEIA-ME.md).
//  Enquanto estiver vazio, o app funciona 100% offline (salva no
//  próprio aparelho). Assim que colar o CLIENT_ID, a sincronização
//  com o Google Drive fica disponível.
// ============================================================

window.FAISCA_CONFIG = {
  APP_VERSION: "1.0.1",
  BUILD_VERSION: "v70",

  // Cole aqui o seu Client ID (termina em .apps.googleusercontent.com)
  GOOGLE_CLIENT_ID: "1060218621029-94iml7nmubbv0mdeos1qeqs2js49pfqp.apps.googleusercontent.com",

  // Opcional: Client ID do tipo "Aplicativo para computador" para o .exe.
  // Quando preenchido, o app desktop abre o login no navegador padrão.
  GOOGLE_DESKTOP_CLIENT_ID: "1060218621029-7jlo1rpo6jm77kae9aurm2up3e4ffjpd.apps.googleusercontent.com",

  // Endereco do backend de sessao (Cloudflare Worker). Quando preenchido, a
  // versao web renova o acesso ao Drive sem pedir login novamente. O .exe e o
  // .dmg continuam usando a propria sessao local.
  DRIVE_SESSION_API: "https://faisca-auth.dincreation.workers.dev",

  // Nome do arquivo que guarda seus dados no Drive de cada pessoa.
  // Não precisa mudar.
  DRIVE_FILE_NAME: "faisca-dados.json",

  // Só o acesso ao próprio arquivo do app. Não mexa nisso.
  DRIVE_SCOPE: "https://www.googleapis.com/auth/drive.file",
};
