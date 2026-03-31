const DEFAULT_MODEL = process.env.CHAT_MODEL_ID || process.env.CLAUDE_MODEL_ID || 'anthropic/claude-3.5-haiku';
const OPENROUTER_BASE_URL = process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1';
const OPENROUTER_APP_NAME = process.env.OPENROUTER_APP_NAME || 'MindBridge';
const OPENROUTER_SITE_URL = process.env.OPENROUTER_SITE_URL || 'https://mindbridge.local';

const SYSTEM_PROMPT = `You are MindBridge, a calm and empathetic youth mental health support chatbot.

Goals:
- Respond with warmth, clarity, and emotional safety.
- Encourage the user to keep talking.
- Avoid sounding clinical or robotic.
- Never shame, judge, or overwhelm the user.
- Keep each reply concise: usually 2-5 sentences.

Safety:
- If the user mentions suicide, self-harm, or immediate danger, acknowledge urgency, encourage contacting a trusted adult or emergency/crisis help immediately, and keep the tone calm and supportive.
- Do not claim to be a doctor.
- Do not provide harmful instructions.

Style:
- Use plain, supportive language.
- Ask at most one gentle follow-up question.
- Do not use markdown or bullet points in the reply.`;

const generateFallbackResponse = (userMessage) => {
  const msg = userMessage.toLowerCase();

  if (/suicid|self.harm|kill myself|end my life|no point living/.test(msg)) {
    return "I'm really glad you told me this. What you're describing sounds urgent, and I want to encourage you to reach out to a trusted adult, local emergency support, or a crisis helpline right now. If you want, you can stay here with me while we think about the safest next step.";
  }
  if (/depress|hopeless|worthless|numb|empty|hate myself/.test(msg)) {
    return "That sounds really heavy, and you don't have to carry it alone. I'm here with you, and what you're feeling matters. When did this start feeling this intense?";
  }
  if (/anxious|anxiety|panic|stress|overwhelm|scared/.test(msg)) {
    return "It sounds like your mind and body are carrying a lot right now. Try taking one slow breath with me, and let's focus on the biggest thing making today feel hard. What feels most overwhelming at this moment?";
  }
  if (/bully|bullied|harass|threatened|scared of someone/.test(msg)) {
    return "I'm sorry you're going through that. You did the right thing by speaking up, and you deserve to feel safe. Do you want to tell me what happened most recently?";
  }
  if (/family|parents|mom|dad|fight at home|domestic/.test(msg)) {
    return "That sounds painful, especially when home doesn't feel calm or safe. I'm here to listen without judgment. What has been happening at home lately?";
  }
  if (/friend|peer|social|lonely|no one understands|alone/.test(msg)) {
    return "Feeling alone can hurt a lot, and I'm glad you reached out instead of keeping it all inside. You matter here. Do you want to tell me more about what's been making you feel disconnected?";
  }
  if (/relationship|breakup|heartbreak|rejected|love/.test(msg)) {
    return "Heartbreak can feel overwhelming, and it's okay that this is affecting you deeply. I'm here to listen. What part of it is hurting the most right now?";
  }
  if (/exam|study|fail|grade|school|college|marks|academic/.test(msg)) {
    return "Academic pressure can feel exhausting, especially when it starts affecting how you see yourself. You're not alone in that. What part is weighing on you the most right now?";
  }

  return "I'm here with you, and I'm glad you reached out. This is a safe space to say what you're feeling. What has been the hardest part of today?";
};

const buildMessages = (chatSession) => {
  const recentMessages = chatSession.messages.slice(-12).map((message) => ({
    role: message.sender === 'bot' ? 'assistant' : 'user',
    content: message.content,
  }));

  return [
    { role: 'system', content: SYSTEM_PROMPT },
    ...recentMessages,
  ];
};

const generateChatReply = async (chatSession, latestUserMessage) => {
  if (!process.env.OPENROUTER_API_KEY) {
    return generateFallbackResponse(latestUserMessage);
  }

  try {
    const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
      method: 'POST',
      signal: AbortSignal.timeout(30000),
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': OPENROUTER_SITE_URL,
        'X-Title': OPENROUTER_APP_NAME,
      },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        messages: buildMessages(chatSession),
        temperature: 0.7,
        max_tokens: 220,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenRouter error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content?.trim();
    return content || generateFallbackResponse(latestUserMessage);
  } catch (error) {
    console.warn('Chatbot LLM unavailable, falling back to heuristic response:', error.message);
    return generateFallbackResponse(latestUserMessage);
  }
};

module.exports = {
  generateChatReply,
  generateFallbackResponse,
};
