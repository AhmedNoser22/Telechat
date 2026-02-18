using System.Security.Claims;

namespace API.Extenions;

public static class ClaimsPrinciple
{
    public static string GetUserName(this ClaimsPrincipal user)
    {
        return user.FindFirstValue(ClaimTypes.Name) 
               ?? user.FindFirstValue("unique_name") 
               ?? throw new Exception("Cannot Get UserName");
    }

    public static string GetUserId(this ClaimsPrincipal user)
    {
        return user.FindFirstValue(ClaimTypes.NameIdentifier) 
               ?? user.FindFirstValue("nameid") 
               ?? throw new Exception("Cannot Get UserId");
    }
}