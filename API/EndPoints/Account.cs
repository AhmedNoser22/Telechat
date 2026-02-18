using API.Extenions;

namespace API.EndPoints;

public static class Account
{
    public static RouteGroupBuilder MapAccount(this WebApplication app)
    {
        var group = app.MapGroup("/api/account").WithTags("account");

        group.MapPost("/register", async (
            HttpContext httpContext,
            UserManager<AppUser> userManager,
            IEmailService emailService,
            [FromForm] string UserName,
            [FromForm] string fullName,
            [FromForm] string email,
            [FromForm] string password,
            [FromForm] IFormFile? ProfileImage) =>
        {
            var userFromDb = await userManager.FindByEmailAsync(email);
            if (userFromDb is not null)
                return Results.BadRequest(Response<string>.Failure("User is already exist."));

            if (ProfileImage is null)
                return Results.BadRequest(Response<string>.Failure("Profile Image Is Required."));

            var picture = await FileUpload.Upload(ProfileImage);
            picture = $"{httpContext.Request.Scheme}://{httpContext.Request.Host}/uploads/{picture}";

            var user = new AppUser
            {
                Email = email,
                FullName = fullName,
                UserName = UserName,
                ProfileImage = picture,
                EmailConfirmed = false
            };

            var createResult = await userManager.CreateAsync(user, password);
            if (!createResult.Succeeded)
                return Results.BadRequest(Response<string>.Failure(
                    createResult.Errors.Select(x => x.Description).FirstOrDefault()!
                ));

            var code = new Random().Next(100000, 999999).ToString();
            var hasher = new PasswordHasher<AppUser>();
            user.EmailConfirmationCode = hasher.HashPassword(user, code);

            await userManager.UpdateAsync(user);
            await emailService.SendConfirmationEmail(email, code);

            return Results.Ok(Response<string>.Success("", "Confirmation Code Sent To Email"));
        }).DisableAntiforgery();

        group.MapPost("/confirm-email", async (
UserManager<AppUser> userManager,
TokenService tokenService,
ConfirmEmailDto confirmEmailDto) =>
{
    var user = await userManager.FindByEmailAsync(confirmEmailDto.Email);
    if (user is null)
        return Results.BadRequest(Response<string>.Failure("User Not Found"));

    if (string.IsNullOrEmpty(user.EmailConfirmationCode))
        return Results.BadRequest(Response<string>.Failure("Invalid Code"));

    var hasher = new PasswordHasher<AppUser>();
    var verifyResult = hasher.VerifyHashedPassword(
        user,
        user.EmailConfirmationCode,
        confirmEmailDto.Code
    );

    if (verifyResult == PasswordVerificationResult.Failed)
        return Results.BadRequest(Response<string>.Failure("Invalid Code"));

    user.EmailConfirmed = true;
    user.EmailConfirmationCode = null;

    await userManager.UpdateAsync(user);


    var token = tokenService.GenerateToken(user.Id, user.UserName!);

    return Results.Ok(Response<string>.Success(
        token,
        "Email Confirmed Successfully"
    ));
}).DisableAntiforgery();


        group.MapPost("/login", async (
            UserManager<AppUser> userManager,
            TokenService tokenservices,
            LoginDto login) =>
        {
            if (login is null)
                return Results.BadRequest(Response<string>.Failure("Invalid Login Details"));

            var user = await userManager.FindByEmailAsync(login.Email);
            if (user is null)
                return Results.BadRequest(Response<string>.Failure("User Not Found"));

            if (!user.EmailConfirmed)
                return Results.BadRequest(Response<string>.Failure("Email Not Confirmed"));

            var result = await userManager.CheckPasswordAsync(user, login.Password);
            if (!result)
                return Results.BadRequest(Response<string>.Failure("Invalid Password"));

            var token = tokenservices.GenerateToken(user.Id, user.UserName!);
            return Results.Ok(Response<string>.Success(token, "Login Successfully"));
        });

        group.MapGet("/me", async (
            HttpContext context,
            UserManager<AppUser> userManager) =>
        {
            var currentLoggedInUserId = context.User.GetUserId();
            var currentLoggedInUser = await userManager.Users
                .SingleOrDefaultAsync(x => x.Id == currentLoggedInUserId.ToString());

            return Results.Ok(Response<AppUser>.Success(
                currentLoggedInUser!,
                "User Fetched Successfully."
            ));
        }).RequireAuthorization();
        app.MapPost("/api/Chat/upload-voice", async (HttpRequest request) =>
{
    var form = await request.ReadFormAsync();
    var file = form.Files["file"];
    var receiverId = form["receiverId"];

    if (file == null || file.Length == 0)
        return Results.BadRequest("No file uploaded");

    var uploadsPath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "Uploads", "Voice");

    if (!Directory.Exists(uploadsPath))
        Directory.CreateDirectory(uploadsPath);

    var fileName = $"{Guid.NewGuid()}.wav";
    var fullPath = Path.Combine(uploadsPath, fileName);

    using var stream = new FileStream(fullPath, FileMode.Create);
    await file.CopyToAsync(stream);

    var url = $"/Uploads/Voice/{fileName}";
    return Results.Ok(new { Url = url });

}).DisableAntiforgery();


        return group;
    }
}
