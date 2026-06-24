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
import_dotenv.default.config();
var app = (0, import_express.default)();
var PORT = 3e3;
app.use(import_express.default.json());
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
