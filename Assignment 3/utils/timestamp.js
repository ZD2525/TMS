const getUTCPlus8Timestamp = () => {
  // Create a new date object
  const date = new Date()

  // Convert to UTC+8 by adding 8 hours (8 * 60 * 60 * 1000 milliseconds)
  const offsetMilliseconds = 8 * 60 * 60 * 1000
  const adjustedDate = new Date(date.getTime() + offsetMilliseconds)

  // Format the date to the desired string format
  return adjustedDate.toISOString().slice(0, 19).replace("T", " ")
}

module.exports = { getUTCPlus8Timestamp }
