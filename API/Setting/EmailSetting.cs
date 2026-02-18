namespace API.Setting;

public class EmailSetting
{
    public string Email { get; set; } = null!;
    public string DisplayName { get; set; } = null!;
    public string Host { get; set; } = null!;
    public int Port { get; set; }
    public string Password { get; set; } = null!;
}

