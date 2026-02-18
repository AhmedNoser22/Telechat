namespace API.Common;
public class Response<T>
{
    public bool IsSuccess{get;}
    public T Data {get;}
    public string Error{get;}
    public string? Messages {get; set;}
    public Response(bool isSuccess,T data,string error,string? messages )
    {
        IsSuccess= isSuccess;
        Data=data;
        Error=error;
        Messages=messages;
    }
    public static Response<T> Success(T data, string? messages="")=> new (true,data,null,messages);
    public static Response<T> Failure(string error)=>new (false,default!,error,null);

}
