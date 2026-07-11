namespace MatchingAppServer.BL
{
    // תוצאת שליפת טוקן איפוס מה-DB (dbo.GetPasswordResetToken).
    // האימות (בתוקף / לא נוצל) מתבצע ב-BL, לא ב-SQL.
    public class PasswordResetToken
    {
        public int TokenID { get; set; }
        public int UserID { get; set; }
        public DateTime ExpiresAt { get; set; }
        public bool Used { get; set; }
    }
}
