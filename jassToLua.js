const fs = require("fs")
const { read } = require("./readLines")

const initArray = (n) => Array(n).fill(0)

const isNull = (val) => val === undefined || val == null

const lineToType = (line, parts) => {
  if (!line.includes("type ") && !line.includes("extends ")) {
    throw new Error()
  }
  // const elems = line.split(/\s/)
  const elems = parts
  // console.log(elems)
  let hasType = false
  let hasExtends = false
  let typeName
  let extendedTypeName

  for (let i = 0; i < elems.length; i++) {
    const elem = elems[i]

    if (!(elem.length > 0)) continue
    if (elem === "//" || elem.includes("//")) {
      // comments = elems.slice(i, elems.length - 1).join(' ')
      break
    }
    if (elem === "type") {
      hasType = true
      continue
    } else if (!hasType) continue
    if (!typeName) typeName = elem
    if (elem === "extends") {
      hasExtends = true
      continue
    } else if (!hasExtends) continue
    if (!extendedTypeName) extendedTypeName = elem
  }
  // console.log(typeName)
  // console.log(extendedTypeName)
  if (!typeName || !extendedTypeName) throw new Error()
  else
    return {
      typeName,
      extendedTypeName,
    }
}

const lineToNative = (line, parts) => {
  if (!line.includes("constant native") && !line.includes("native")) {
    throw new Error()
  }
  // console.log(line)
  let hasConstant, hasNative, hasTakes, hasReturns
  let nativeName,
    params = [],
    returnType
  for (let i = 0; i < parts.length; i++) {
    const word = parts[i]
    if (!(word.length > 0)) continue
    if (word === "//" || word.includes("//")) break
    if (word === "constant") {
      hasConstant = true
      continue
    }
    if (word === "native") {
      hasNative = true
      continue
    } else if (hasConstant && !hasNative) continue
    if (!nativeName) nativeName = word
    if (word === "takes") {
      hasTakes = true
      continue
    } else if (!hasTakes) continue
    if (word !== "returns" && !hasReturns) {
      params.push(word)
    } else if (hasReturns) {
      returnType = word
    } else {
      hasReturns = true
      continue
    }
  }
  if (!nativeName || params.length <= 0 || !returnType) throw new Error()
  else
    return {
      nativeName,
      params,
      returnType,
    }
}

const lineToConstant = (line, parts) => {
  if (!line.includes("constant") || line.includes("constant native")) {
    throw new Error()
  }
  let hasConstant, hasEqual
  let constantType, constantName, constantValue
  for (let i = 0; i < parts.length; i++) {
    const word = parts[i]
    if (!(word.length > 0)) continue
    if (word === "//" || word.includes("//")) break
    if (word === "constant") {
      hasConstant = true
      continue
    } else if (!hasConstant) continue
    if (!constantType) {
      constantType = word
      continue
    }
    if (!constantName) {
      constantName = word
      continue
    }
    if ((!constantType || !constantName) && word === "=") throw new Error()
    else if (word === "=") {
      hasEqual = true
      continue
    } else if (!hasEqual) continue
    if (!constantValue) constantValue = word
  }
  if (!constantType || !constantName || !constantValue) throw new Error()
  else
    return {
      constantType,
      constantName,
      constantValue,
    }
}

const elemMatches = {
  type: lineToType,
  native: lineToNative,
  constant: lineToConstant,
}

const lineToCodeElement = (line, parts, typeElement) => {
  let result
  try {
    result = elemMatches[typeElement](line, parts)
  } catch (err) {
    // console.log(err)
    return false
  }
  return result
}

const linesToCodeElements = (lines) => {
  const codeElements = []
  // lines = lines.slice(98, 147)
  // lines = lines.slice(818, 833)
  // lines = lines.slice(465, 481)
  // lines = lines.slice(0, 272)
  let elem
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    const parts = line.split(/\s/)

    elem = lineToCodeElement(line, parts, "type")
    if (elem) {
      codeElements.push(elem)
    }
    if (!elem) {
      elem = lineToCodeElement(line, parts, "native")
      if (elem) {
        codeElements.push(elem)
      }
    }
    if (!elem) {
      elem = lineToCodeElement(line, parts, "constant")
      if (elem) {
        codeElements.push(elem)
      }
    }
    const indexComment = parts.findIndex(
      (element) => element === "//" || element.includes("//")
    )
    if (indexComment !== -1) {
      // parts[indexComment] = '--'
      const comment = parts.slice(indexComment, parts.length - 1).join(" ")
      codeElements.push(comment)
    }
    if (parts[parts.length - 1] == "") {
      codeElements.push("\n")
    }
  }
  // console.log(codeElements)
  return codeElements
}

const jassCommentToLua = (codeElement) => {
  if (!(typeof codeElement === "string")) {
    throw new Error("Элемент кода должен быть строкой")
  }
  if (codeElement.substring(0, 2) === "//") {
    return "--" + codeElement.substring(2, codeElement.length)
  }
  return codeElement
}

const isJassType = (codeElement) =>
  typeof codeElement === "object" &&
  typeof codeElement.typeName === "string" &&
  typeof codeElement.extendedTypeName === "string"

const jassTypeToLua = (codeElement) => {
  if (!isJassType(codeElement)) {
    throw new Error("Элемент кода не является типом данных Jass")
  }
  return `---@class\t${codeElement.typeName}:${codeElement.extendedTypeName} `
}

const isJassNative = (codeElement) =>
  typeof codeElement === "object" &&
  typeof codeElement.nativeName === "string" &&
  typeof codeElement.params === "object" &&
  typeof codeElement.returnType === "string"

const jassNativeToLua = (codeElement) => {
  if (!isJassNative(codeElement)) {
    throw new Error("Элемент кода не является нативкой Jass")
  }
  const params = codeElement.params
    .map((param) => param.replace(",", ""))
    .filter((param) => param !== "")
    .map((param) => (param === "end" ? "End" : param))
  const args = params.filter((_, index) => index % 2 !== 0)
  const annotations =
    params.reduce((acc, param, index, arr) => {
      return index % 2 === 0
        ? acc
        : acc + `---@param ${param} ${arr[index - 1]}\n`
    }, "") + `---@return ${codeElement.returnType}\n`
  const func = `function ${codeElement.nativeName}(${args.join(", ")}) end `
  return annotations + func
}

const isJassConstant = (codeElement) =>
  typeof codeElement === "object" &&
  typeof codeElement.constantType === "string" &&
  typeof codeElement.constantName === "string" &&
  typeof codeElement.constantValue === "string"

const jassConstantToLua = (codeElement) => {
  if (!isJassConstant(codeElement)) {
    throw new Error("Элемент кода не является константой Jass")
  }
  return `${codeElement.constantName}\t\t\t\t\t= ${codeElement.constantValue} ---@type ${codeElement.constantType}`
}

const jassElementsToLua = (codeElements) =>
  codeElements.map((codeElement) => {
    try {
      return jassCommentToLua(codeElement)
    } catch {}
    try {
      return jassTypeToLua(codeElement)
    } catch {}
    try {
      return jassNativeToLua(codeElement)
    } catch {}
    try {
      return jassConstantToLua(codeElement)
    } catch {
      throw new Error("Не удалось распознать элемент кода")
    }
  })

const main = (args) => {
  const inputPath = args[0]
  const outputPath = args[1]

  const lines = read(inputPath)

  const codeElements = linesToCodeElements(lines)

  // fs.writeFileSync("common.j.json", JSON.stringify(codeElements))

  const luaCode = jassElementsToLua(codeElements).join("")

  fs.writeFileSync(outputPath, luaCode)
}

const args = Object.assign([], process.argv)
args.splice(0, 2)
main(args)