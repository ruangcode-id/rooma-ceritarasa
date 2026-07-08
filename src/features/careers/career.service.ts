import { prisma } from "@/infrastructure/database/prisma";
import { buildPaginationMeta } from "@/lib/pagination";
import type {
  AdminCareerApplicationListQuery,
  AdminCareerListQuery,
  ApplyCareerInput,
  CreateCareerJobInput,
  PublicCareerListQuery,
  UpdateCareerJobInput,
} from "@/features/careers/career.validation";
import {
  deleteFromCloudinary,
  uploadToCloudinary,
} from "@/lib/cloudinary";

const CAREER_CV_FOLDER = "rooma/careers/cv";

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

type CareerApplicationWithJobRecord = {
  id: string;
  jobId: string;
  applicantName: string;
  applicantEmail: string;
  applicantPhone: string;
  coverLetter: string | null;
  cvUrl: string;
  cvPublicId: string | null;
  status: string;
  appliedAt: Date;
  createdAt: Date;
  updatedAt: Date;
  job: {
    id: string;
    title: string;
  };
};

type CareerCvFile = {
  buffer: Buffer;
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

function serializeCareerApplicationReceipt(application: CareerApplicationWithJobRecord) {
  return {
    id: application.id,
    jobId: application.jobId,
    jobTitle: application.job.title,
    applicantName: application.applicantName,
    applicantEmail: application.applicantEmail,
    applicantPhone: application.applicantPhone,
    coverLetter: application.coverLetter,
    cvUrl: application.cvUrl,
    status: application.status,
    appliedAt: application.appliedAt.toISOString(),
  };
}

function serializeAdminCareerApplication(application: CareerApplicationWithJobRecord) {
  return {
    id: application.id,
    jobId: application.jobId,
    job: {
      id: application.job.id,
      title: application.job.title,
    },
    applicantName: application.applicantName,
    applicantEmail: application.applicantEmail,
    applicantPhone: application.applicantPhone,
    coverLetter: application.coverLetter,
    cvUrl: application.cvUrl,
    status: application.status,
    appliedAt: application.appliedAt.toISOString(),
  };
}

async function uploadCareerCv(file: CareerCvFile) {
  const result = await uploadToCloudinary(file.buffer, {
    folder: CAREER_CV_FOLDER,
    resourceType: "raw",
  });

  return {
    cvUrl: result.secure_url,
    cvPublicId: result.public_id,
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

export async function createCareerApplication(
  jobId: string,
  input: ApplyCareerInput,
  cvFile: CareerCvFile,
) {
  const job = await prisma.careerJob.findUnique({
    where: { id: jobId },
    select: {
      id: true,
      title: true,
      isOpen: true,
    },
  });

  if (!job || !job.isOpen) {
    throw new Error("CAREER_JOB_CLOSED_OR_NOT_FOUND");
  }

  const uploadedCv = await uploadCareerCv(cvFile);

  try {
    const application = await prisma.careerApplication.create({
      data: {
        jobId: job.id,
        applicantName: input.applicantName,
        applicantEmail: input.applicantEmail,
        applicantPhone: input.applicantPhone,
        coverLetter: input.coverLetter,
        cvUrl: uploadedCv.cvUrl,
        cvPublicId: uploadedCv.cvPublicId,
      },
      include: {
        job: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    return serializeCareerApplicationReceipt(application);
  } catch (error) {
    await deleteFromCloudinary(uploadedCv.cvPublicId, "raw").catch(
      (deleteError) => {
        console.error("Failed to cleanup uploaded career CV:", deleteError);
      },
    );
    throw error;
  }
}

export async function listAdminCareerApplications(
  query: AdminCareerApplicationListQuery,
) {
  const where = {
    ...(query.jobId ? { jobId: query.jobId } : {}),
    ...(query.status ? { status: query.status } : {}),
    ...(query.search
      ? {
          OR: [
            {
              applicantName: {
                contains: query.search,
                mode: "insensitive" as const,
              },
            },
            {
              applicantEmail: {
                contains: query.search,
                mode: "insensitive" as const,
              },
            },
            {
              applicantPhone: {
                contains: query.search,
                mode: "insensitive" as const,
              },
            },
          ],
        }
      : {}),
  };
  const skip = (query.page - 1) * query.limit;

  const [applications, total] = await Promise.all([
    prisma.careerApplication.findMany({
      where,
      skip,
      take: query.limit,
      orderBy: { appliedAt: "desc" },
      include: {
        job: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    }),
    prisma.careerApplication.count({ where }),
  ]);

  return {
    data: applications.map(serializeAdminCareerApplication),
    meta: buildPaginationMeta(total, query.page, query.limit),
  };
}

export async function getAdminCareerApplication(id: string) {
  const application = await prisma.careerApplication.findUnique({
    where: { id },
    include: {
      job: {
        select: {
          id: true,
          title: true,
        },
      },
    },
  });

  return application ? serializeAdminCareerApplication(application) : null;
}
