using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Text;

namespace API;

public static class DependencyInjection
{
    public static IServiceCollection AddMethodofDependencyInjection(this IServiceCollection Services, IConfiguration configuration)
    {
        Services.AddDbContext<AppDbContext>(options=>options.UseSqlServer
        (configuration.GetConnectionString("DefaultConnection")));

        Services.AddIdentityCore<AppUser>()
            .AddEntityFrameworkStores<AppDbContext>()
            .AddDefaultTokenProviders();

        Services.Configure<EmailSetting>(configuration.GetSection("EmailSetting"));
        Services.AddScoped<IEmailService, EmailService>();

        Services.AddAuthentication(opt =>
        {
            opt.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
            opt.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
            opt.DefaultScheme = JwtBearerDefaults.AuthenticationScheme;
        })
        .AddJwtBearer(options =>
        {
            options.SaveToken = true;
            options.RequireHttpsMetadata = false;

            options.TokenValidationParameters = new TokenValidationParameters
            {
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = new SymmetricSecurityKey(
                    Encoding.UTF8.GetBytes(configuration.GetSection("JWT:Key").Value!)
                ),
                ValidateIssuer = false,
                ValidateAudience = false
            };
            // SignalR
            options.Events = new JwtBearerEvents
            {
                OnMessageReceived = context =>
                {
                    var accessToken = context.Request.Query["access_token"];

                    var path = context.HttpContext.Request.Path;
                    if (!string.IsNullOrEmpty(accessToken) &&
                        path.StartsWithSegments("/hubs/chat"))
                    {
                        context.Token = accessToken;
                    }

                    return Task.CompletedTask;
                }
                // End SignalR
            };
        });

        Services.AddScoped<TokenService>();

        return Services;
    }
}
