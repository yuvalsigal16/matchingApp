using System.Net.Http;
using System.Net.Http.Json;

namespace MatchingAppServer.BL
{
    /// <summary>
    /// שולח push notifications דרך ה-API הציבורי של Expo.
    /// Expo דוחפים את ההודעה בפועל ל-Apple/Google ומשם לטלפון.
    /// אין צורך ב-API Key — Expo מקבלים את ה-ExpoPushToken בלבד.
    /// </summary>
    public static class ExpoPushService
    {
        private const string ExpoPushUrl = "https://exp.host/--/api/v2/push/send";

        // מופע אחד משותף ל-HttpClient — best practice של .NET
        private static readonly HttpClient _http = new HttpClient();

        /// <summary>
        /// שולח התראה אחת לטלפון. expoPushToken בפורמט: "ExponentPushToken[xxx]".
        /// data הוא אובייקט אופציונלי (anonymous type) שעובר ל-app בתוך ההודעה
        /// — נשמש בלקוח כדי לנווט למסך הנכון בלחיצה.
        /// </summary>
        public static async Task<bool> SendAsync(string expoPushToken, string title, string body, object data = null)
        {
            if (string.IsNullOrWhiteSpace(expoPushToken))
                return false;

            var payload = new
            {
                to = expoPushToken,
                title = title ?? "התראה",
                body = body ?? "",
                sound = "default",
                data = data
            };

            try
            {
                var res = await _http.PostAsJsonAsync(ExpoPushUrl, payload);
                return res.IsSuccessStatusCode;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"ExpoPushService.SendAsync failed: {ex.Message}");
                return false;
            }
        }
    }
}
