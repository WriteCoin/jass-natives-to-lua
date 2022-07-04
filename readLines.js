const lineByLine = require('n-readlines')

const read = filepath => {
  const liner = new lineByLine(filepath)
  let line
  let lineNumber = 0
  let lines = []
  while (line = liner.next()) {
      // console.log('Line ' + lineNumber + ': ' + line.toString('ascii'))
      lineNumber++
      lines.push(line.toString('ascii'))
  }
  return lines
}

module.exports = {
  read,
  lineByLine
}