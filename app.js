const Koa = require("koa");
const app = new Koa();
const http = require("http");
const server = http.createServer(app.callback());
const io = require("socket.io")(server, { cors: true });
const { Client } = require("ssh2");

// 用于存放每个ssh客户端id
var connects = {};
// 创建ssh连接
const createSSh = (sshInfo, socket) => {
  // 如果客户端没有连接 则创建
  if (!connects[socket.id]) {
    connects[socket.id] = new Client();
  }

  const conn = connects[socket.id];
  // 可云(www.vpske.cn)
  conn
    .on("ready", () => {
      console.log(sshInfo.host + "已成功连接");
      socket.emit(
        "ssh-data",
        "*** 欢迎使用webSSh " + sshInfo.host + "连接成功 ***\r\n"
      );
      // 连接成功
      // ssh设置cols和rows处理界面输入字符过长显示问题
      conn.shell(
        { cols: sshInfo.cols, rows: sshInfo.rows },
        function (err, stream) {
          if (err) {
            return socket.emit(
              "ssh-data",
              "\r\n*** SSH SHELL ERROR: " + err.message + " ***\r\n"
            );
          }

          socket.on("ssh-data", function (data) {
            stream.write(data);
          });

          stream
            .on("data", function (d) {
              socket.emit("ssh-data", d.toString("binary"));
            })
            .on("close", function () {
              ssh.end();
            });

          // 监听窗口事件
          socket.on("resize", function socketOnResize(data) {
            stream.setWindow(data.rows, data.cols);
          });
        }
      );
    })
    .on("close", () => {
      socket.emit("ssh-data", "\r\n*** SSH CONNECTION CLOSED ***\r\n");
    })
    .on("error", (err) => {
      socket.emit(
        "ssh-data",
        "\r\n*** SSH CONNECTION ERROR: " + err.message + " ***\r\n"
      );
    })
    .connect({ ...sshInfo });
};

io.on("connection", function (socket) {
  socket.on("ssh-connect", function (sshInfo) {
    console.log("有用户连接websocket");
    // 新建一个ssh连接
    createSSh(sshInfo, socket);
  });

  socket.on("disconnect", function () {
    console.log("有用户断开连接websocket");
  });
});

server.listen(3000, () => {
  console.log("http://localhost:3000");
});
