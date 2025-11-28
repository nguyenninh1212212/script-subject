import subscriptionType from "../../enum/subscriptionType.js";

export default (sequelize, DataTypes) => {
  const SubscriptionPlan = sequelize.define("subscription_plans", {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: { type: DataTypes.STRING, allowNull: false },
    price: { type: DataTypes.FLOAT, allowNull: false },
    duration: { type: DataTypes.INTEGER, allowNull: false },

    type: {
      type: DataTypes.ENUM(...Object.values(subscriptionType)),
      allowNull: false,
    },
  });

  return SubscriptionPlan;
};
