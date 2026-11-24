using System.Collections.Concurrent;
using System.Net.WebSockets;
using System.Text;
using System.Text.Json;
using System.Threading.Channels;

namespace PointHub.CardBridge;

public sealed class BridgeOptions
{
    public const string Section = "Bridge";

    /// <summary>Exact origins (scheme://host[:port]) of the PointHub site that may receive card taps.</summary>
    public string[] AllowedOrigins { get; set; } = [];

    /// <summary>
    /// Some keyboard-wedge readers print the UID bytes in the opposite order. If cards registered with such a
    /// reader are not recognised through this bridge (or the other way round), flip this on the affected stations.
    /// </summary>
    public bool ReverseUidBytes { get; set; }

    public int PollSeconds { get; set; } = 2;
}

/// <summary>Connected browser tabs. Everything is bridge-to-page; messages from the page are ignored.</summary>
public sealed class CardHub
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);
    private readonly ConcurrentDictionary<Guid, Channel<string>> clients = new();
    private volatile IReadOnlyList<string> readers = [];

    public IReadOnlyList<string> Readers => readers;

    public void SetReaders(IReadOnlyList<string> current)
    {
        readers = current;
        Broadcast(new { type = "readers", readers = current });
    }

    public void CardPresented(string uid, string reader) => Broadcast(new { type = "card", uid, reader });

    public void Error(string message, string? reader) => Broadcast(new { type = "error", message, reader });

    public async Task ServeAsync(WebSocket socket, CancellationToken aborted)
    {
        // One outbound queue per client: a WebSocket allows only one send at a time, and taps arrive on reader threads.
        var id = Guid.NewGuid();
        var outbox = Channel.CreateBounded<string>(new BoundedChannelOptions(64) { FullMode = BoundedChannelFullMode.DropOldest });
        outbox.Writer.TryWrite(JsonSerializer.Serialize(new { type = "hello", version = 1, readers = Readers }, Json));
        clients[id] = outbox;

        using var closed = CancellationTokenSource.CreateLinkedTokenSource(aborted);
        try
        {
            var sending = SendLoopAsync(socket, outbox.Reader, closed.Token);
            await ReceiveUntilClosedAsync(socket, closed.Token);
            await closed.CancelAsync();
            await sending;
        }
        catch (Exception ex) when (ex is OperationCanceledException or WebSocketException)
        {
            // The tab was closed or the connection dropped; nothing to clean up beyond the registration.
        }
        finally
        {
            clients.TryRemove(id, out _);
        }
    }

    private void Broadcast(object message)
    {
        var json = JsonSerializer.Serialize(message, Json);
        foreach (var client in clients.Values) client.Writer.TryWrite(json);
    }

    private static async Task SendLoopAsync(WebSocket socket, ChannelReader<string> outbox, CancellationToken stop)
    {
        try
        {
            await foreach (var json in outbox.ReadAllAsync(stop))
                await socket.SendAsync(Encoding.UTF8.GetBytes(json), WebSocketMessageType.Text, endOfMessage: true, stop);
        }
        catch (Exception ex) when (ex is OperationCanceledException or WebSocketException) { }
    }

    private static async Task ReceiveUntilClosedAsync(WebSocket socket, CancellationToken stop)
    {
        var buffer = new byte[256];
        while (socket.State == WebSocketState.Open)
        {
            var result = await socket.ReceiveAsync(buffer, stop);
            if (result.MessageType == WebSocketMessageType.Close)
            {
                await socket.CloseAsync(WebSocketCloseStatus.NormalClosure, null, CancellationToken.None);
                return;
            }
        }
    }
}
