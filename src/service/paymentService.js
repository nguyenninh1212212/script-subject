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
import subscriptionService from "./subscriptionService.js";

const PAYPAL_SUCCESS_URL = process.env.PAYPAL_SUCCESS_URL;
const PAYPAL_CANCEL_URL = process.env.PAYPAL_CANCEL_URL;

const createPayment= async({
  userId,
  planId,
  amount,
  method,
  status,
  paymentType,
  transactionId,
  currencyCode,
})=> {
  const subscription = await subscriptionService.createSubscription({userId,planId});
  return await Payment.create({
    userId,
    subscriptionId:subscription.id,
    amount,
    method,
    status,
    paymentType,
    transactionId,
    currencyCode,
  });

}

const createOrderPaypal= async({ planId, userId }, geo) =>{
  const plan = await SubscriptionPlan.findByPk(planId);
  if (!plan) {
    notFound("Subscription plan not found");
  }
  const priceAsNumber = plan.price; 
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
        reference_id: `${planId}|${userId}`,
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

const getPaymentHistory=async ({userId})=>{
   return await Payment.findAll({
    where: { userId },
    attribute:["id","amount","method","status","transactionId","paymentType","createdAt","subscriptionId","currencyCode"]
  });
}

export default { createPayment, createOrderPaypal,getPaymentHistory };
