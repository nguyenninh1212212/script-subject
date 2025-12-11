import {
  Payment,
  Subscription,
  SubscriptionPlan,
  User,
} from "../model/entity/index.js";
import client from "../config/payment_wallet/paypal.config.js";
import paypal from "@paypal/checkout-server-sdk";
import { convertCurrency } from "../util/foreignCurrency.js";
import currentMap from "../../currentCode.json" with  { type: "json" };
import { alreadyExist, notFound } from "../middleware/errorHandler.js";
import {sequelize} from "../model/entity/index.js";
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
const paymentGrowth = async () => { // <<< CẦN THÊM THAM SỐ
    const monthlyGrowthTemplate = [
        { month: 'Jan', revenue: 0 },
        { month: 'Feb', revenue: 0 },
        { month: 'Mar', revenue: 0 },
        { month: 'Apr', revenue: 0 },
        { month: 'May', revenue: 0 },
        { month: 'Jun', revenue: 0 },
        { month: 'Jul', revenue: 0 },
        { month: 'Aug', revenue: 0 },
        { month: 'Sep', revenue: 0 },
        { month: 'Oct', revenue: 0 },
        { month: 'Nov', revenue: 0 },
        { month: 'Dec', revenue: 0 },
    ];

    try {
        const currentYear = new Date().getFullYear();
        
        // Cú pháp PostgreSQL: EXTRACT(MONTH FROM "createdAt")
        const monthExtractor = sequelize.literal(`EXTRACT(MONTH FROM "createdAt")`);
        
        const result = await Payment.findAll({
            attributes: [
                [monthExtractor, 'monthNum'], 
                [sequelize.fn('SUM', sequelize.col('amount')), 'totalRevenue'],
            ],
            where: {
                createdAt: {
                    [Op.gte]: new Date(`${currentYear}-01-01T00:00:00.000Z`),
                    [Op.lt]: new Date(`${currentYear + 1}-01-01T00:00:00.000Z`),
                },
            },
            group: [monthExtractor],
            order: [[sequelize.literal('"monthNum"'), 'ASC']],
            raw: true,
        });

        const finalGrowthData = [...monthlyGrowthTemplate]; 

        result.forEach(item => {
            const monthIndex = parseInt(item.monthNum, 10) - 1; 

            if (monthIndex >= 0 && monthIndex < 12) {
                // Đảm bảo chuyển đổi sang float vì 'amount' là DECIMAL(10, 2)
                finalGrowthData[monthIndex].revenue = parseFloat(item.totalRevenue); 
            }
        });

        return finalGrowthData;

    } catch (error) {
        console.error("Error fetching payment growth:", error);
        return monthlyGrowthTemplate;
    }
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

  return {
    total: total,
    growth: await paymentGrowth(Payment, Payment.sequelize),
  };
};

const getAllPayments = async () => {
  return await Payment.findAll({
    attributes:["id","amount","method","status","transactionId","paymentType","createdAt","currencyCode","orderId"],
    include:[
      {
        model:User,
        as:"user",
        attributes:["id","name","email"]}]
  });
}

export default { createPayment, createOrderPaypal,getPaymentHistory,createSubscriptionOrderPaypal,createRenewSubOrderPaypal, getPaymentOrder ,totalPayment,getAllPayments};
