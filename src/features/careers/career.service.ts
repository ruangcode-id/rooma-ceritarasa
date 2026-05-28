import { prisma } from "@/infrastructure/database/prisma";
import { buildPaginationMeta } from "@/lib/pagination";
import type {
  AdminCareerListQuery,
  CreateCareerJobInput,
  PublicCareerListQuery,
  UpdateCareerJobInput,
} from "@/features/careers/career.validation";

type CareerJobRecord = {
  id: string;
  title: string;
  description: string;
  requirements: string;
  deadline: Date | null;
  isOpen: boolean;
  createdAt: Date;
  updatedAt: Date;
  _count?: {
    applications: number;
  };
};

function getOrderBy(sort: "latest" | "oldest") {
  return { createdAt: sort === "oldest" ? ("asc" as const) : ("desc" as const) };
}

function getSearchWhere(search?: string) {
  if (!search) return {};

  return {
    OR: [
      { title: { contains: search, mode: "insensitive" as const } },
      { description: { contains: search, mode: "insensitive" as const } },
      { requirements: { contains: search, mode: "insensitive" as const } },
    ],
  };
}

function serializeAdminCareerJob(job: CareerJobRecord) {
  return {
    id: job.id,
    title: job.title,
    description: job.description,
    requirements: job.requirements,
    deadline: job.deadline?.toISOString() ?? null,
    isOpen: job.isOpen,
    createdAt: job.createdAt.toISOString(),
    updatedAt: job.updatedAt.toISOString(),
    ...(job._count ? { applicationsCount: job._count.applications } : {}),
  };
}

function serializePublicCareerJob(job: CareerJobRecord) {
  return {
    id: job.id,
    title: job.title,
    description: job.description,
    requirements: job.requirements,
    deadline: job.deadline?.toISOString() ?? null,
    createdAt: job.createdAt.toISOString(),
    updatedAt: job.updatedAt.toISOString(),
  };
}

export async function createCareerJob(input: CreateCareerJobInput) {
  const job = await prisma.careerJob.create({
    data: {
      title: input.title,
      description: input.description,
      requirements: input.requirements,
      deadline: input.deadline,
      isOpen: input.isOpen,
    },
  });

  return serializeAdminCareerJob(job);
}

export async function listAdminCareerJobs(query: AdminCareerListQuery) {
  const where = {
    ...(query.isOpen === undefined ? {} : { isOpen: query.isOpen }),
    ...getSearchWhere(query.search),
  };
  const skip = (query.page - 1) * query.limit;

  const [jobs, total] = await Promise.all([
    prisma.careerJob.findMany({
      where,
      skip,
      take: query.limit,
      orderBy: getOrderBy(query.sort),
      include: {
        _count: {
          select: { applications: true },
        },
      },
    }),
    prisma.careerJob.count({ where }),
  ]);

  return {
    data: jobs.map(serializeAdminCareerJob),
    meta: buildPaginationMeta(total, query.page, query.limit),
  };
}

export async function getAdminCareerJob(id: string) {
  const job = await prisma.careerJob.findUnique({
    where: { id },
    include: {
      _count: {
        select: { applications: true },
      },
    },
  });

  return job ? serializeAdminCareerJob(job) : null;
}

export async function updateCareerJob(id: string, input: UpdateCareerJobInput) {
  const existing = await prisma.careerJob.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!existing) {
    throw new Error("CAREER_JOB_NOT_FOUND");
  }

  const job = await prisma.careerJob.update({
    where: { id },
    data: {
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.description !== undefined
        ? { description: input.description }
        : {}),
      ...(input.requirements !== undefined
        ? { requirements: input.requirements }
        : {}),
      ...(input.deadline !== undefined ? { deadline: input.deadline } : {}),
      ...(input.isOpen !== undefined ? { isOpen: input.isOpen } : {}),
    },
    include: {
      _count: {
        select: { applications: true },
      },
    },
  });

  return serializeAdminCareerJob(job);
}

export async function closeCareerJob(id: string) {
  const existing = await prisma.careerJob.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!existing) {
    throw new Error("CAREER_JOB_NOT_FOUND");
  }

  const job = await prisma.careerJob.update({
    where: { id },
    data: { isOpen: false },
    include: {
      _count: {
        select: { applications: true },
      },
    },
  });

  return serializeAdminCareerJob(job);
}

export async function listPublicCareerJobs(query: PublicCareerListQuery) {
  const where = {
    isOpen: true,
    ...getSearchWhere(query.search),
  };
  const skip = (query.page - 1) * query.limit;

  const [jobs, total] = await Promise.all([
    prisma.careerJob.findMany({
      where,
      skip,
      take: query.limit,
      orderBy: getOrderBy(query.sort),
    }),
    prisma.careerJob.count({ where }),
  ]);

  return {
    data: jobs.map(serializePublicCareerJob),
    meta: buildPaginationMeta(total, query.page, query.limit),
  };
}

export async function getPublicCareerJob(id: string) {
  const job = await prisma.careerJob.findFirst({
    where: {
      id,
      isOpen: true,
    },
  });

  return job ? serializePublicCareerJob(job) : null;
}
