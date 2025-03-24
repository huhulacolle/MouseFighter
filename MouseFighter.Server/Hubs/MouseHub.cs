using Microsoft.AspNetCore.SignalR;
using MouseFighter.Server.Models;
using System.Collections.Concurrent;

namespace MouseFighter.Server.Hubs
{
    public class MouseHub : Hub
    {
        static readonly ConcurrentDictionary<string, GameSession> sessions = new();

        public async Task CreateRoom()
        {
            string roomId = Guid.NewGuid().ToString("N");

            var playerSession = new GameSession
            {
                Player1 = Context.ConnectionId,
            };

            sessions[roomId] = playerSession;

            await Groups.AddToGroupAsync(Context.ConnectionId, roomId);

            await Clients.Caller.SendAsync("RoomCreated", roomId);
        }

        public async Task JoinRoom(string roomId)
        {
            if (sessions.TryGetValue(roomId, out var session) && session.Player2 == null)
            {
                session.Player2 = Context.ConnectionId;

                await Groups.AddToGroupAsync(Context.ConnectionId, roomId);

                await Clients.Group(roomId).SendAsync("PlayerJoined");
            }
            else
            {
                await Clients.Caller.SendAsync("Error", "Aucun joueur trouvé");
            }
        }

        public async Task LaunchGame(string roomId)
        {
            await Clients.Group(roomId).SendAsync("StartGame");
        }

        public async Task SendPosition(Position lastPos, Position currentPos, string roomId)
        {
            await Clients.OthersInGroup(roomId).SendAsync("ReceivePosition", lastPos, currentPos);
        }

        public async Task SendReset()
        {
            await Clients.Others.SendAsync("ReceiveReset");
        }

        public async Task SendLost()
        {
            await Clients.Others.SendAsync("ReceiveLost");
        }

        public override Task OnDisconnectedAsync(Exception? exception)
        {
            var session = sessions
                .Where(s =>
                    s.Value.Player1 == Context.ConnectionId ||
                    s.Value.Player2 == Context.ConnectionId
                    )
                .FirstOrDefault();

            if (!string.IsNullOrEmpty(session.Key))
            {
                sessions.Remove(session.Key, out _);
            }

            return base.OnDisconnectedAsync(exception);
        }
    }
}
