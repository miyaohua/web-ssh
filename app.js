const Koa = require("koa");
const app = new Koa();
const http = require("http");
const server = http.createServer(app.callback());
const io = require("socket.io")(server, { cors: true });
const { Client } = require("ssh2");

// 用于存放每个ssh客户端id
let connects = {};

io.on("connection", (socket) => {
  console.log("client connected");
  socket.on("ssh-connect", (sshInfo) => {
    // 如果客户端没有连接 则创建
    if (!connects[socket.id]) {
      connects[socket.id] = new Client();
    }
    const conn = connects[socket.id];

    conn.on("error", (err) => {
      console.error("连接失败:", err.message);
      socket.emit("ssh-error", err.message);
    });

    conn
      .on("ready", () => {
        conn.shell((err, stream) => {
          if (err) throw err;
          stream.on("data", (data) => {
            socket.emit("ssh-data", data.toString("utf-8"));
          });

          socket.on("ssh-command", () => {
            stream.write("\n");
          });
        });
      })
      .connect({ ...sshInfo });
  });

  // 监听客户端断开连接事件
  socket.on("disconnect", () => {
    delete connects[socket.id];
    console.log("用户已断开连接");
  });
});

server.listen(3000, () => {
  console.log("http://localhost:3000");
});
