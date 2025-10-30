// models/payment.js
export default (sequelize, DataTypes) => {
  const Payment = sequelize.define(
    "Payment",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
      }, // số tiền thanh toán
      method: {
        type: DataTypes.STRING,
        allowNull: false,
      }, // ví dụ: "credit_card", "paypal", "momo", "zaloPay"
      status: {
        type: DataTypes.ENUM("pending", "success", "failed"),
        defaultValue: "pending",
      },
      transactionId: {
        type: DataTypes.STRING,
      }, // id từ cổng thanh toán
      orderId: {
        type: DataTypes.STRING,
      }, // id từ cổng thanh toán
      paymentType: {
        type: DataTypes.ENUM("subscription", "album", "renewSubscription"),
        allowNull: false,
      },
      desciption: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      currencyCode: {
        type: DataTypes.STRING,
        allowNull: false,
      },
    },
    {
      tableName: "payments",
      timestamps: true,
    }
  );

  return Payment;
};
