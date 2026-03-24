
export default async function getembedding(text)
{
  // console.log("text is : ",text)
  try{

    const response = await fetch("http://localhost:11434/api/embeddings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "nomic-embed-text",
        prompt: text
      })
    });
    
    const data = await response.json();
    return data.embedding ;
  }
  catch(err)
  {
    console.log("embedding.js error : ",err);
  }
}