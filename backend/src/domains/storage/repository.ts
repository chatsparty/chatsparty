import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const createProjectFile = (data: {
  projectId: string;
  filename: string;
  filePath: string;
  contentType: string;
  fileSize: bigint;
}) => {
  return prisma.projectFile.create({ data });
};

export const deleteProjectFiles = (projectId: string) => {
  return prisma.projectFile.deleteMany({
    where: { projectId },
  });
};

export const getProjectFiles = (projectId: string) => {
  return prisma.projectFile.findMany({
    where: { projectId },
  });
};
