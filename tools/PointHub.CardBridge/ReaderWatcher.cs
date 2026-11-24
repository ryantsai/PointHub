using Microsoft.Extensions.Options;
using PCSC;
using PCSC.Exceptions;
using PCSC.Monitoring;

namespace PointHub.CardBridge;

/// <summary>
/// Watches the PC/SC readers attached to this PC and reports the UID of every card that is presented.
/// Readers are polled rather than subscribed to, so the bridge keeps working when the Windows Smart Card
/// service is not running yet or a reader is unplugged and plugged back in.
/// </summary>
public sealed class ReaderWatcher(CardHub hub, IOptions<BridgeOptions> options, ILogger<ReaderWatcher> logger) : BackgroundService
{
    // PC/SC pseudo-APDU "Get Data: UID" (PC/SC part 3), understood by ACR122U, ACR1252U, OMNIKEY, uTrust, ...
    private static readonly byte[] GetUid = [0xFF, 0xCA, 0x00, 0x00, 0x00];

    private ISCardMonitor? monitor;
    private string[] current = [];

    protected override async Task ExecuteAsync(CancellationToken stop)
    {
        logger.LogInformation("Card bridge started. Waiting for PC/SC readers...");
        try
        {
            while (!stop.IsCancellationRequested)
            {
                var readers = ListReaders();
                if (!readers.SequenceEqual(current))
                {
                    current = readers;
                    logger.LogInformation("Readers: {Readers}", readers.Length == 0 ? "none" : string.Join(", ", readers));
                    Watch(readers);
                    hub.SetReaders(readers);
                }
                await Task.Delay(TimeSpan.FromSeconds(Math.Max(1, options.Value.PollSeconds)), stop);
            }
        }
        catch (OperationCanceledException) { }
        finally
        {
            StopMonitor();
        }
    }

    private string[] ListReaders()
    {
        try
        {
            using var context = ContextFactory.Instance.Establish(SCardScope.System);
            return context.GetReaders() ?? [];
        }
        catch (PCSCException)
        {
            // No reader plugged in, or the Smart Card service is stopped (Windows stops it when no reader is present).
            return [];
        }
    }

    private void Watch(string[] readers)
    {
        StopMonitor();
        if (readers.Length == 0) return;

        monitor = MonitorFactory.Instance.Create(SCardScope.System);
        monitor.CardInserted += (_, args) => OnCardPresented(args.ReaderName);
        monitor.MonitorException += (_, ex) =>
        {
            logger.LogWarning("Reader monitor stopped: {Message}", ex.Message);
            current = []; // forces a fresh reader list and a new monitor on the next poll
        };
        monitor.Start(readers);
    }

    private void StopMonitor()
    {
        if (monitor is null) return;
        monitor.Cancel();
        monitor.Dispose();
        monitor = null;
    }

    private void OnCardPresented(string reader)
    {
        try
        {
            using var context = ContextFactory.Instance.Establish(SCardScope.System);
            using var card = context.ConnectReader(reader, SCardShareMode.Shared, SCardProtocol.Any);

            var response = new byte[32];
            var length = card.Transmit(GetUid, response);
            var succeeded = length >= 2 && response[length - 2] == 0x90 && response[length - 1] == 0x00;
            if (!succeeded || length == 2)
            {
                hub.Error("The card did not return a UID.", reader);
                return;
            }

            var uid = response[..(length - 2)];
            if (options.Value.ReverseUidBytes) Array.Reverse(uid);
            // The UID identifies a person's badge: it goes to the page, not into the log.
            logger.LogInformation("Card presented on {Reader} ({Bytes}-byte UID)", reader, uid.Length);
            hub.CardPresented(Convert.ToHexString(uid), reader);
        }
        catch (PCSCException ex)
        {
            // Typically the card was pulled away before it could be read.
            logger.LogWarning("Could not read the card on {Reader}: {Message}", reader, ex.Message);
            hub.Error("Could not read the card. Hold it on the reader a little longer.", reader);
        }
    }
}
