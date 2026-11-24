# PointHub card bridge

Browsers cannot talk to PC/SC smart-card readers (ACR122U, ACR1252U, OMNIKEY, …). This small program runs on the event-station PC, reads the UID of each card that is presented, and pushes it to the PointHub page over a WebSocket on `ws://127.0.0.1:47615/`. The page then behaves exactly as if a keyboard-wedge reader had typed the number.

**Keyboard-wedge readers do not need this program.** Install it only on PCs that use a PC/SC reader.

## Run

```powershell
dotnet run --project tools/PointHub.CardBridge
```

Open <http://127.0.0.1:47615/> to check it is running and which readers it sees.

## Install on a station PC

```powershell
dotnet publish tools/PointHub.CardBridge -c Release -r win-x64 --self-contained -p:PublishSingleFile=true -o publish/card-bridge
```

Copy the output folder to the PC, edit `appsettings.json` (below), and start `PointHub.CardBridge.exe` at sign-in (Startup folder or a Task Scheduler "At log on" task). The reader's own driver must be installed; the bridge needs no administrator rights.

## Settings (`appsettings.json`)

| setting | meaning |
| --- | --- |
| `Urls` | Keep it on `127.0.0.1`. The bridge must never listen on the network. |
| `Bridge:AllowedOrigins` | The exact origin(s) of your PointHub site, e.g. `https://pointhub.example.internal`. WebSocket connections from any other web page are refused, so other sites cannot read badge numbers. |
| `Bridge:ReverseUidBytes` | Set to `true` on a station if cards registered through a keyboard-wedge reader are not recognised here (some readers report the UID bytes in the opposite order). Decide one convention and register cards with it. |
| `Bridge:PollSeconds` | How often to look for plugged/unplugged readers. |

## Limits

- It reads the card **UID only**. No sector data, keys or personal data are read from the card.
- A card UID is an identifier, not a secret: it can be cloned. PointHub treats a tap as "this badge was here", the same trust level as a host ticking a name on a list. Do not use it for anything that needs proof of identity.
- Cards that return a random UID on every tap (some bank cards, phones emulating cards) cannot be registered.
- Not yet verified against physical readers in this repository – see `docs/decisions.md`.
- Chrome may ask the user to allow the PointHub site to connect to devices on the local network the first time (Local Network Access permission). Allow it for the PointHub site.
