using System;

namespace API.Services;

public interface IEmailService
{
    Task SendConfirmationEmail(string toEmail, string code);
}

