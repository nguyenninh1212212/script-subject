// models/comment.js
export default (sequelize, DataTypes) => {
  const Comment = sequelize.define(
    "Comment",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      content: { type: DataTypes.TEXT, allowNull: false },
    },
    {
      tableName: "comments",
      timestamps: true,
    }
  );

  return Comment;
};
