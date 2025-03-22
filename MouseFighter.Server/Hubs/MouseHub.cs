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

            await Groups.AddToGroupAsync(roomId, Context.ConnectionId);

            await Clients.Caller.SendAsync("RoomCreated", roomId);
        }

        public async Task JoinRoom(string roomId)
        {
            if (sessions.TryGetValue(roomId, out var session) && session.Player2 == null)
            {
                session.Player2 = Context.ConnectionId;

                await Groups.AddToGroupAsync(roomId, Context.ConnectionId);

                await Clients.Group(roomId).SendAsync("PlayerJoined");
            }
            else
            {
                await Clients.Caller.SendAsync("Error", "Aucun joueur trouvé");
            }
        }
    }
}
