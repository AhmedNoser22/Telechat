namespace API.Hubs;

public class ChatHub(UserManager<AppUser> userManager, AppDbContext context) : Hub
{
    private static readonly ConcurrentDictionary<string, OnlineUserDto> onlineUsers = new();

    public override async Task OnConnectedAsync()
    {
        var httpContext = Context.GetHttpContext();
        var userId = Context.User?.FindFirstValue(ClaimTypes.NameIdentifier)
                     ?? httpContext?.Request.Query["senderId"].ToString();

        if (string.IsNullOrEmpty(userId)) return;

        var currentUser = await userManager.FindByIdAsync(userId);
        if (currentUser == null) return;

        var userDto = new OnlineUserDto
        {
            Id = currentUser.Id,
            ConnectionId = Context.ConnectionId,
            UserName = currentUser.UserName!,
            ProfilePicture = currentUser.ProfileImage,
            FullName = currentUser.FullName,
            IsOnline = true
        };

        onlineUsers.AddOrUpdate(currentUser.UserName!, userDto, (key, oldValue) => userDto);
        await Clients.All.SendAsync("OnlineUsers", await GetAllUsers());
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var userId = Context.User?.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId)) return;

        var user = await userManager.FindByIdAsync(userId);
        if (user != null)
            onlineUsers.TryRemove(user.UserName!, out _);

        await Clients.All.SendAsync("OnlineUsers", await GetAllUsers());
        await base.OnDisconnectedAsync(exception);
    }

    public async Task SendMessage(MessageRequestDto message)
    {
        var senderId = Context.User?.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(senderId)) return;

        var blocked = await context.Blocks.AnyAsync(b =>
            (b.BlockerId == senderId && b.BlockedId == message.ReceiverId) ||
            (b.BlockerId == message.ReceiverId && b.BlockedId == senderId));

        if (blocked) return;

        var msg = new Message
        {
            SenderId = senderId,
            ReceiverId = message.ReceiverId,
            Content = message.Content,
            CreatedDate = DateTime.UtcNow,
            IsRead = false
        };

        context.Messages.Add(msg);
        await context.SaveChangesAsync();

        var res = new MessageResponseDto
        {
            Id = msg.Id,
            Content = msg.Content,
            SenderId = msg.SenderId,
            ReceiverId = msg.ReceiverId,
            CreateDate = msg.CreatedDate,
            IsRead = false
        };

        await Clients.User(message.ReceiverId!).SendAsync("ReceiveNewMessage", res);
        await Clients.Caller.SendAsync("ReceiveNewMessage", res);
    }

    public async Task LoadMessages(string receiverId, int pageNumber)
    {
        var senderId = Context.User?.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(senderId)) return;

        int pageSize = 30;
        var messages = await context.Messages
            .Where(m =>
                (m.SenderId == senderId && m.ReceiverId == receiverId && !m.DeletedBySender) ||
                (m.SenderId == receiverId && m.ReceiverId == senderId && !m.DeletedByReceiver))
            .OrderByDescending(m => m.CreatedDate)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .OrderBy(m => m.CreatedDate)
            .Select(m => new MessageResponseDto
            {
                Id = m.Id,
                Content = m.Content,
                SenderId = m.SenderId,
                ReceiverId = m.ReceiverId,
                CreateDate = m.CreatedDate,
                IsRead = m.IsRead
            })
            .ToListAsync();

        await Clients.Caller.SendAsync("ReceiveMessageList", messages);

        var unread = await context.Messages
            .Where(m => m.SenderId == receiverId && m.ReceiverId == senderId && !m.IsRead)
            .ToListAsync();

        if (unread.Any())
        {
            unread.ForEach(m => m.IsRead = true);
            await context.SaveChangesAsync();
            await Clients.User(receiverId).SendAsync("MessagesSeenByPartner", senderId);
        }
    }

    public async Task ReadAllMessages(string senderId)
    {
        var receiverId = Context.User?.FindFirstValue(ClaimTypes.NameIdentifier);

        var messages = await context.Messages
            .Where(m => m.SenderId == senderId && m.ReceiverId == receiverId && !m.IsRead)
            .ToListAsync();

        if (messages.Any())
        {
            messages.ForEach(m => m.IsRead = true);
            await context.SaveChangesAsync();
            await Clients.User(senderId).SendAsync("MessagesSeenByPartner", receiverId);
        }
    }

    public async Task DeleteMessage(int messageId, bool deleteForEveryone)
    {
        var userId = Context.User?.FindFirstValue(ClaimTypes.NameIdentifier);
        var message = await context.Messages.FirstOrDefaultAsync(m => m.Id == messageId);
        if (message == null) return;

        if (deleteForEveryone)
        {
            if (message.SenderId != userId) return;
            context.Messages.Remove(message);
            await context.SaveChangesAsync();
            await Clients.User(message.SenderId!).SendAsync("MessageDeleted", messageId);
            await Clients.User(message.ReceiverId!).SendAsync("MessageDeleted", messageId);
        }
        else
        {
            if (message.SenderId != userId && message.ReceiverId != userId) return;

            if (message.SenderId == userId)
                message.DeletedBySender = true;
            else
                message.DeletedByReceiver = true;

            if (message.DeletedBySender && message.DeletedByReceiver)
                context.Messages.Remove(message);

            await context.SaveChangesAsync();
            await Clients.Caller.SendAsync("MessageDeleted", messageId);
        }
    }

    public async Task BlockUser(string blockedId)
    {
        var blockerId = Context.User?.FindFirstValue(ClaimTypes.NameIdentifier);
        if (blockerId == null || blockerId == blockedId) return;

        if (!await context.Blocks.AnyAsync(b => b.BlockerId == blockerId && b.BlockedId == blockedId))
        {
            context.Blocks.Add(new Block { BlockerId = blockerId, BlockedId = blockedId });
            await context.SaveChangesAsync();

            await Clients.User(blockerId).SendAsync("UserBlocked", blockedId);
            await Clients.User(blockedId).SendAsync("YouWereBlocked", blockerId);
        }
    }

    public async Task UnblockUser(string blockedId)
    {
        var blockerId = Context.User?.FindFirstValue(ClaimTypes.NameIdentifier);
        var block = await context.Blocks.FirstOrDefaultAsync(b => b.BlockerId == blockerId && b.BlockedId == blockedId);

        if (block != null)
        {
            context.Blocks.Remove(block);
            await context.SaveChangesAsync();

            await Clients.User(blockerId!).SendAsync("UserUnblocked", blockedId);
            await Clients.User(blockedId).SendAsync("YouWereUnblocked", blockerId);
        }
    }

    public async Task NotifyTyping(string targetUserName)
    {
        var senderUserName = Context.User?.FindFirst(ClaimTypes.Name)?.Value
                             ?? Context.User?.FindFirst("name")?.Value;
        if (string.IsNullOrEmpty(senderUserName)) return;

        var targetUser = onlineUsers.Values.FirstOrDefault(u =>
            u.UserName?.ToLower() == targetUserName.ToLower());

        if (targetUser?.Id != null)
            await Clients.User(targetUser.Id).SendAsync("NotifyTypingToUser", senderUserName);
    }

    private async Task<IEnumerable<OnlineUserDto>> GetAllUsers()
    {
        var currentUserId = Context.User?.FindFirstValue(ClaimTypes.NameIdentifier);
        var onlineUserNames = onlineUsers.Keys.ToList();

        var users = await userManager.Users.Select(u => new OnlineUserDto
        {
            Id = u.Id,
            UserName = u.UserName,
            FullName = u.FullName,
            ProfilePicture = u.ProfileImage,
            IsOnline = onlineUserNames.Contains(u.UserName!),
            UnreadCount = context.Messages.Count(x =>
                x.ReceiverId == currentUserId &&
                x.SenderId == u.Id &&
                !x.IsRead)
        }).ToListAsync();

        var blockedByMe = await context.Blocks
            .Where(b => b.BlockerId == currentUserId)
            .Select(b => b.BlockedId)
            .ToListAsync();

        var blockedMe = await context.Blocks
            .Where(b => b.BlockedId == currentUserId)
            .Select(b => b.BlockerId)
            .ToListAsync();

        foreach (var u in users)
        {
            u.IsBlockedByMe = blockedByMe.Contains(u.Id);
            u.IsBlockedMe = blockedMe.Contains(u.Id);
        }

        return users.OrderByDescending(u => u.IsOnline);
    }
}