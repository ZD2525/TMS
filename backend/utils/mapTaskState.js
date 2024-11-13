const taskStateMap = {
  Open: 0,
  "To-Do": 1,
  Doing: 2,
  Done: 3,
  Closed: 4,
  0: "Open",
  1: "Todo",
  2: "Doing",
  3: "Done",
  4: "Closed"
}

function mapTaskState(state) {
  return taskStateMap[state] !== undefined ? taskStateMap[state] : null
}

module.exports = mapTaskState
