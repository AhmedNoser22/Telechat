using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
namespace API.Hubs;

[Authorize]
public class VideoChatHub : Hub
{
    public async Task SendOffer(string receiverId, string offer, bool isAudioOnly, string senderName, string senderImage)
    {
        await Clients.User(receiverId).SendAsync("ReceiveOffer", Context.UserIdentifier, offer, isAudioOnly, senderName, senderImage);
    }

    public async Task SendAnswer(string receiverId, string answer)
    {
        await Clients.User(receiverId).SendAsync("ReceiveAnswer", Context.UserIdentifier, answer);
    }

    public async Task SendIceCandidate(string receiverId, string candidate)
    {
        await Clients.User(receiverId).SendAsync("ReceiveIceCandidate", Context.UserIdentifier, candidate);
    }

    public async Task EndCall(string receiverId, string callType)
    {
        await Clients.User(receiverId).SendAsync("CallEnded");
        await Clients.Users(Context.UserIdentifier!, receiverId).SendAsync("NotifyCallEntry", callType);
    }
}