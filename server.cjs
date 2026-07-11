var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_vite = require("vite");
var import_genai = require("@google/genai");
var import_dotenv = __toESM(require("dotenv"), 1);
var import_web_push = __toESM(require("web-push"), 1);
var import_crypto = __toESM(require("crypto"), 1);

// src/lib/firebase-admin.ts
var import_app = require("firebase-admin/app");
var import_auth = require("firebase-admin/auth");
var import_firestore = require("firebase-admin/firestore");

// firebase-applet-config.json
var firebase_applet_config_default = {
  projectId: "pkxd-e817c",
  appId: "1:932539609984:web:74c5cc5650c7807e6c4765",
  apiKey: "AIzaSyBFIEDUk1UMeiNU_yv0VscVUwVyFuSffi0",
  authDomain: "pkxd-e817c.firebaseapp.com",
  storageBucket: "pkxd-e817c.firebasestorage.app",
  messagingSenderId: "932539609984",
  measurementId: "G-FSFT099FH4"
};

// src/lib/firebase-admin.ts
if (!(0, import_app.getApps)().length) {
  (0, import_app.initializeApp)({
    projectId: firebase_applet_config_default.projectId
  });
}
var adminAuth = (0, import_auth.getAuth)();
var adminDb = (0, import_firestore.getFirestore)();

// server.ts
import_dotenv.default.config();
var app = (0, import_express.default)();
var PORT = 3e3;
app.use(import_express.default.json());
var fallbackPublicKey = "BOjr-tCGr-DdW6_g8F3quXEvVYc7QlkkEnI-c8kslDtX3M839-ga74J-x5H2LBHs3ufvSjlWm_fa0IqTNLEC1Tc";
var fallbackPrivateKey = "SIwRZY-VmYgHBNpfVVwMGsQOG30j1hIusw6snQnQXVI";
function isValidPrivateKey(key) {
  if (!key) return false;
  try {
    const buf = Buffer.from(key.trim(), "base64url");
    return buf.length === 32;
  } catch (e) {
    return false;
  }
}
var vapidKeys = (() => {
  let pub = (process.env.VAPID_PUBLIC_KEY || "").trim();
  let priv = (process.env.VAPID_PRIVATE_KEY || "").trim();
  if (!pub || pub.length < 40 || !isValidPrivateKey(priv)) {
    console.log("[Web Push] Using fallback hardcoded VAPID keys because env keys were missing or invalid.");
    pub = fallbackPublicKey;
    priv = fallbackPrivateKey;
  }
  return { publicKey: pub, privateKey: priv };
})();
try {
  import_web_push.default.setVapidDetails(
    "mailto:kawanyuri35@gmail.com",
    vapidKeys.publicKey,
    vapidKeys.privateKey
  );
  console.log("[Web Push] VAPID details configured successfully.");
} catch (error) {
  console.error("[Web Push] Failed to configure VAPID details with primary keys, trying fallback keys...", error);
  try {
    import_web_push.default.setVapidDetails(
      "mailto:kawanyuri35@gmail.com",
      fallbackPublicKey,
      fallbackPrivateKey
    );
    console.log("[Web Push] Fallback VAPID details configured successfully.");
  } catch (fallbackError) {
    console.error("[Web Push] Critical: Both primary and fallback VAPID configurations failed.", fallbackError);
  }
}
var serverStartTime = Date.now() - 5e3;
async function sendPushNotificationToAll(title, body, url = "/") {
  console.log(`[Web Push] Disparando notifica\xE7\xE3o nativa para todos: "${title}" - "${body}"`);
  try {
    const subsSnap = await adminDb.collection("push_subscriptions").get();
    if (subsSnap.empty) {
      console.log("[Web Push] Nenhuma inscri\xE7\xE3o encontrada no banco.");
      return;
    }
    const payload = JSON.stringify({
      title,
      body,
      url
    });
    const sendPromises = subsSnap.docs.map(async (doc) => {
      const subData = doc.data();
      try {
        await import_web_push.default.sendNotification(subData.subscription, payload);
      } catch (err) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          console.log(`[Web Push] Removendo inscri\xE7\xE3o inativa: ${doc.id}`);
          await doc.ref.delete();
        } else {
          console.error(`[Web Push] Erro ao enviar para ${doc.id}:`, err);
        }
      }
    });
    await Promise.allSettled(sendPromises);
    console.log("[Web Push] Disparo em lote finalizado.");
  } catch (err) {
    console.error("[Web Push] Erro geral ao disparar notifica\xE7\xF5es:", err);
  }
}
try {
  adminDb.collection("notifications").onSnapshot((snapshot) => {
    snapshot.docChanges().forEach(async (change) => {
      if (change.type === "added") {
        const data = change.doc.data();
        if (data && data.createdAt && data.createdAt > serverStartTime) {
          await sendPushNotificationToAll(data.title, data.body, "/");
        }
      }
    });
  });
  console.log("[Web Push] Ouvinte em tempo real da cole\xE7\xE3o 'notifications' ativado.");
} catch (snapshotErr) {
  console.error("Erro ao configurar Firestore Snapshot Listener para Web Push:", snapshotErr);
}
app.get("/api/vapid-public-key", (req, res) => {
  res.json({ publicKey: vapidKeys.publicKey });
});
app.post("/api/push-subscribe", async (req, res) => {
  const subscription = req.body;
  if (!subscription || !subscription.endpoint) {
    res.status(400).json({ error: "Inscri\xE7\xE3o inv\xE1lida" });
    return;
  }
  try {
    const subscriptionId = import_crypto.default.createHash("sha256").update(subscription.endpoint).digest("hex");
    console.log(`[Web Push] Nova inscri\xE7\xE3o registrada! ID: ${subscriptionId}, Endpoint: ${subscription.endpoint}`);
    const subRef = adminDb.collection("push_subscriptions").doc(subscriptionId);
    await subRef.set({
      subscription,
      createdAt: Date.now()
    });
    res.json({ success: true, id: subscriptionId });
  } catch (err) {
    console.error("Erro ao salvar inscri\xE7\xE3o Push:", err);
    res.status(500).json({ error: err.message || "Erro interno do servidor" });
  }
});
app.post("/api/send-push", async (req, res) => {
  const { title, body, admin_secret, url } = req.body;
  if (admin_secret !== "pkxd2026_super_secret_admin_key") {
    res.status(401).json({ error: "Acesso administrativo negado." });
    return;
  }
  if (!title || !body) {
    res.status(400).json({ error: "T\xEDtulo e corpo s\xE3o obrigat\xF3rios." });
    return;
  }
  try {
    console.log(`[Web Push API] Enviando notifica\xE7\xE3o manual direta: "${title}"`);
    await sendPushNotificationToAll(title, body, url || "/");
    res.json({ success: true });
  } catch (err) {
    console.error("[Web Push API] Erro ao disparar notifica\xE7\xE3o manual direta:", err);
    res.status(500).json({ error: err.message || "Erro interno ao disparar push" });
  }
});
var aiClient = null;
function getAI() {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY n\xE3o encontrada no servidor. Configure-a no painel de Secrets.");
    }
    aiClient = new import_genai.GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build"
        }
      }
    });
  }
  return aiClient;
}
function cleanHtmlText(html) {
  let clean = html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "");
  clean = clean.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "");
  clean = clean.replace(/<[^>]+>/g, " ");
  clean = clean.replace(/\s+/g, " ").trim();
  return clean.substring(0, 6e4);
}
function extractHeuristicFallback(html) {
  let title = "Novidade PK XD! \u{1F579}\uFE0F";
  const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
  if (titleMatch && titleMatch[1]) {
    title = titleMatch[1].trim();
  } else {
    const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
    if (h1Match && h1Match[1]) {
      title = h1Match[1].trim();
    }
  }
  if (title.length > 50) {
    title = title.substring(0, 50) + "...";
  }
  let cleanText = cleanHtmlText(html);
  if (cleanText.length > 400) {
    cleanText = cleanText.substring(0, 400) + "...";
  }
  const description = `### \u26A0\uFE0F [Modelos de IA sob Alta Demanda]

Os servidores do Gemini est\xE3o ocupados no momento (Erro 503), mas salvamos as informa\xE7\xF5es b\xE1sicas diretamente do conte\xFAdo:

**Conte\xFAdo extra\xEDdo da newsletter:**
${cleanText}

*Por favor, tente enviar novamente em alguns instantes para o Gemini gerar o relat\xF3rio automatizado completo com diagrama\xE7\xE3o e IA!*`;
  return { title, description };
}
async function generateContentWithFallback(ai, prompt, schema) {
  const modelsToTry = [
    "gemini-3.5-flash",
    "gemini-3.1-flash-lite",
    "gemini-flash-latest",
    "gemini-3.1-pro-preview"
  ];
  let lastError = null;
  for (let i = 0; i < modelsToTry.length; i++) {
    const model = modelsToTry[i];
    if (i > 0) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        console.log(`[Gemini] Tentando gerar com o modelo ${model} (tentativa ${attempt}/2)...`);
        const response = await ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            responseSchema: schema
          }
        });
        if (response && response.text) {
          console.log(`[Gemini] Sucesso ao gerar conte\xFAdo usando modelo: ${model}`);
          return response;
        }
      } catch (err) {
        lastError = err;
        const errStr = String(err?.message || err?.status || err?.statusText || JSON.stringify(err) || err || "");
        console.warn(`[Gemini] Erro no modelo ${model} (tentativa ${attempt}):`, errStr);
        const is503Or429 = errStr.includes("503") || errStr.includes("429") || errStr.toLowerCase().includes("unavailable") || errStr.toLowerCase().includes("high demand") || errStr.toLowerCase().includes("spikes in demand") || errStr.toLowerCase().includes("exhausted") || errStr.toLowerCase().includes("quota") || err?.status && (String(err.status).includes("503") || String(err.status).includes("429"));
        if (is503Or429) {
          console.warn(`[Gemini] Modelo ${model} est\xE1 sobrecarregado ou sem cota (Erro cr\xEDtico/Transit\xF3rio). Avan\xE7ando imediatamente para o pr\xF3ximo modelo...`);
          break;
        }
        if (attempt < 2) {
          await new Promise((resolve) => setTimeout(resolve, 1e3));
        }
      }
    }
  }
  throw lastError || new Error("Todos os modelos do Gemini falharam ou est\xE3o fora do ar.");
}
app.post("/api/scrape-spoiler", async (req, res) => {
  const { url } = req.body;
  if (!url) {
    res.status(400).json({ error: "URL \xE9 obrigat\xF3ria" });
    return;
  }
  let htmlContent = "";
  try {
    const fetchResponse = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36"
      }
    });
    if (!fetchResponse.ok) {
      res.status(500).json({ error: `Falha ao carregar a p\xE1gina do link. Status: ${fetchResponse.status}` });
      return;
    }
    htmlContent = await fetchResponse.text();
    const textToAnalyze = cleanHtmlText(htmlContent);
    const ai = getAI();
    const prompt = `Voc\xEA \xE9 um rob\xF4 extrator inteligente do portal PKXD Central.
Eu te passei o conte\xFAdo em texto limpo de uma newsletter de novidades e spoilers semanais recebida por e-mail do PK XD.
Analise com aten\xE7\xE3o e extraia os seguintes dados em portugu\xEAs das novidades ou spoilers descritos:
1. Um t\xEDtulo chamativo em portugu\xEAs sobre a principal novidade ou spoiler (m\xE1ximo de 8 palavras) acompanhado de um emoji legal de spoiler ou PK XD.
2. Uma descri\xE7\xE3o resumida, por\xE9m detalhada e interessante em formato markdown limpo contendo os principais fatos, datas de atualiza\xE7\xE3o citadas e itens novos exclusivos revelados no texto.

Retorne no formato JSON exato especificado a seguir:
{
  "title": "...",
  "description": "..."
}

Newsletter PK XD:
---
${textToAnalyze}
---
`;
    const schema = {
      type: import_genai.Type.OBJECT,
      properties: {
        title: { type: import_genai.Type.STRING },
        description: { type: import_genai.Type.STRING }
      },
      required: ["title", "description"]
    };
    const modelResponse = await generateContentWithFallback(ai, prompt, schema);
    const parsedData = JSON.parse(modelResponse.text || "{}");
    res.json({
      success: true,
      data: parsedData
    });
  } catch (err) {
    console.error("Erro no scraping / an\xE1lise com Gemini:", err);
    if (htmlContent) {
      try {
        console.log("[Resgate] Ativando analisador alternativo (HTML Heuristic)...");
        const fallbackData = extractHeuristicFallback(htmlContent);
        res.json({
          success: true,
          data: fallbackData,
          isFallbackRescue: true
        });
        return;
      } catch (rescueErr) {
        console.error("Falha no resgate heur\xEDstico:", rescueErr);
      }
    }
    res.status(500).json({ error: err.message || "Erro desconhecido ao puxar spoilers." });
  }
});
async function startServer() {
  app.use((req, res, next) => {
    if (req.path.startsWith("/api") || import_path.default.extname(req.path)) {
      return next();
    }
    if (process.env.NODE_ENV !== "production") {
      req.url = "/";
    }
    next();
  });
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
