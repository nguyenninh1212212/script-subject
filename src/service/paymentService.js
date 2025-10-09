import { Payment, User, Subscription } from "../model/entity/index.js";

async function createPayment({
  userId,
  planId,
  amount,
  method,
  status,
  paymentType,
  transactionId,
}) {
  return await Payment.create({
    userId,
    planId,
    amount,
    method,
    status,
    paymentType,
    transactionId,
  });
}

async function getPaymentsByUser(userId) {
  return await Payment.findAll({
    where: { userId },
    include: [Subscription],
  });
}

export default { createPayment, getPaymentsByUser };
