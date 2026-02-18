namespace API.Services;
public class EmailService : IEmailService
{
    private readonly EmailSetting _settings;

    public EmailService(IOptions<EmailSetting> settings)
    {
        _settings = settings.Value;
    }

    public async Task SendConfirmationEmail(string toEmail, string code)
    {
        var message = new MimeMessage();
        message.From.Add(new MailboxAddress(_settings.DisplayName, _settings.Email));
        message.To.Add(MailboxAddress.Parse(toEmail));
        message.Subject = "Confirm Your Email ❤️";

        var body = $@"
<!DOCTYPE html>
<html>
<body style='background:#ffe6eb;font-family:Arial;padding:30px'>
<div style='max-width:500px;margin:auto;background:white;border-radius:20px;padding:30px;text-align:center'>
<h1 style='color:#e6005c'>Welcome to Telechat 💬❤️</h1>
<p style='font-size:16px;color:#444'>Use this code to confirm your email</p>
<div style='font-size:36px;letter-spacing:8px;color:#ff004f;font-weight:bold;margin:20px 0'>
{code}
</div>
<p style='color:#777'>This code will expire soon</p>
</div>
</body>
</html>";

        message.Body = new BodyBuilder { HtmlBody = body }.ToMessageBody();

        using var client = new SmtpClient();
        await client.ConnectAsync(_settings.Host, _settings.Port, false);
        await client.AuthenticateAsync(_settings.Email, _settings.Password);
        await client.SendAsync(message);
        await client.DisconnectAsync(true);
    }
}
