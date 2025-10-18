import {
  Payment,
  User,
  Subscription,
  SubscriptionPlan,
} from "../model/entity/index.js";
import client from "../config/payment_wallet/paypal.config.js";
import paypal from "@paypal/checkout-server-sdk";
import { convertCurrency } from "../util/foreignCurrency.js";
import currentMap from "../../currentCode.json" with  { type: "json" };
import { notFound } from "../middleware/errorHandler.js";

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
})=> {
   return await Payment.create({
    userId,
        amount,
    method,
    status,
    paymentType,
    transactionId,
    currencyCode,
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

const createSubscriptionOrderPaypal= async({ subscriptionId, userId ,type}, geo) =>{
  const subscription = await Subscription.findByPk(subscriptionId);
  if(!subscription) notFound("SUbscription");
  const plan = await SubscriptionPlan.findByPk(subscription);
  if (!plan) {
    notFound("Subscription plan not found");
  }
  console.log("🚀 ~ createSubscriptionOrderPaypal ~ plan.price:", plan.price)

  return createOrderPaypal({ planId, userId ,type,price:plan.price}, geo);
  
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
    attribute:["id","amount","method","status","transactionId","paymentType","createdAt","subscriptionId","currencyCode"]
  });
}

export default { createPayment, createOrderPaypal,getPaymentHistory,createSubscriptionOrderPaypal,createRenewSubOrderPaypal };
