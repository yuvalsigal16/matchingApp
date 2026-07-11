namespace MatchingAppServer.Models
{
    // איפוס סיסמה בפועל — הזיהוי מגיע מהטוקן שבקישור, לא מהמייל.
    public class ResetPasswordRequest
    {
        public string Token { get; set; }
        public string NewPassword { get; set; }
    }
}
