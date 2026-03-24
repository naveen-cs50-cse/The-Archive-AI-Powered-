import prisma from './db.js';

export default async function cleanup() {
    await prisma.chat.deleteMany({});
    await prisma.chunk.deleteMany({});
    await prisma.note.deleteMany({});
    console.log("done");
    await prisma.$disconnect();
}

