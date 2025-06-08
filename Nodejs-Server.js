const express = require("express");
const cors = require("cors");

const http = require("http");
const socketIo = require("socket.io");
const { missedOrders } = require("./missedOrdersStore");
const { NotifyUsers } = require("./NodeJs-Notification-Controller");

const app = express();
app.use(cors());
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

const clients = new Map();

// Socket.IO connection handling
io.on("connection", (socket) => {
  const clientType = socket.handshake.query.type;
  const clientTypeName = socket.handshake.query.KitchenName;
  const allowedClients = [
    "customer_frontend_app",
    "kitchen_frontend_app",
    "driver_frontend_app",
  ];

  console.log(`New connection attempt: ${clientType} - ${clientTypeName}`);

  if (allowedClients.includes(clientType)) {
    if (clientType === "kitchen_frontend_app") {
      socket.join("kitchen_room");
      console.log(`Kitchen ${clientTypeName} joined kitchen_room`);

      // Send missed orders
      const kitchenMissedOrders = missedOrders.filter(
        (o) => o.kitchen_name === clientTypeName
      );

      if (kitchenMissedOrders.length > 0) {
        console.log(
          `Found ${kitchenMissedOrders.length} missed orders for ${clientTypeName}`
        );
        kitchenMissedOrders.forEach((order) => {
          socket.emit(order.kitchen_name, order);
          console.log(`Sent missed order to ${clientTypeName}:`, order);
        });

        // Remove sent orders from missed orders array
        for (let i = missedOrders.length - 1; i >= 0; i--) {
          if (missedOrders[i].kitchen_name === clientTypeName) {
            missedOrders.splice(i, 1);
          }
        }
      }
    }

    clients.set(`${clientType}_${clientTypeName}`, socket.id);
    console.log(`Client registered: ${clientType}_${clientTypeName}`);

    socket.on("ping", () => {
      console.log(`Received ping from ${clientTypeName}`);
      socket.emit("pong");
    });

    socket.on("disconnect", (reason) => {
      clients.forEach((id, key) => {
        if (id === socket.id) {
          clients.delete(key);
          console.log(`Client disconnected: ${key} (Reason: ${reason})`);
        }
      });
    });
  } else {
    console.log(`Blocked unknown client type: ${clientType}`);
    socket.disconnect();
  }
});

// Middleware
app.use(express.json());
app.use((req, res, next) => {
  req.io = io;
  req.clients = clients;
  next();
});

// Routes
app.post("/notify", NotifyUsers);

// Test endpoint for creating orders
app.post("/test-order", express.json(), (req, res) => {
  const payload = req.body;
  const testOrder = {
    // kitchen_name: req.body.kitchen_name || "test_kitchen",
    ...payload,
    order_id: Date.now(),
    internal_order_status: "pending",
    delivery_date: new Date().toISOString().split("T")[0],
  };
  const mockReq = {
    body: {
      data: testOrder,
      whomToNotify: "kitchen",
    },
    io: io,
    clients: clients,
  };

  const mockRes = {
    status: (code) => ({
      json: (data) => {
        console.log("Test order response:", data);
        res.json(data);
      },
    }),
  };

  NotifyUsers(mockReq, mockRes, (error) => {
    if (error) {
      console.error("Error in test order:", error);
      res.status(500).json({ error: error.message });
    }
  });
});

// Status endpoint
app.get("/status", (req, res) => {
  res.json({
    connectedClients: Array.from(clients.entries()),
    missedOrders: missedOrders,
    timestamp: new Date().toISOString(),
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log("Available endpoints:");
  console.log("- POST /notify");
  console.log("- POST /test-order");
  console.log("- GET /status");
});
