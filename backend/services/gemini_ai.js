export default async function getembedding(text) {
    // const GEMINI_API_KEY="AIzaSyD-H-8_hVFpEgSLlU-NnlhPxcvoTDbS5yk"
    try {
        const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${process.env.GEMINI_API_KEY}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    model: "models/gemini-embedding-001",
                    content: {
                        parts: [{ text }]
                    }
                })
            }
        );

        const data = await res.json();
        return data.embedding.values;

    } catch (err) {
        console.log("embedding error:", err);
    }
}
