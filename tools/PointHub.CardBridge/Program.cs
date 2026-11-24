using Microsoft.Extensions.Options;
using PointHub.CardBridge;

// PointHub card bridge: runs on an event-station PC and forwards PC/SC card taps (ACR122U and similar)
// to the PointHub page in the browser over a loopback WebSocket. Protocol: docs/api.md, "Card bridge".
var builder = WebApplication.CreateBuilder(args);

builder.Services.Configure<BridgeOptions>(builder.Configuration.GetSection(BridgeOptions.Section));
builder.Services.AddSingleton<CardHub>();
builder.Services.AddHostedService<ReaderWatcher>();

var app = builder.Build();
var options = app.Services.GetRequiredService<IOptions<BridgeOptions>>().Value;

app.UseWebSockets(new WebSocketOptions { KeepAliveInterval = TimeSpan.FromSeconds(20) });

app.Run(async http =>
{
    var hub = http.RequestServices.GetRequiredService<CardHub>();

    if (!http.WebSockets.IsWebSocketRequest)
    {
        // Opening http://127.0.0.1:47615/ in a browser is the quick "is it running?" check.
        await http.Response.WriteAsync($"PointHub card bridge is running. Readers: {(hub.Readers.Count == 0 ? "none" : string.Join(", ", hub.Readers))}");
        return;
    }

    // Any web page can try to open a WebSocket to localhost. Only PointHub's own origins may listen to badge taps.
    var origin = http.Request.Headers.Origin.ToString();
    if (!options.AllowedOrigins.Contains(origin, StringComparer.OrdinalIgnoreCase))
    {
        app.Logger.LogWarning("Rejected WebSocket from origin '{Origin}'. Add it to Bridge:AllowedOrigins if it is your PointHub site.", origin);
        http.Response.StatusCode = StatusCodes.Status403Forbidden;
        return;
    }

    using var socket = await http.WebSockets.AcceptWebSocketAsync();
    await hub.ServeAsync(socket, http.RequestAborted);
});

app.Run();
