# Spotify_Wheel

A Spotify widget for the [Omarchy](https://omarchy.dev) bar. It runs on
**ncspot** — a lightweight Rust TUI client — instead of the Electron desktop app,
so it sips battery instead of draining it. Search, new releases, and a panel
over the current album cover are all included.

![The widget in the bar, and its panel open over the current album cover](preview.jpg)

## Install

```sh
omarchy plugin add https://github.com/Adam-loy/Spotify_Wheel.git --enable
```

That clones the repository into `~/.config/omarchy/plugins/`, puts the widget in
the bar, and asks which section to use. To do it without the questions:

```sh
omarchy plugin add https://github.com/Adam-loy/Spotify_Wheel.git --enable --yes
```

Or clone it yourself, if you would rather read the code first:

```sh
git clone https://github.com/Adam-loy/Spotify_Wheel.git \
  ~/.config/omarchy/plugins/io.github.adam-loy.spotify-wheel
omarchy restart shell
omarchy plugin enable io.github.adam-loy.spotify-wheel --section center
```

The directory name does not matter to the shell, but the **plugin id does**: it
comes from `"id"` in `manifest.json` and is
`io.github.adam-loy.spotify-wheel`. Every command below takes that id, not the
repository name. `omarchy plugin list` shows the id the shell actually found, and
`omarchy-shell shell rescanPlugins` makes it look again after a fresh clone.

To put it somewhere else on the bar later:

```sh
omarchy plugin move io.github.adam-loy.spotify-wheel --section right
```

## Removal

```sh
omarchy plugin remove io.github.adam-loy.spotify-wheel
```

That takes it off the bar, unloads it from the running shell, and deletes the
folder. Confirm the prompt, or pass `--yes` for a script. If you cloned it
yourself into a directory named something other than the id, remove that
directory yourself.

To keep the files and only take the widget off the bar, use `disable` instead:

```sh
omarchy plugin disable io.github.adam-loy.spotify-wheel
```

To update an existing install to the latest commit:

```sh
omarchy plugin update io.github.adam-loy.spotify-wheel
```

Nothing is written outside `~/.config/omarchy/plugins/`, apart from artwork the
widget caches under `~/.cache/Spotify_Wheel/`. Uninstalling removes the plugin
folder; the artwork cache is left alone and is safe to delete.


## What is different from upstream

- **Runs on ncspot, not the Electron app.** The widget drives
  [ncspot](https://github.com/hrkfdn/ncspot) — a Rust TUI Spotify client — in a
  detached tmux session. No Electron, no GUI, no battery drain. See
  [Background playback](#background-playback).
- **Always in the bar.** Upstream hides the slot when the player is closed. This
  one keeps a dimmed label and the icon there, so it is a way to start the player
  and search without hunting for it. The setting still exists if you would
  rather it got out of the way.
- **Search and new releases**, in two extra tabs. Spotify's own Web API is not
  used at all — see [Where the data comes from](#where-the-data-comes-from).
- **Start / Show app**, which starts ncspot with no window at all. See
  [Background playback](#background-playback).
- **Close app**, which quits ncspot and stops the music.
- **Auto-quit.** When playback pauses for a configurable number of minutes,
  ncspot is gracefully quit and its tmux session is killed to save battery.

## Requires Spotify Premium

ncspot authenticates through Spotify's Web API, which requires a Premium
account. A free account cannot use it. This is a change from earlier versions
of this widget, which ran the official Spotify desktop app and worked on free
accounts.

## Where the data comes from

| Tab | Source | Notes |
| --- | --- | --- |
| Now playing | ncspot, over MPRIS | No key, no account, no network |
| Search, tracks | [Deezer](https://www.deezer.com) | Public JSON, no auth |
| Search, albums | [Deezer](https://www.deezer.com) | Public JSON, no auth |
| New releases | [Apple's search API](https://performance-partners.apple.com/search-api) | Public JSON, no auth |

Both catalogues are asked through a generated `sh` script rather than fetched
straight from QML. It allowlists the two hosts, caps the response at 2 MB,
refuses redirects and follows no cookies, and rejects a body that does not start
with `{` or `[` — which is what a captive portal or a proxy error page looks
like, and which would otherwise turn into a parse error in the panel.

### The new releases tab is honest about its own limits

Apple's search supports `sort=recent`, but it means *recent, among the things
that match* — relevance still outranks date. Ask it for `jazz` and the top of
the page is a 1956 compilation also called *Jazz*. So the tab re-sorts the
answer newest-first, and puts the release date next to every row.

That is not cosmetic. Apple's free index is unevenly fresh, and the tab will
show you which: `hip hop` has records from this month at the top, `jazz` stops
around 2023. It is a good list of what Apple's index has, not a complete feed of
everything released. Deezer's editorial "new releases" endpoints, which would
have been a better source, now answer empty.

## Background playback

The point of the widget is that you can listen to Spotify without ever seeing a
Spotify window. **Start** launches ncspot in a detached tmux session — no
window, no terminal, nothing on screen. **Show app** opens your terminal and
attaches to the tmux session so you can peek at the ncspot TUI. **Minimize**
detaches again.

The tmux session name defaults to `ncspot` and is configurable. ncspot runs
headless in the background; the bar widget is the only interface you need.

**Auto-quit** is the battery-saving half: when playback has been paused for
`autoQuitMinutes` (default 15), the widget gracefully quits ncspot via MPRIS
and kills the tmux session. Press play again and ncspot starts fresh.

`startOnLogin` starts the tmux session a few seconds after login. It is off by
default, because starting a music player unprompted is not a default anyone
would want.

## Closing the app

**Close app** is the one control that stops the music. It asks MPRIS to quit,
rather than killing the process: only the player knows whether it is willing to
quit, and a kill mid-write would leave the next start slower.

That makes it deliberately unlike **Start**. Minimising — detaching from the
tmux session — is the everyday way to get ncspot out of the way while it keeps
playing. This ends it.

The button is disabled when ncspot is not running, and when the player reports
`canQuit` as false, so it never looks like it worked when it did not.

## Artwork

Catalogue responses are not trusted with images. Every remote URL, the current
cover and every search result, goes through one probe that checks the host
against an allowlist of `scdn.co`, `dzcdn.net`, and `mzstatic.com`, then
downloads it to a local file with ImageMagick. The panel only ever loads a
`file://` path that probe wrote, so a hostile or lookalike host in a catalogue
body cannot reach the image loader — `evilscdn.co` and `dzcdn.net.evil.com`
are both refused.

## Requirements

- `ncspot` — the Spotify TUI client. Must be installed and configured with
  your Premium credentials at `~/.config/ncspot/config.toml`.
- `tmux` — runs ncspot in a detached session.
- `foot` — the terminal used by **Show app** to attach to the tmux session.
  Omarchy's default terminal.
- `curl` — the only hard one; search and releases do nothing without it.
- `ImageMagick` (`magick`) — album art and the cover backdrop. Without it the
  panel keeps its plain background and rows show no thumbnails.

## Settings

In the bar's settings panel, under Spotify:

| Setting | Default | |
| --- | --- | --- |
| Hide the widget when ncspot is not running | off | Turn on to hide the slot entirely |
| Search shows | Tracks | Or Albums |
| New releases starts on | pop | The genre the New tab asks for |
| Maximum label width | 200 | Wider titles scroll |
| Show artist | on | |
| Show progress | on | Underline in the bar |
| Left click | Open panel | The other button becomes play/pause |
| Mouse wheel | Previous/next track | Or volume |
| Accent color | Spotify green | Or album art, theme accent, bar foreground |
| Album cover behind the panel | on | |
| How much cover shows through | 55 | |
| Start ncspot at login | off | Starts the tmux session after login |
| Auto-quit after pause (minutes) | 15 | Gracefully quit ncspot and kill tmux |
| Tmux session name | ncspot | Change if you run multiple instances |
| ncspot config path | ~/.config/ncspot/config.toml | Must exist with credentials |

## IPC

For keybindings and scripts. `--` passes an argument.

```sh
omarchy-shell Spotify_Wheel toggle
omarchy-shell Spotify_Wheel playPause
omarchy-shell Spotify_Wheel next
omarchy-shell Spotify_Wheel previous
omarchy-shell Spotify_Wheel launch     # start ncspot in tmux
omarchy-shell Spotify_Wheel show       # attach to tmux in terminal
omarchy-shell Spotify_Wheel minimize   # detach from tmux
omarchy-shell Spotify_Wheel quit       # quit ncspot, stopping playback
omarchy-shell Spotify_Wheel search 'daft punk'
omarchy-shell Spotify_Wheel releases 'hip hop'
omarchy-shell Spotify_Wheel status
omarchy-shell Spotify_Wheel checkInstall
```

`status` and `searchDebug` return JSON for debugging.

## Tests

```sh
node test/qml-test.js       # Panel.qml structure -- see below
node test/model-test.js     # MPRIS helpers, artwork probe, ncspot scripts
node test/search-test.js    # URLs, both parsers, host vetting, live catalogues
node test/ops-test.js       # ncspot/tmux scripts, install checks
sh   test/probe-test.sh     # the artwork gate, against hostile URLs

sh   test/run.sh            # all of the above
```

`qml-test.js` is not decoration. `qmllint` passes a `Panel.qml` that Quickshell
refuses to load -- it reported nothing at all on one with a stray brace, and the
only clue was the shell's log. The structure test is what catches that, so run
it first; `test/run.sh` does.

`search-test.js` makes live requests to both catalogues; it fails if either is
unreachable. The QML side is checked with `qmllint`, and `qml/harness.qml` runs
the two logic files under Quickshell's own JavaScript engine, which is not
Node's:

```sh
qml/harness.qml   # symlink Model.js and Search.js beside it, then:
QML_IMPORT_PATH=/usr/share/omarchy/shell:/usr/lib/qt6/qml qs -p harness.qml
```

That harness has already earned its place: it is what caught `StdioCollector`
handlers that read a `text` argument the signal does not pass, which Node never
noticed and which would have left search and thumbnails silently broken in the
bar.

## Licence

CC0 1.0 Universal — see [`LICENSE`](LICENSE). Do what you want with it.

External dependencies are listed under [Requirements](#requirements); none of them
are bundled, and all are packaged for Arch and Omarchy.
