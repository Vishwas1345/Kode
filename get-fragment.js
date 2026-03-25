const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const project = await prisma.project.findUnique({
    where: { id: "d4d6666a-b790-4802-bb4d-f65115f5d240" },
    include: {
      fragments: {
        orderBy: { createdAt: 'desc' },
        take: 1
      }
    }
  });

  if (!project) {
    console.log("No project found!");
    return;
  }
  
  const fragment = project.fragments[0];
  if (!fragment || !fragment.files) {
    console.log("No fragment or files found!");
    return;
  }
  
  const files = fragment.files;
  
  if (files['package.json']) {
    console.log("PACKAGE.JSON:", typeof files['package.json'] === 'string' ? files['package.json'] : JSON.stringify(files['package.json'], null, 2));
  }
  
  if (files['next.config.js'] || files['next.config.mjs'] || files['next.config.ts']) {
    console.log("Next Config:", files['next.config.js'] || files['next.config.mjs'] || files['next.config.ts']);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
