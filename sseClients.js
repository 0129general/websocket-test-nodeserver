const kitchenClients = new Map(); // Map<string, Set<res>>

function addSSEClient(kitchenName, res) {
  if (!kitchenClients.has(kitchenName)) {
    kitchenClients.set(kitchenName, new Set());
  }
  kitchenClients.get(kitchenName).add(res);
}

function removeSSEClient(kitchenName, res) {
  const set = kitchenClients.get(kitchenName);
  if (set) {
    set.delete(res);
    if (set.size === 0) {
      kitchenClients.delete(kitchenName);
    }
  }
}

module.exports = { kitchenClients, addSSEClient, removeSSEClient };
