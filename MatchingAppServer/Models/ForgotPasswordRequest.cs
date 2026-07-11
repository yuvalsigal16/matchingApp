namespace MatchingAppServer.Models
{
    // בקשת "שכחתי סיסמה" — זיהוי לפי מייל בלבד.
    public class ForgotPasswordRequest
    {
        public string Email { get; set; }
    }
}
