export function link(a, b) {
  if (a.downstreams === undefined) {
    a.downstreams = new Map;
  }
  const count = a.downstreams.get(b) || 0;
  a.downstreams.set(b, count + 1);
}

export function unlink(a, b) {
  const count = a.downstreams.get(b);
  if (count === 1) {
    a.downstreams.delete(b);
    if (a.downstreams.size === 0) {
      delete a.downstreams;
    }
  } else {
    a.downstreams.set(b, count - 1);
  }
}

let hasNextTick = false;
let updatedNodes = new Set;

export function onUpdate(target) {
  updatedNodes.add(target);
  if (!hasNextTick) {
    Promise.resolve().then(tick);
    hasNextTick = true;
  }
}

function tick() {
  hasNextTick = false;
  const updateSource = updatedNodes;
  updatedNodes = new Set;
  // naive version, may use topological sort for heuristics
  const visited = new Set;
  for (const node of updateSource) {
    if (node.downstreams === undefined) continue;
    for (const nextNode of Array.from(node.downstreams.keys())) {
      if (!node.downstreams.has(nextNode)) continue;
      if (visited.has(nextNode)) continue;
      visited.add(nextNode);
      const oldValue = nextNode.getValue();
      nextNode.update();
      if (nextNode.getValue() !== oldValue) {
        onUpdate(nextNode);
      }
    }
  }
}
