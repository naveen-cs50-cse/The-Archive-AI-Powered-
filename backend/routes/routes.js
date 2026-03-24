import express from 'express';
const router = express.Router();
import fs from 'fs';
import getembedding from '../services/gemini_ai.js';
import generateAnswer from './groq_ai.js'
import { exit } from 'process';
import authMiddleware from '../middleware/auth.js';

import prisma from '../db.js';

import cleanup from '../clean.js';

const filepath = './data/notes.json'
// const userId = "9f0b201c-2c48-40ed-ac6e-36067c0c8211"

let chatHistory = [];
console.log("\nchat history : ", chatHistory)

router.get('/notes', authMiddleware , async (req, res) => {
    try {
        // const data = fs.readFileSync(filepath, 'utf-8');
        // const notes = JSON.parse(data);
        const userId = req.userId;

        const notes = await prisma.note.findMany({
            where: { userId },
            orderBy: { createdAt: "desc" }
        });

        res.json(notes);
    }
    catch (err) {
        res.json(err)
        console.log(err);
    }
})

router.post('/write', authMiddleware, async (req, res) => {
    try {
        const { text } = req.body
        if (!text) {
            console.log("no text found\n");
            return;
        }
        // const data=fs.readFileSync(filepath,'utf-8');
        // const notes=JSON.parse(data);

        const userId = req.userId;

        // 1. Save full note to DB
        const note = await prisma.note.create({
            data: {
                content: text,
                userId
            }
        });

        // console.log("note  in write :",note);

        const chunks = chunkText(text);

        for (const chunk of chunks) {
            const embedding = await getembedding(chunk);

            await prisma.chunk.create({
                data: {
                    text: chunk,
                    embedding: JSON.stringify(embedding), // DB stores as string
                    noteId: note.id
                }
            });

            // notes.push({
            //     id: Date.now().toString(),
            //     text: chunk,
            //     embedding: embedding,
            //     createdAt: new Date().toISOString()
            // });
        }
        // fs.writeFileSync(filepath, JSON.stringify(notes, null, 2));

        res.json({ msg: "NOTE added sucessfully" })

        // const data=fs.readFileSync(filepath,'utf-8');
        // const notes=JSON.parse(data);
        // const e=await getembedding(text);

        // const newnote={
        //     id : Date.now().toString(),
        //     text:text.trim().replace(/\s+/g, " "),
        //     embedding:e,
        //     createdat: new Date().toISOString()
        // };

        // notes.push(newnote);

    }
    catch (err) {
        console.log("note adding error", err);
    }
})

function cosineSimilarity(vecA, vecB) {

    // console.log("vec a :::: ",vecA,"\n\n\n","vec B is : ",vecB);
    if (vecA.length != vecB.length) {
        console.log("vector lenght not same");
        return;
    }

    let dotproduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
        dotproduct += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
    }

    return dotproduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

router.post('/query', authMiddleware ,async (req, res) => {
    const { text } = req.body;
    try {

        const queryembedding = await getembedding(text);

        const userId = req.userId;


        // const notes = await JSON.parse(fs.readFileSync(filepath, 'utf-8'));
        const chunks = await prisma.chunk.findMany({
            where: {
                note: { userId } // only this user's notes
            },
            include: {
                note: true // so we can access chunk.note.content
            }
        });

        const parsed = chunks.map(c => ({
            ...c,
            embedding: JSON.parse(c.embedding)
        }));

        // 4. Calculate similarity for each chunk
        const results = parsed.map(item => {
            const similarity = cosineSimilarity(queryembedding, item.embedding);
            const boost = keywordScore(text, item.text);
            return {
                id: item.id,
                text: item.text,
                similarity: similarity + boost,
                boost
            };
        });


        // const results = await notes.map((item) => {
        //     const similarity = cosineSimilarity(queryembedding, item.embedding);
        //     const boost = keywordScore(text, item.text);

        //     return {
        //         id: item.id,
        //         text: item.text,
        //         similarity: similarity + boost,
        //         boost
        //     };
        // })

        let min = 0.7;
        let finalResults = [];
        while (finalResults.length == 0) {
            finalResults = results
                .filter(r => r.similarity > min)
                .sort((a, b) => b.similarity - a.similarity)
                .slice(0, 5);

            // console.log(finalResults)
            min -= 0.05;
        }

        const uniqueResults = [];
        const seen = new Set();

        for (const r of finalResults) {
            if (!seen.has(r.text)) {
                seen.add(r.text);
                uniqueResults.push(r);
            }
        }



        //   const messages = [
        //     {
        //         role: "system",
        //         content: "You are a helpful AI. Use the context and conversation history."
        //     },
        //     ...chatHistory.slice(-6), // last 6 messages only
        //     {
        //         role: "system",
        //         content: `Context:\n${uniqueResults}`
        //     }
        // ];
        // console.log("query chat history : ",chatHistory)

        const answer = await generateAnswer(text, uniqueResults, chatHistory);
        await prisma.chat.create({
            data: { role: "user", content: text, userId }
        });
        await prisma.chat.create({
            data: { role: "assistant", content: answer, userId }
        });

        chatHistory.push({ role: "user", content: text });
        chatHistory.push({ role: "Assistant", content: answer });
        //   console.log(chatHistory)
        res.json({
            answer,
            sources: uniqueResults
        });
    }
    catch (err) {
        console.log(err);
    }
})


function chunkText(text, options = {}) {

    const words = text.split(/\s+/);
    const totalWords = words.length;
    const paragraphs = text.split(/\n+/).map(p => p.trim()).filter(Boolean);
    const paraCount = paragraphs.length;

    // const paragraphs = text.split(/\n+/).filter(p => p.trim());

    let maxWords;
    let overlap;
    if (totalWords < 100) {
        maxWords = 20;
        overlap = 5;
    }
    else if (totalWords < 200) {
        maxWords = 100;
        overlap = 20;
    } else if (totalWords < 1000) {
        maxWords = 150;
        overlap = 30;
    } else {
        maxWords = 250;
        overlap = 50;
    }
    // const {
    //     maxWords = 200,   // max words per chunk
    //     overlap = 50      // overlap between chunks
    // } = options;

    if (!text) return [];

    // 1. Split into paragraphs first (semantic split)

    const chunks = [];

    for (const para of paragraphs) {
        const words = para.split(/\s+/);

        // If paragraph is small → keep as one chunk
        if (words.length <= maxWords) {
            chunks.push(para);
        } else {
            // 2. Sliding window for large paragraphs
            for (let i = 0; i < words.length; i += (maxWords - overlap)) {
                const chunkWords = words.slice(i, i + maxWords);
                const chunk = chunkWords.join(" ");
                chunks.push(chunk);
            }
        }
    }

    return chunks;
}

function keywordScore(query, text) {
    let queryWords = query.toLowerCase().split(" ");
    const textLower = text.toLowerCase().replace(/\s+/g, '');

    let score = 0;

    for (const word of queryWords) {
        if (textLower.includes(word)) {
            score += 0.5; // small boost
        }
    }

    return score;
}




router.get('/reset',(req,res)=>{
    cleanup();
})

export default router;