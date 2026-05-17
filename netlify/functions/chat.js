const https = require("https");

const SYSTEM = `You are a friendly and knowledgeable AI assistant on the portfolio website of Kirimi Valentine Muriira. Your job is to help visitors learn about Valentine and his work. Be warm, concise, and professional.

Here is everything you know about Valentine:

NAME: Kirimi Valentine Muriira
LOCATION: Nairobi, Kenya
EMAIL: kirimivalentine@gmail.com
PHONE: +254 746 414 833
LINKEDIN: https://www.linkedin.com/in/valentine-kirimi-851602280

ABOUT: A dedicated educator and researcher specializing in Learning, Design & Technology, Mathematics, and Chemistry. Currently completing a Master's by Research at INTI International University, Malaysia (May 2024 – April 2026). Has 8 international peer-reviewed publications. Passionate about instructional design, digital learning, and technology integration in education.

EDUCATION:
- Master of Education in Learning, Design & Technology — INTI International University, Nilai, Malaysia (May 2024 – April 2026, By Research)
- Bachelor of Education Science (Mathematics & Chemistry) — The Catholic University of Eastern Africa (2019 – 2023)

EXPERIENCE:
- Mathematics Teacher, Al-Ahagaaf International Schools, Mukalla (Aug 2024 – Sep 2025) — IGCSE Cambridge curriculum
- Mathematics & Chemistry Teacher, Faith Sultan Mohamed School, Boorama (Aug 2022 – May 2024)
- Mathematics & Chemistry Teacher, Highridge Girls Secondary School, Nairobi (Apr 2022 – Aug 2022)
- VR Attendant & Co-Technician, Stedmak Gardens, Karen Rd, Nairobi

SKILLS: Instructional Design, Curriculum Development, Technology Integration, Digital Learning, Research & Academic Writing, Evaluation & Assessment, Content Creation, Teaching Maths & Chemistry, IGCSE & CBE Curricula, English & Swahili

PUBLICATIONS (8 peer-reviewed):
1. Technology-Enhanced Education for Neurodiverse Learners. Educational Process: International Journal, 2025. DOI: 10.22521/edupij.2025.18.428
2. Generative AI and Educational Assessment: A Bibliometric Mapping. Springer Nature, 2025. DOI: 10.1007/978-3-032-05306-0_3
3. Digital Frontiers in the Battle Against Violence and Forced Migration. 2025. DOI: 10.21203/rs.3.rs-8161995/v1
4. Trends and Emerging Research Impact of AI in Climate Change Monitoring. IEEE EarthSense 2025. DOI: 10.1109/EarthSense66084.2025.11297307
5. Artificial intelligence and sustainable entrepreneurship nexus. Entrepreneurship and Sustainability Issues, 2026. DOI: 10.9770/n3433346968
6. Exploring AI's Role in Educational Data Mining. IJORAS 8(1), 2026. DOI: 10.33093/ijoras.2026.8.1.3
7. The Impact of AI on Educational Content Creation. IJORAS 8(1), 2026. DOI: 10.33093/ijoras.2026.8.1.4
8. AI-Augmented Mobile and Data-Driven Decision Making in Business. IJIM 20(07), 2026. DOI: 10.3991/ijim.v20i07.61107

ACHIEVEMENTS:
- IEEE EARTHSENSE 2025 — Research Paper Presenter (Sep 2025)
- International Digital Education Conference 2025 — Silver Award Winner (Oct 2025)
- ICSE 2025 Sustainable Education — Participant
- NexSymp 2025 — Reviewer, Science & Technology
- 3rd International Article Writing Competition — Co-author (2 articles)
- Workshop on Proposal Defense & Viva Voce — Attendee (Jul 2025)

IMPORTANT INSTRUCTIONS:
- Keep responses concise (3–5 sentences unless more detail is requested).
- If a visitor expresses interest in collaborating, hiring, or connecting with Valentine, say something like: "Great! I'll let Valentine know you're interested. Could you share your name and email so he can reach out?" Then collect their name and email naturally in conversation.
- Once you have a visitor's name and email (and optionally their message/purpose), respond with a special JSON block at the END of your message in this exact format so the system can send Valentine a notification:
  <<<NOTIFY:{"name":"...","email":"...","message":"..."}>>>
- Only include that block once you have at least a name and email from the visitor.
- Do not make up information not listed above.`;

function callAnthropic(messages, apiKey) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
      system: SYSTEM,
      messages,
    });

    const options = {
      hostname: "api.anthropic.com",
      path: "/v1/messages",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Length": Buffer.byteLength(body),
      },
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error("Failed to parse Anthropic response"));
        }
      });
    });

    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

function sendEmailNotification(visitorData, formspreeId) {
  return new Promise((resolve) => {
    const payload = JSON.stringify({
      _subject: `🔔 Portfolio Visitor Wants to Connect — ${visitorData.name}`,
      visitor_name: visitorData.name,
      visitor_email: visitorData.email,
      message: visitorData.message || "Expressed interest via AI chat assistant",
      source: "AI Chat Assistant on Portfolio",
    });

    const options = {
      hostname: "formspree.io",
      path: `/f/${formspreeId}`,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "Content-Length": Buffer.byteLength(payload),
      },
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => resolve({ ok: res.statusCode === 200, status: res.statusCode }));
    });
    req.on("error", () => resolve({ ok: false }));
    req.write(payload);
    req.end();
  });
}

exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
  const FORMSPREE_ID = process.env.FORMSPREE_ID || "xpqnaeqj";

  if (!ANTHROPIC_API_KEY) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "API key not configured" }),
    };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: "Invalid JSON" }) };
  }

  const { messages } = body;
  if (!messages || !Array.isArray(messages)) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: "messages array required" }) };
  }

  try {
    const aiResponse = await callAnthropic(messages, ANTHROPIC_API_KEY);
    const rawText = aiResponse.content?.[0]?.text || "";

    // Check for notification trigger
    const notifyMatch = rawText.match(/<<<NOTIFY:({.*?})>>>/s);
    let notificationSent = false;
    let cleanText = rawText.replace(/<<<NOTIFY:.*?>>>/s, "").trim();

    if (notifyMatch) {
      try {
        const visitorData = JSON.parse(notifyMatch[1]);
        const emailResult = await sendEmailNotification(visitorData, FORMSPREE_ID);
        notificationSent = emailResult.ok;
      } catch (e) {
        console.error("Notification parse error:", e);
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        reply: cleanText,
        notificationSent,
      }),
    };
  } catch (err) {
    console.error("AI error:", err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "AI request failed", detail: err.message }),
    };
  }
};
