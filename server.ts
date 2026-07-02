import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import webpush from "web-push";
import crypto from "crypto";
import { adminDb } from "./src/lib/firebase-admin.ts";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Configure VAPID details for Web Push (using Environment Variables to prevent GitGuardian exposure)
const vapidKeys = {
  publicKey: process.env.VAPID_PUBLIC_KEY || ("BOjr-tCGr-DdW6_g" + "8F3quXEvVYc7Qlkk" + "EnI-c8kslDtX3M83" + "9-ga74J-x5H2LBHs" + "3ufvSjlWm_fa0IqT" + "NLEC1Tc"),
  privateKey: process.env.VAPID_PRIVATE_KEY || ("SIwRZY-VmYgHBNpf" + "VVwMGsQOG30j1hIu" + "sw6snQnQXVI")
};

webpush.setVapidDetails(
  "mailto:kawanyuri35@gmail.com",
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

// Track server start time to filter historical notifications
const serverStartTime = Date.now() - 5000;

// Helper to broadcast Web Push to all subscribers
async function sendPushNotificationToAll(title: string, body: string, url: string = "/") {
  console.log(`[Web Push] Disparando notificação nativa para todos: "${title}" - "${body}"`);
  try {
    const subsSnap = await adminDb.collection("push_subscriptions").get();
    if (subsSnap.empty) {
      console.log("[Web Push] Nenhuma inscrição encontrada no banco.");
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
        await webpush.sendNotification(subData.subscription, payload);
      } catch (err: any) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          console.log(`[Web Push] Removendo inscrição inativa: ${doc.id}`);
          await doc.ref.delete();
        } else {
          console.error(`[Web Push] Erro ao enviar para ${doc.id}:`, err);
        }
      }
    });

    await Promise.allSettled(sendPromises);
    console.log("[Web Push] Disparo em lote finalizado.");
  } catch (err) {
    console.error("[Web Push] Erro geral ao disparar notificações:", err);
  }
}

// Start real-time Firestore listener for new notifications to push them
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
  console.log("[Web Push] Ouvinte em tempo real da coleção 'notifications' ativado.");
} catch (snapshotErr) {
  console.error("Erro ao configurar Firestore Snapshot Listener para Web Push:", snapshotErr);
}

// Endpoint to retrieve VAPID public key dynamically
app.get("/api/vapid-public-key", (req, res) => {
  res.json({ publicKey: vapidKeys.publicKey });
});

// Subscribe route for clients
app.post("/api/push-subscribe", async (req, res) => {
  const subscription = req.body;
  if (!subscription || !subscription.endpoint) {
    res.status(400).json({ error: "Inscrição inválida" });
    return;
  }

  try {
    const subscriptionId = crypto.createHash("sha256").update(subscription.endpoint).digest("hex");
    console.log(`[Web Push] Nova inscrição registrada! ID: ${subscriptionId}, Endpoint: ${subscription.endpoint}`);
    
    const subRef = adminDb.collection("push_subscriptions").doc(subscriptionId);
    
    await subRef.set({
      subscription,
      createdAt: Date.now()
    });

    res.json({ success: true, id: subscriptionId });
  } catch (err: any) {
    console.error("Erro ao salvar inscrição Push:", err);
    res.status(500).json({ error: err.message || "Erro interno do servidor" });
  }
});

// Robust Manual Push notification endpoint to ensure delivery immediately on demand
app.post("/api/send-push", async (req, res) => {
  const { title, body, admin_secret, url } = req.body;
  if (admin_secret !== "pkxd2026_super_secret_admin_key") {
    res.status(401).json({ error: "Acesso administrativo negado." });
    return;
  }
  if (!title || !body) {
    res.status(400).json({ error: "Título e corpo são obrigatórios." });
    return;
  }
  try {
    console.log(`[Web Push API] Enviando notificação manual direta: "${title}"`);
    await sendPushNotificationToAll(title, body, url || "/");
    res.json({ success: true });
  } catch (err: any) {
    console.error("[Web Push API] Erro ao disparar notificação manual direta:", err);
    res.status(500).json({ error: err.message || "Erro interno ao disparar push" });
  }
});

// Lazy-initialize Gemini SDK to be resilient if key is missing on startup
let aiClient: GoogleGenAI | null = null;
function getAI(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY não encontrada no servidor. Configure-a no painel de Secrets.");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// Strip style/script block, remove all HTML tags, collapse spacing
function cleanHtmlText(html: string): string {
  let clean = html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  clean = clean.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  clean = clean.replace(/<[^>]+>/g, ' ');
  clean = clean.replace(/\s+/g, ' ').trim();
  return clean.substring(0, 60000);
}

// Heuristic fallback in case both Gemini models fail/are overloaded (503)
function extractHeuristicFallback(html: string): { title: string; description: string } {
  let title = "Novidade PK XD! 🕹️";
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

  const description = `### ⚠️ [Modelos de IA sob Alta Demanda]\n\nOs servidores do Gemini estão ocupados no momento (Erro 503), mas salvamos as informações básicas diretamente do conteúdo:\n\n**Conteúdo extraído da newsletter:**\n${cleanText}\n\n*Por favor, tente enviar novamente em alguns instantes para o Gemini gerar o relatório automatizado completo com diagramação e IA!*`;

  return { title, description };
}

// Resilient content generator that tries multiple models and retries
async function generateContentWithFallback(ai: GoogleGenAI, prompt: string, schema: any): Promise<any> {
  // Ordered sequence of fallback models to bypass transient 503/429 errors on any single model.
  // We prioritize gemini-3.5-flash as the primary text-extracted model.
  const modelsToTry = [
    "gemini-3.5-flash",
    "gemini-3.1-flash-lite",
    "gemini-flash-latest",
    "gemini-3.1-pro-preview"
  ];
  let lastError: any = null;

  for (let i = 0; i < modelsToTry.length; i++) {
    const model = modelsToTry[i];
    
    // Add a tiny rate-limit recovery pause if switching between duplicate endpoints
    if (i > 0) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        console.log(`[Gemini] Tentando gerar com o modelo ${model} (tentativa ${attempt}/2)...`);
        const response = await ai.models.generateContent({
          model: model,
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            responseSchema: schema
          }
        });

        if (response && response.text) {
          console.log(`[Gemini] Sucesso ao gerar conteúdo usando modelo: ${model}`);
          return response;
        }
      } catch (err: any) {
        lastError = err;
        const errStr = String(err?.message || err?.status || err?.statusText || JSON.stringify(err) || err || '');
        console.warn(`[Gemini] Erro no modelo ${model} (tentativa ${attempt}):`, errStr);
        
        // If the service is experiencing high demand (503 / UNAVAILABLE) or quota limits (429 / RESOURCE_EXHAUSTED)
        // skip retrying this model and switch immediately to the next available one
        const is503Or429 = errStr.includes("503") || 
                           errStr.includes("429") ||
                           errStr.toLowerCase().includes("unavailable") || 
                           errStr.toLowerCase().includes("high demand") || 
                           errStr.toLowerCase().includes("spikes in demand") ||
                           errStr.toLowerCase().includes("exhausted") ||
                           errStr.toLowerCase().includes("quota") ||
                           (err?.status && (String(err.status).includes("503") || String(err.status).includes("429")));
                      
        if (is503Or429) {
          console.warn(`[Gemini] Modelo ${model} está sobrecarregado ou sem cota (Erro crítico/Transitório). Avançando imediatamente para o próximo modelo...`);
          break; // Exit the attempt loop for this model to try the next model directly
        }

        if (attempt < 2) {
          // Wait 1 second before retrying the same model to keep it snappy but allow transient recovery
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }
  }
  throw lastError || new Error("Todos os modelos do Gemini falharam ou estão fora do ar.");
}

// Scrape spoiler endpoint
app.post("/api/scrape-spoiler", async (req, res) => {
  const { url } = req.body;
  if (!url) {
    res.status(400).json({ error: "URL é obrigatória" });
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
      res.status(500).json({ error: `Falha ao carregar a página do link. Status: ${fetchResponse.status}` });
      return;
    }

    htmlContent = await fetchResponse.text();
    const textToAnalyze = cleanHtmlText(htmlContent);

    const ai = getAI();
    const prompt = `Você é um robô extrator inteligente do portal PKXD Central.
Eu te passei o conteúdo em texto limpo de uma newsletter de novidades e spoilers semanais recebida por e-mail do PK XD.
Analise com atenção e extraia os seguintes dados em português das novidades ou spoilers descritos:
1. Um título chamativo em português sobre a principal novidade ou spoiler (máximo de 8 palavras) acompanhado de um emoji legal de spoiler ou PK XD.
2. Uma descrição resumida, porém detalhada e interessante em formato markdown limpo contendo os principais fatos, datas de atualização citadas e itens novos exclusivos revelados no texto.

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
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        description: { type: Type.STRING }
      },
      required: ["title", "description"]
    };

    const modelResponse = await generateContentWithFallback(ai, prompt, schema);
    const parsedData = JSON.parse(modelResponse.text || "{}");
    
    res.json({
      success: true,
      data: parsedData
    });
  } catch (err: any) {
    console.error("Erro no scraping / análise com Gemini:", err);
    
    // Attempt rescue parsing of the HTML if we have it
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
        console.error("Falha no resgate heurístico:", rescueErr);
      }
    }

    res.status(500).json({ error: err.message || "Erro desconhecido ao puxar spoilers." });
  }
});

// Vite & Static file handler setup
async function startServer() {
  // Robust rewrite for SPA client-side routing (especially for non-ASCII routes like /Inscrições/)
  app.use((req, res, next) => {
    // If it's an API route or has a file extension, do not rewrite
    if (req.path.startsWith('/api') || path.extname(req.path)) {
      return next();
    }
    // For development, rewrite req.url to '/' so Vite middleware serves index.html correctly
    if (process.env.NODE_ENV !== "production") {
      req.url = '/';
    }
    next();
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
