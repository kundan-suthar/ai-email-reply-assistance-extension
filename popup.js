document.getElementById("summarize").addEventListener("click", () => {
  let resultDiv = document.getElementById("result");
  const summaryType = document.getElementById("summary-type").value;

  resultDiv.innerHTML = '<div class="loader"></div>';

  //1️⃣ get user gemini api key
  chrome.storage.sync.get(["geminiApiKey"], ({ geminiApiKey }) => {
    if (!geminiApiKey) {
      resultDiv.textContent = "No Api key set, click the gear icon to add one.";
      return;
    }

    //2️⃣ get content from page
    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
      chrome.tabs.sendMessage(
        tab.id,
        { type: "GET_ARTICLE_TEXT" },
        async (response) => {
          if (chrome.runtime.lastError) {
            result.textContent = "Content script not available on this page";
            return;
          }

          const text = response?.text;
          if (!text) {
            resultDiv.textContent = "Coludnt extract from this page.";
            return;
          }
          try {
            const summary = await getGeminiEmailReply({
              rawText: text,
              replyType: "formal",
              apiKey: geminiApiKey,
            });
            resultDiv.textContent = summary;
          } catch (error) {
            resultDiv.textContent = "Geminin error:" + error.message;
          }
        }
      );
    });
  });
});

document.getElementById("copy").addEventListener("click", () => {
  const txt = document.getElementById("result").innerText;
  if (!txt) return;

  navigator.clipboard.writeText(txt).then(() => {
    const btn = document.getElementById("copy");
    const old = btn.textContent;
    btn.textContent = "Copied!!";
    setTimeout(() => (btn.textContent = old), 2000);
  });
});

async function getGeminiEmailReply({
  rawText,
  replyType = "neutral",
  apiKey,
  senderRole = "recipient",
}) {
  const MAX_CHARS = 180000;
  const truncatedText =
    rawText.length > MAX_CHARS
      ? rawText.slice(0, MAX_CHARS) + "\n\n[Thread truncated]"
      : rawText;

  let prompt;

  switch (replyType) {
    case "short":
      prompt = `
        You are an AI email assistant.

        Below is an email conversation thread.
        Write a SHORT and clear reply (2–3 sentences) from the perspective of the ${senderRole}.
        Do not repeat the email content.
        Do not add a subject line or signature.

        Email thread:
        """
        ${truncatedText}
        """
        `;
      break;

    case "formal":
      prompt = `
            You are an AI assistant drafting a PROFESSIONAL and FORMAL email reply.

            Instructions:
            - Be polite and professional
            - Do not assume facts not stated in the thread
            - Do not commit to deadlines unless explicitly mentioned
            - Keep the tone corporate and neutral
            - No subject line
            - No signature

            Email thread:
            """
            ${truncatedText}
            """
            `;
      break;

    case "friendly":
      prompt = `
          You are an AI assistant drafting a FRIENDLY but professional email reply.

          Guidelines:
          - Warm and collaborative tone
          - Clear and concise
          - Avoid emojis
          - No subject line or signature

          Email thread:
          """
          ${truncatedText}
          """
          `;
      break;

    case "action_required":
      prompt = `
          You are an AI assistant drafting an email reply where ACTION is required.

          Instructions:
          - Clearly acknowledge the request
          - If details are missing, politely ask for clarification
          - Do not promise delivery unless explicitly mentioned
          - Professional tone
          - No subject line or signature

          Email thread:
          """
          ${truncatedText}
          """
          `;
      break;

    default:
      prompt = `
          You are an AI email assistant.

          Draft a clear, polite, and professional reply to the latest email in the thread.
          Do not include a subject line or signature.

          Email thread:
          """
          ${truncatedText}
          """
          `;
  }

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.3,
          },
        }),
      }
    );

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error?.message || "Gemini API request failed");
    }

    const data = await res.json();

    return (
      data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ||
      "No reply could be generated."
    );
  } catch (error) {
    console.error("Gemini email reply error:", error);
    throw new Error("Failed to generate email reply.");
  }
}
