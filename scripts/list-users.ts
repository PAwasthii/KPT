import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient({ datasources: { db: { url: process.env.DIRECT_URL } } });
const users = await prisma.user.findMany({ select: { id: true, email: true, role: true } });
console.log(JSON.stringify(users, null, 2));
await prisma.$disconnect();
