const moment = require("moment");
const { validationResult } = require("express-validator");
const { missedOrders } = require("./missedOrdersStore");

async function NotifyUsers(req, res, next) {
  try {
    const { data, whomToNotify } = req.body;

    if (whomToNotify === "kitchen") {
      const kitchenSocketId = req.clients.get(
        `kitchen_frontend_app_${data?.kitchen_name}`
      );
      const kitchenSocket = req.io.sockets.sockets.get(kitchenSocketId);
      const kitchenSockets = await req.io.in("kitchen_room").fetchSockets();

      if (kitchenSocket && kitchenSocket.connected) {
        req.io.to("kitchen_room").emit(data?.kitchen_name, data);
        console.log(`?? Order sent: ${data.kitchen_name}`);
      } else {
        console.log("¬ª? Kitchen socket not connected");
        missedOrders.push(data);
      }
    }

    res
      .status(200)
      .json({
        success: true,
        CustomMessage: "NotifyUsers - Notification server",
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
