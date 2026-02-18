using System;

namespace API.Models;

public class Block
{
    public int Id { get; set; }
    public string BlockerId { get; set; } = null!; 
    public AppUser Blocker { get; set; } = null!;
    public string BlockedId { get; set; } = null!; 
    public AppUser Blocked { get; set; } = null!;
}
