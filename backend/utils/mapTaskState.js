const taskStateMap = {
  Open: 0,
  "To-Do": 1,
  Doing: 2,
  Done: 3,
  Closed: 4,
  0: "open",
  1: "todo",
  2: "doing",
  3: "done",
  4: "closed"
}

function mapTaskState(state) {
  return taskStateMap[state] !== undefined ? taskStateMap[state] : null
}

module.exports = mapTaskState
