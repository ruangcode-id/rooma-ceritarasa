// Payment repository — Prisma data access layer

import { prisma } from "@/infrastructure/database/prisma";
import { Prisma, PaymentStatus, PaymentType } from "@/generated/prisma/client";
import type { PaymentEntity } from "@/domain/payment/types";

const UUID_REGEX =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value: string) {
	return UUID_REGEX.test(value);
}

const STATUS_PRIORITY: Record<PaymentStatus, number> = {
	refunded: 4,
	paid: 3,
	failed: 2,
	pending: 1,
};

function shouldUpgradeStatus(current: PaymentStatus, next: PaymentStatus) {
	return STATUS_PRIORITY[next] >= STATUS_PRIORITY[current];
}

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
			const orFilters: Prisma.PaymentWhereInput[] = [
				{
					midtransOrderId: {
						contains: orderId,
						mode: "insensitive",
					},
				},
			];

			if (isUuid(orderId)) {
				orFilters.push({ id: orderId });
			}

			where.OR = orFilters;
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
		const where: Prisma.PaymentWhereInput = {
			midtransOrderId: orderId,
		};

		if (isUuid(orderId)) {
			where.OR = [{ midtransOrderId: orderId }, { id: orderId }];
		}

		const payment = await prisma.payment.findFirst({
			where,
		});

		return payment ? toPaymentEntity(payment) : null;
	},

	updateStatusByOrderId: async (orderId: string, status: PaymentStatus) => {
		const where: Prisma.PaymentWhereInput = {
			midtransOrderId: orderId,
		};

		if (isUuid(orderId)) {
			where.OR = [{ midtransOrderId: orderId }, { id: orderId }];
		}

		const payment = await prisma.payment.findFirst({
			where,
		});

		if (!payment) return null;

		if (!shouldUpgradeStatus(payment.status, status)) {
			return toPaymentEntity(payment);
		}

		const shouldSetPaidAt =
			status === "paid" && payment.status !== "paid" && !payment.paidAt;
		const shouldClearPaidAt = status !== "paid" && !payment.paidAt;

		const updated = await prisma.payment.update({
			where: { id: payment.id },
			data: {
				status,
				...(shouldSetPaidAt ? { paidAt: new Date() } : {}),
				...(shouldClearPaidAt ? { paidAt: null } : {}),
			},
		});

		return toPaymentEntity(updated);
	},

	refundByOrderId: async (orderId: string) => {
		const where: Prisma.PaymentWhereInput = {
			midtransOrderId: orderId,
		};

		if (isUuid(orderId)) {
			where.OR = [{ midtransOrderId: orderId }, { id: orderId }];
		}

		const payment = await prisma.payment.findFirst({
			where,
		});

		if (!payment) return null;

		const updateData: Prisma.PaymentUpdateInput = {
			status: "refunded",
		};

		if (payment.paidAt) {
			updateData.paidAt = payment.paidAt;
		}

		console.info("[refund] BEFORE", {
			paymentId: payment.id,
			orderId,
			status: payment.status,
			paidAt: payment.paidAt,
		});
		console.info("[refund] UPDATE", updateData);

		const updated = await prisma.payment.update({
			where: { id: payment.id },
			data: updateData,
		});

		console.info("[refund] AFTER", {
			paymentId: updated.id,
			status: updated.status,
			paidAt: updated.paidAt,
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
		const where: Prisma.PaymentWhereInput = {
			midtransOrderId: args.orderId,
		};

		if (isUuid(args.orderId)) {
			where.OR = [{ midtransOrderId: args.orderId }, { id: args.orderId }];
		}

		const payment = await prisma.payment.findFirst({
			where,
		});

		if (!payment) return null;

		if (args.status === "pending" && payment.status !== "pending") {
			return toPaymentEntity(payment);
		}

		if (!shouldUpgradeStatus(payment.status, args.status)) {
			return toPaymentEntity(payment);
		}

		const shouldSetPaidAt =
			args.status === "paid" && payment.status !== "paid" && !payment.paidAt;
		const shouldClearPaidAt = args.status !== "paid" && !payment.paidAt;

		const updated = await prisma.payment.update({
			where: { id: payment.id },
			data: {
				status: args.status,
				midtransTxnId: args.midtransTxnId ?? payment.midtransTxnId,
				paymentMethod: args.paymentMethod ?? payment.paymentMethod,
				paidAt: shouldSetPaidAt
					? new Date()
					: shouldClearPaidAt
						? null
						: payment.paidAt,
			},
		});

		return toPaymentEntity(updated);
	},
};
