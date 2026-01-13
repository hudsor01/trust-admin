#!/usr/bin/env node

const { spawn } = require("node:child_process")
const util = require("node:util")
const exec = util.promisify(require("node:child_process").exec)

async function killProcessOnPort(port) {
  try {
    // Find and kill process on the port
    const { stdout } = await exec(`lsof -i :${port} | grep LISTEN | awk '{print $2}'`)
    const pid = stdout.trim()
    if (pid) {
      console.log(`Killing process ${pid} on port ${port}`)
      process.kill(pid, "SIGTERM")
      // Wait a moment for the port to be released
      await new Promise((resolve) => setTimeout(resolve, 1000))
    }
  } catch (_error) {
    // Port is not in use, which is fine
  }
}

async function main() {
  console.log("Preparing development environment...")

  // Kill any existing processes on our ports
  await killProcessOnPort(5050) // API port
  await killProcessOnPort(5173) // UI port

  console.log("Starting development servers...")

  // Start the dev servers using bun run
  const devProcess = spawn("bun", ["run", "dev"], {
    stdio: "inherit",
    cwd: process.cwd(),
  })

  devProcess.on("error", (err) => {
    console.error("Failed to start development servers:", err)
  })

  devProcess.on("close", (code) => {
    console.log(`Development servers exited with code ${code}`)
  })
}

main().catch(console.error)
