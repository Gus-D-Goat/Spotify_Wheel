// Tests for the things the widget does to ncspot itself: starting it in tmux,
// attaching, detaching, and killing the session: `node test/ops-test.js`.

const assert = require("assert")
const fs = require("fs")
const path = require("path")
const { execFileSync } = require("child_process")
const M = require("../Model.js")

// ------------------------------------------------------- starting in tmux
{
  const start = M.ncspotStartScript("ncspot")
  const show = M.ncspotShowScript("ncspot")
  const minimize = M.ncspotMinimizeScript("ncspot")
  const kill = M.ncspotKillScript("ncspot")

  // A shell script explains itself in comments, and the explanations here
  // necessarily quote the syntax they are warning against -- so assertions about
  // what the script *does* have to be made against the code, not the prose.
  const code = (s) => s.split("\n").filter((l) => !/^\s*#/.test(l)).join("\n")

  // Start: checks for tmux and ncspot, creates detached session
  for (const script of [start]) {
    assert.ok(script.indexOf("command -v tmux") !== -1)
    assert.ok(script.indexOf("command -v ncspot") !== -1)
    assert.ok(code(script).indexOf("tmux new-session -d -s ncspot ncspot") !== -1)
    assert.ok(code(script).indexOf("tmux has-session -t ncspot") !== -1)
  }

  // Show: attaches in terminal
  assert.ok(code(show).indexOf("tmux attach -t ncspot") !== -1)
  assert.ok(code(show).indexOf("foot") !== -1)

  // Minimize: detaches
  assert.ok(code(minimize).indexOf("tmux detach-client -t ncspot") !== -1)

  // Kill: kills session
  assert.ok(code(kill).indexOf("tmux kill-session -t ncspot") !== -1)

  // No Spotify references remain
  for (const script of [start, show, minimize, kill]) {
    assert.ok(script.toLowerCase().indexOf("spotify") === -1, "script should not reference Spotify")
    assert.ok(script.indexOf("hyprctl") === -1, "script should not reference hyprctl")
    assert.ok(script.indexOf("special:") === -1, "script should not reference special workspaces")
    assert.ok(script.indexOf("omarchy launch") === -1, "script should not use omarchy launch")
  }

  // Valid shell syntax
  for (const [name, script] of [["start", start], ["show", show], ["minimize", minimize], ["kill", kill]]) {
    try {
      execFileSync("/bin/sh", ["-n", script], { encoding: "utf8", timeout: 5000 })
    } catch (e) {
      assert.fail(name + " script has invalid shell syntax: " + e.message)
    }
  }
}

// ------------------------------------------------------- install check script
{
  const install = M.installCheckScript("~/.config/ncspot/config.toml")

  assert.ok(install.indexOf("command -v ncspot") !== -1)
  assert.ok(install.indexOf("command -v tmux") !== -1)
  assert.ok(install.indexOf("NCSPOT yes") !== -1)
  assert.ok(install.indexOf("NCSPOT no") !== -1)
  assert.ok(install.indexOf("TMUX yes") !== -1)
  assert.ok(install.indexOf("TMUX no") !== -1)
  assert.ok(install.indexOf("CONFIG yes") !== -1)
  assert.ok(install.indexOf("CONFIG no") !== -1)

  // Valid shell
  execFileSync("/bin/sh", ["-n", install], { encoding: "utf8", timeout: 5000 })
}

// ------------------------------------------------------- custom session name
{
  const start = M.ncspotStartScript("music")
  const show = M.ncspotShowScript("music")
  const minimize = M.ncspotMinimizeScript("music")
  const kill = M.ncspotKillScript("music")

  assert.ok(start.indexOf("tmux new-session -d -s music ncspot") !== -1)
  assert.ok(start.indexOf("tmux has-session -t music") !== -1)
  assert.ok(show.indexOf("tmux attach -t music") !== -1)
  assert.ok(minimize.indexOf("tmux detach-client -t music") !== -1)
  assert.ok(kill.indexOf("tmux kill-session -t music") !== -1)
}

console.log("ok — ops tests passed")
