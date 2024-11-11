const taskStateMap = {
  Open: 0,
  "To-Do": 1,
  Doing: 2,
  Done: 3,
  Closed: 4
}

function mapTaskState(state) {
  return taskStateMap[state] !== undefined ? taskStateMap[state] : null
}

module.exports = mapTaskState
