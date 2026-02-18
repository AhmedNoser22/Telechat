namespace API.DTOs;

public class OnlineUserDto
{
    public string? Id { get; set; }
    public string? UserName { get; set; }
    public string? FullName { get; set; }
    public string? ProfilePicture { get; set; }
    public bool IsOnline { get; set; }
    public string? ConnectionId { get; set; }
    public int UnreadCount { get; set; }
    public bool IsBlockedByMe { get; set; }
    public bool IsBlockedMe { get; set; }
}