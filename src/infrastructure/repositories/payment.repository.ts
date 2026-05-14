// Payment repository — Prisma data access layer

import { prisma } from "@/infrastructure/database/prisma";
import { Prisma, PaymentStatus, PaymentType } from "@/generated/prisma/client";
import type { PaymentEntity } from "@/domain/payment/types";

function toPaymentEntity(row: {
	id: string;
	reservationId: string;
	type: string;
	amount: unknown;
	status: PaymentStatus;
	midtransOrderId: string | null;
	midtransTxnId: string | null;
	paymentMethod: string | null;
	paidAt: Date | null;
	createdAt: Date;
}): PaymentEntity {
	return {
		id: row.id,
		reservationId: row.reservationId,
		type: row.type as PaymentEntity["type"],
		amount: Number(row.amount),
		status: row.status,
		midtransOrderId: row.midtransOrderId,
		midtransTxnId: row.midtransTxnId,
		paymentMethod: row.paymentMethod,
		paidAt: row.paidAt,
		createdAt: row.createdAt,
	};
}

export type PaymentListFilter = {
	skip?: number;
	take?: number;
	status?: PaymentStatus;
	orderId?: string;
};

export type CreatePaymentInput = {
	reservationId: string;
	type: PaymentType;
	amount: number;
	status: PaymentStatus;
	midtransOrderId: string;
};

export const paymentRepository = {
	createPayment: async (input: CreatePaymentInput) => {
		const created = await prisma.payment.create({
			data: {
				reservationId: input.reservationId,
				type: input.type,
				amount: input.amount,
				status: input.status,
				midtransOrderId: input.midtransOrderId,
			},
		});

		return toPaymentEntity(created);
	},

	listPayments: async (filter: PaymentListFilter) => {
		const { skip = 0, take = 20, status, orderId } = filter;
		const where: Prisma.PaymentWhereInput = {};

		if (status) {
			where.status = status;
		}

		if (orderId) {
			where.OR = [
				{
					midtransOrderId: {
						contains: orderId,
						mode: "insensitive",
					},
				},
				{ id: orderId },
			];
		}

		const [rows, total] = await Promise.all([
			prisma.payment.findMany({
				where,
				skip,
				take,
				orderBy: { createdAt: "desc" },
			}),
			prisma.payment.count({ where }),
		]);

		return {
			rows: rows.map(toPaymentEntity),
			total,
		};
	},

	findByOrderId: async (orderId: string) => {
		const payment = await prisma.payment.findFirst({
			where: {
				OR: [{ midtransOrderId: orderId }, { id: orderId }],
			},
		});

		return payment ? toPaymentEntity(payment) : null;
	},

	updateStatusByOrderId: async (orderId: string, status: PaymentStatus) => {
		const payment = await prisma.payment.findFirst({
			where: {
				OR: [{ midtransOrderId: orderId }, { id: orderId }],
			},
		});

		if (!payment) return null;

		const shouldSetPaidAt = status === "paid" && !payment.paidAt;

		const updated = await prisma.payment.update({
			where: { id: payment.id },
			data: {
				status,
				...(shouldSetPaidAt ? { paidAt: new Date() } : {}),
			},
		});

		return toPaymentEntity(updated);
	},

	refundByOrderId: async (orderId: string) => {
		const payment = await prisma.payment.findFirst({
			where: {
				OR: [{ midtransOrderId: orderId }, { id: orderId }],
			},
		});

		if (!payment) return null;

		const updated = await prisma.payment.update({
			where: { id: payment.id },
			data: {
				status: "refunded",
			},
		});

		return toPaymentEntity(updated);
	},

	updateFromWebhook: async (args: {
		orderId: string;
		status: PaymentStatus;
		paymentMethod?: string | null;
		midtransTxnId?: string | null;
		paidAt?: Date | null;
	}) => {
		const payment = await prisma.payment.findFirst({
			where: {
				OR: [{ midtransOrderId: args.orderId }, { id: args.orderId }],
			},
		});

		if (!payment) return null;

		const updated = await prisma.payment.update({
			where: { id: payment.id },
			data: {
				status: args.status,
				midtransTxnId: args.midtransTxnId ?? payment.midtransTxnId,
				paymentMethod: args.paymentMethod ?? payment.paymentMethod,
				paidAt: args.paidAt ?? payment.paidAt,
			},
		});

		return toPaymentEntity(updated);
	},
};
