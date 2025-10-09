// subscription.js
import subscriptionStatus from "../../enum/subscriptionStatus.js";

export default (sequelize, DataTypes) => {
  const Subscription = sequelize.define(
    "Subscription",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      planId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM(...Object.values(subscriptionStatus)),
        defaultValue: subscriptionStatus.ACTIVE,
      },
      expiresAt: {
        type: DataTypes.DATE,
        allowNull: false,
      },
    },
    {
      indexes: [
        {
          unique: true,
          fields: ["userId", "planId"],
        },
      ],
    },
    {
      tableName: "subscriptions",
      freezeTableName: true,
      timestamps: true,
    }
  );

  return Subscription;
};
