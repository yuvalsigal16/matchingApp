namespace MatchingAppServer.Services
{
    // ממשק שליחת מייל. מאפשר להחליף ספק (Brevo/אחר) בלי לגעת ב-Controller/BL.
    public interface IEmailService
    {
        Task SendPasswordResetEmailAsync(string toEmail, string resetLink);
    }
}
