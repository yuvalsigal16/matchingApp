using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Configuration;

namespace MatchingAppServer.Services
{
    // שליחת מייל דרך Brevo Transactional API (HttpClient בלבד — בלי SDK/תלות נוספת).
    // מפתח וכתובת שולח נקראים מ-appsettings ("Brevo").
    public class BrevoEmailService : IEmailService
    {
        private readonly HttpClient _http;
        private readonly IConfiguration _config;

        public BrevoEmailService(HttpClient http, IConfiguration config)
        {
            _http = http;
            _config = config;
        }

        public async Task SendPasswordResetEmailAsync(string toEmail, string resetLink)
        {
            string apiKey = _config["Brevo:ApiKey"];
            string senderEmail = _config["Brevo:SenderEmail"];
            string senderName = _config["Brevo:SenderName"] ?? "MatchingApp";

            var payload = new
            {
                sender = new { name = senderName, email = senderEmail },
                to = new[] { new { email = toEmail } },
                subject = "איפוס סיסמה — MatchingApp",
                htmlContent =
                    "<html><body dir='rtl' style='font-family:Arial,sans-serif;color:#1A1A1A'>" +
                    "<h2>איפוס סיסמה</h2>" +
                    "<p>קיבלנו בקשה לאיפוס הסיסמה שלך. הקישור תקף ל-15 דקות בלבד.</p>" +
                    $"<p><a href='{resetLink}' style='background:#1A3C40;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;display:inline-block'>איפוס סיסמה</a></p>" +
                    "<p style='color:#65676B;font-size:13px'>אם לא ביקשת לאפס סיסמה, אפשר להתעלם מההודעה הזו.</p>" +
                    "</body></html>"
            };

            using var req = new HttpRequestMessage(HttpMethod.Post, "https://api.brevo.com/v3/smtp/email");
            req.Headers.Add("api-key", apiKey);
            req.Headers.Add("accept", "application/json");
            req.Content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");

            var res = await _http.SendAsync(req);
            res.EnsureSuccessStatusCode();
        }
    }
}
