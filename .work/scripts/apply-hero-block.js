const fs = require("fs")

const pagePath = "app/LandingExperienceClient.tsx"
const blockPath = ".work/drafts/hero-block.txt"
const text = fs.readFileSync(pagePath, "utf8")
const replacement = fs.readFileSync(blockPath, "utf8")
const startMarker = `      <div
        className={\`relative overflow-hidden \${
          hasHero ? "min-h-[520px] lg:min-h-[580px]" : ""
        }\`}
      >`
const endMarker = `
      {}
      <div className="w-full mx-auto px-3.5 py-6 md:max-w-6xl md:px-6 md:py-10">`
const start = text.indexOf(startMarker)
const end = text.indexOf(endMarker, start)
if (start < 0 || end < 0) {
  throw new Error(`Hero boundaries not found: start=${start}, end=${end}`)
}
const next = text.slice(0, start) + replacement + text.slice(end)
fs.writeFileSync(pagePath, next, "utf8")
console.log(`Replaced hero block: ${start}-${end}`)
