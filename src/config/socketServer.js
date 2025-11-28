import { createServer } from "http";
import { Server } from "socket.io";

const socketServer = () => {
  const httpServer = createServer();
  const io = new Server(httpServer, {
    cors: { origin: "*" },
  });

  const comments = {};

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("joinSong", ({ songId, user }) => {
      socket.join(songId);

      if (!comments[songId]) comments[songId] = [];

      socket.emit("updateComments", comments[songId]);
    });

    socket.on("newComment", ({ songId, user, content }) => {
      const comment = {
        id: socket.id + Date.now(),
        user,
        content,
        createdAt: new Date(),
      };

      comments[songId].push(comment);

      io.to(songId).emit("updateComments", comments[songId]);
    });

    socket.on("leaveSong", ({ songId }) => {
      socket.leave(songId);
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
    });
  });

  httpServer.listen(4000, "0.0.0.0", () =>
    console.log("Socket server running on 4000")
  );
};

export default socketServer;
