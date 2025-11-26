import {
  Payment,
  Subscription,
  SubscriptionPlan,
} from "../model/entity/index.js";
import client from "../config/payment_wallet/paypal.config.js";
import paypal from "@paypal/checkout-server-sdk";
import { convertCurrency } from "../util/foreignCurrency.js";
import currentMap from "../../currentCode.json" with  { type: "json" };
import { alreadyExist, notFound } from "../middleware/errorHandler.js";
import moment from "moment";
import { Op } from "sequelize";
const PAYPAL_SUCCESS_URL = process.env.PAYPAL_SUCCESS_URL;
const PAYPAL_CANCEL_URL = process.env.PAYPAL_CANCEL_URL;

const createPayment= async({
  userId,
  amount,
  method,
  status,
  paymentType,
  transactionId,
  currencyCode,
  desciption,
  orderId
})=> {
   return await Payment.create({
    userId,
    amount,
    method,
    status,
    paymentType,
    transactionId,
    currencyCode,
    desciption ,
    orderId
  });

}

const createOrderPaypal =async({planId,userId,type,price},geo)=>{
  const priceAsNumber = price; 
  const country = geo ? geo.country : "US";
  const current =currentMap[country]
  const currencyCode = country ? current.code : "USD";
  const convertedValue = await convertCurrency(priceAsNumber, "USD", currencyCode);
  let formattedValue;
  if (current.zero) {
        formattedValue = Math.round(convertedValue).toString();
    } else {
        formattedValue = convertedValue.toFixed(2);
    }

  const request = new paypal.orders.OrdersCreateRequest();
  request.prefer("return=representation");
  request.requestBody({
    intent: "CAPTURE",
    purchase_units: [
      {
        reference_id: `${planId}|${userId}|${type}`,
        amount: {
          currency_code: currencyCode,
          value: formattedValue, 
        },
      },
    ],
    application_context: {
      return_url: PAYPAL_SUCCESS_URL,
      cancel_url: PAYPAL_CANCEL_URL,
    },
  });

  const order = await client().execute(request);
  const approveUrl = order.result.links.find((l) => l.rel === "approve").href;
  return approveUrl;
}

const createSubscriptionOrderPaypal= async({ planId, userId ,type,paymentType}, geo) =>{
    const plan = await SubscriptionPlan.findByPk(planId);
    if (!plan) {
     notFound("Subscription plan");
    }
  const subscription = await Subscription.count({where:{userId :userId,status:"ACTIVE"},
    include:[
      {
        model:SubscriptionPlan,
        as:"plan",
        where:{type:type},
      }
      ]} );

  if(subscription > 0) alreadyExist("Subscription");

  return createOrderPaypal({ planId, userId ,type:paymentType,price:plan.price}, geo);
}

const createRenewSubOrderPaypal= async({ id, userId ,type}, geo) =>{
  const subscription = await Subscription.findByPk(id);
  if (!subscription) {
    notFound("Subscription plan not found");
  }
  const plan = await SubscriptionPlan.findByPk(subscription.planId);
if (!plan) {
    notFound("Subscription plan not found");
  }

  return createOrderPaypal({ id, userId ,type,price:plan.price}, geo);
  
}

const getPaymentHistory=async ({userId})=>{
   return await Payment.findAll({
    where: { userId },
    attributes:["id","amount","method","status","transactionId","paymentType","createdAt","currencyCode"]
  });
}

const getPaymentOrder = async (orderId) => {
  const order = await Payment.findOne({
    where: { orderId },
    attributes: [
      "id",
      "amount",
      "method",
      "status",
      "transactionId",
      "paymentType",
      "createdAt",
      "currencyCode",
      "orderId",
    ],
    raw: true,
  });

  if (!order) return null;

  const subscription = await Subscription.findOne({
    where: { transactionId: order.transactionId },
    include: [
      {
        model: SubscriptionPlan,
        as: "plan",
        attributes: ["id", "name", "type", "price","duration"],
      },
    ],
  });

  return {
    order: {
      ...order,
      item: subscription?.plan || null,
    },
  };
};

const totalPayment = async () => {
  const start = moment().startOf("month").toDate();
  const end = moment().endOf("month").toDate();

  const payments = await Payment.findAll({
    where: {
      createdAt: {
        [Op.between]: [start, end],
      },
    },
    attributes:["amount"]
  });
  const total = payments.reduce((acc, p) => acc + Number(p.amount), 0);

  return total;
};

export default { createPayment, createOrderPaypal,getPaymentHistory,createSubscriptionOrderPaypal,createRenewSubOrderPaypal, getPaymentOrder ,totalPayment};
