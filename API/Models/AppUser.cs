namespace API.Models;

public class AppUser : IdentityUser
{
    public string? FullName { get; set; }
    public string? ProfileImage { get; set; }
    public string? EmailConfirmationCode { get; set; }
    public ICollection<Block> BlockedUsers { get; set; } = new List<Block>();
    public ICollection<Block> BlockedBy { get; set; } = new List<Block>();

}
