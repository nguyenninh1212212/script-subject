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
      },
      method: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM("pending", "success", "failed"),
        defaultValue: "pending",
      },
      transactionId: {
        type: DataTypes.STRING,
      },
      orderId: {
        type: DataTypes.STRING,
      },
      paymentType: {
        type: DataTypes.ENUM("SUBSCRIPTION", "ALBUM", "RENEWSUBSCRIPTION"),
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
