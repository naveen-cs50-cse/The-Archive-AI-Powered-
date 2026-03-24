import Groq from "groq-sdk";
import dotenv from 'dotenv';
dotenv.config();

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY});

export default async function generateAnswer(query, contextChunks,messages) {

const context = contextChunks.map(c => c.text).join("\n\n");

const formattedHistory = messages
        .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
        .join("\n");

const prompt = `
You are an AI assistant. Use the provided context and past conversation to answer.

Rules:
1. Use Context to answer new questions.
2. Use Past Conversation to answer follow-up questions (e.g., "What did I just ask?").
3. If the answer is not in the context or history, say "I don't have enough information."
Use:
- bullet points
- short paragraphs
- headings

Past Conversation:
${formattedHistory}

Context:
${context}

Question:
${query}

Answer:
`;

  const completion = await groq.chat.completions.create({
	model: "llama-3.3-70b-versatile",
	messages: [{ role: "user", content: prompt }],
	temperature: 0
  });

  return completion.choices[0].message.content;
}
