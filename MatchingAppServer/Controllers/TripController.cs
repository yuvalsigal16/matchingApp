using Microsoft.AspNetCore.Mvc;
using MatchingAppServer.BL;
using Microsoft.AspNetCore.Authorization;
using System.Text.Json;
using System.Security.Claims;



namespace MatchingAppServer.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class TripController : ControllerBase
    {
        private readonly Trip bl = new Trip();
        private readonly IConfiguration _config;
        private static readonly HttpClient _http = new HttpClient();

        public TripController(IConfiguration config)
        {
            _config = config;
        }

        // שולף את UserID של המשתמש המחובר מה-JWT.
        private int GetCurrentUserId()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim == null)
                throw new UnauthorizedAccessException("No user ID in token");
            return int.Parse(userIdClaim.Value);
        }

        [Authorize]
        [HttpGet("user/{userId}")]
        public IActionResult GetByUser(int userId)
        {
            try
            {
                // דורש טוקן; טיולים גלויים לכל משתמש מחובר (למשל צפייה בטיולים של התאמה
                // במסך הפרופיל). ה-userId מגיע מהכתובת בכוונה — זה מידע משותף למטיילים, לא IDOR.
                return Ok(bl.GetUserTrips(userId));
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [Authorize]
        [HttpGet("{tripId}")]
        public IActionResult GetTripById(int tripId)
        {
            try
            {
                var trip = bl.GetTripById(tripId);

                if (trip == null)
                    return NotFound();

                return Ok(trip);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [Authorize]
        [HttpPost]
        public IActionResult Add([FromBody] Trip trip)
        {
            try
            {
                // הבעלים נקבע מה-JWT — לא ניתן ליצור טיול בשם משתמש אחר.
                trip.CreatedByUserID = GetCurrentUserId();
                return Ok(bl.AddTrip(trip));
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [Authorize]
        [HttpPut]
        public IActionResult Update([FromBody] Trip trip)
        {
            try
            {
                // בדיקת בעלות: רק יוצר הטיול יכול לעדכן אותו.
                int uid = GetCurrentUserId();
                var existing = bl.GetTripById(trip.TripID);
                if (existing == null)
                    return NotFound();
                if (existing.CreatedByUserID != uid)
                    return Forbid();
                trip.CreatedByUserID = uid;

                int result = bl.UpdateTrip(trip);

                if (result > 0)
                    return Ok("Updated");

                return NotFound();
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [Authorize]
        [HttpDelete("{tripId}")]
        public IActionResult Delete(int tripId)
        {
            try
            {
                // בדיקת בעלות: רק יוצר הטיול יכול למחוק אותו.
                var existing = bl.GetTripById(tripId);
                if (existing == null)
                    return NotFound();
                if (existing.CreatedByUserID != GetCurrentUserId())
                    return Forbid();

                int result = bl.DeleteTrip(tripId);

                if (result == 1)
                    return Ok("Deleted");

                return NotFound();
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [Authorize]
        [HttpGet("recommend-period")]
        public async Task<IActionResult> RecommendPeriod([FromQuery] string destination)
        {
            if (string.IsNullOrWhiteSpace(destination))
                return BadRequest("Destination is required");

            var apiKey = _config["Anthropic:ApiKey"];
            if (string.IsNullOrEmpty(apiKey) || apiKey == "YOUR_ANTHROPIC_API_KEY_HERE")
                return StatusCode(500, "Anthropic API key not configured");

            var prompt =
                $"You are a travel expert. What are the best 4 months to visit {destination} for tourism? " +
                "Consider shoulder seasons, local climate, crowds, prices, and cultural events. " +
                "Respond ONLY with valid JSON (no markdown, no extra text): " +
                "{\"months\": [5, 6, 9, 10], \"reason\": \"brief reason in Hebrew, max 15 words\"}. " +
                "months is an array of integers 1-12 (1=January, 12=December).";

            var body = new
            {
                model = "claude-haiku-4-5-20251001",
                max_tokens = 200,
                messages = new[] { new { role = "user", content = prompt } }
            };

            using var req = new HttpRequestMessage(HttpMethod.Post, "https://api.anthropic.com/v1/messages");
            req.Headers.Add("x-api-key", apiKey);
            req.Headers.Add("anthropic-version", "2023-06-01");
            req.Content = new StringContent(
                JsonSerializer.Serialize(body),
                System.Text.Encoding.UTF8,
                "application/json"
            );

            var res = await _http.SendAsync(req);
            var text = await res.Content.ReadAsStringAsync();

            if (!res.IsSuccessStatusCode)
                return StatusCode(500, $"Claude API error: {res.StatusCode} - {text}");

            try
            {
                var doc = JsonDocument.Parse(text);
                var content = doc.RootElement
                    .GetProperty("content")[0]
                    .GetProperty("text")
                    .GetString() ?? "";

                // Claude לפעמים עוטף את ה-JSON ב-```json ... ``` או מוסיף טקסט.
                // מחלצים את אובייקט ה-JSON עצמו (מהסוגר המסולסל הראשון עד האחרון)
                // כדי שה-Parse לא יקרוס ויחזיר 500 גנרי.
                int start = content.IndexOf('{');
                int end = content.LastIndexOf('}');
                if (start < 0 || end < start)
                    return StatusCode(500, $"Claude returned unexpected format: {content}");

                var jsonOnly = content.Substring(start, end - start + 1);
                var result = JsonDocument.Parse(jsonOnly);
                return Ok(result.RootElement);
            }
            catch (Exception ex)
            {
                // לא מחזירים 500 גנרי בלי הסבר — מקל על איתור התקלה בעתיד.
                return StatusCode(500, $"Failed to parse Claude response: {ex.Message}");
            }
        }
    }

}

