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

const lines1 = read('./common.j')
const lines2 = read('./common1.j')

const max = lines1.length >= lines2.length ? lines1.length : lines2.length

const isNull = val => val === undefined || val == null

for (let i = 0; i < max; i++) {
  const line1 = lines1[i]
  const line2 = lines2[i]
  if (isNull(line1) || isNull(line2)) {
    break
  }
  if (line1 === line2) {
    console.log("line1: " + line1)
    console.log("line2: " + line2)
  }
}