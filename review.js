import fs from "node:fs/promises"
import readline from "node:readline/promises"

const data = JSON.parse(await fs.readFile(process.argv[2], { encoding: "utf8" }))

const rl = readline.createInterface(process.stdin, process.stdout)
const deps = data[undefined]

const reviewedPath = "reviewed.json"
const reviewed = new Set()
try {
	const reviewedData = JSON.parse(await fs.readFile(reviewedPath, { encoding: "utf8" }))
	for (const item of reviewedData) {
		reviewed.add(item)
	}
} catch (e) {
	console.log("Could not read reviewed data")
}

async function markAsReviewed(currentDep) {
	reviewed.add(currentDep)
	const reviewedArray = Array.from(reviewed)
	await fs.writeFile(reviewedPath, JSON.stringify(reviewedArray, null, 4), { encoding: "utf8" })
}

async function review(currentDep, itsDeps) {
	while (true) {
		console.log(`Reviewing ${currentDep}`)
		const depsArray = Object.entries(itsDeps)
		for (const [i, [key, value]] of depsArray.entries()) {
			const mark = key.startsWith("node:") || reviewed.has(key) ? "✓" : ""
			console.log(`${i}: ${mark} ${key}`)
		}
		console.log("d: mark as reviewed")
		const answer = await rl.question("What to review?: ")
		console.log(`(answered: ${answer})`)
		if (answer === "d") {
			console.log(`Marking ${currentDep} as reviewed`)
			await markAsReviewed(currentDep)
			break
		}
		const numAnswer = parseInt(answer)
		if (!isNaN(numAnswer) && numAnswer < depsArray.length) {
			const [dep, itsDeps] = depsArray[numAnswer]
			// console.log(`Reviewing: ${dep}`)
			await review(dep, itsDeps)
		}
	}
}

await review("entry", deps)
