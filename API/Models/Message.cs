namespace API.Models;

public class Message
{
    public int Id { get; set; }
    public string? SenderId { get; set; }
    public string? ReceiverId { get; set; }
    public string? Content { get; set; }
    public DateTime CreatedDate { get; set; }
    public bool IsRead { get; set; }
    public bool DeletedBySender { get; set; }
    public bool DeletedByReceiver { get; set; }
}