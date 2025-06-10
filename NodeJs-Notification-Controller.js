const moment = require("moment");
const { validationResult } = require("express-validator");
const { missedOrders } = require("./missedOrdersStore");

async function NotifyUsers(req, res, next) {
  try {
    const { data, whomToNotify } = req.body;
    const useSSE = true;
    if (whomToNotify === "kitchen") {
      const kitchenName = data?.kitchen_name;

      if (!kitchenName) {
        return res.status(400).json({
          success: false,
          message: "Missing kitchen_name in data",
        });
      }

      let messageDelivered = false;

      if (useSSE) {
        const sseConnection = kitchenClients.get(kitchenName);
        if (sseConnection) {
          sseConnection.write(`data: ${JSON.stringify(data)}\n\n`);
          console.log(`📦 Sent to ${kitchenName} via SSE`);
          messageDelivered = true;
        } else {
          console.warn(`⚠️ No SSE connection found for ${kitchenName}`);
        }
      } else {
        const socketId = req.clients.get(`kitchen_frontend_app_${kitchenName}`);
        const socket = req.io?.sockets?.sockets.get(socketId);
        const connectedSockets = await req.io.in("kitchen_room").fetchSockets();

        if (socket && socket.connected) {
          req.io.to("kitchen_room").emit(kitchenName, data);
          console.log(`📡 Sent to ${kitchenName} via WebSocket`);
          messageDelivered = true;
        } else {
          console.warn(`⚠️ No WebSocket connection for ${kitchenName}`);
        }
      }

      if (!messageDelivered) {
        missedOrders.push(data);
        console.log(`📭 Queued missed order for ${kitchenName}`);
        // Optionally store in Redis or persistent queue here
      }
    }

    res.status(200).json({
      success: true,
      message: "Notification processed",
    });
    next();
  } catch (error) {
    console.log("----Error in NotifyUsers", error);
    return res.status(200).json({
      success: false,
      CustomMessage: "NotifyUsers - Notification server ERROR",
      ERROR: error.message,
    });
  }
}

exports.NotifyUsers = NotifyUsers;
