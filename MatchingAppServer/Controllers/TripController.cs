using Microsoft.AspNetCore.Mvc;
using MatchingAppServer.BL;
using Microsoft.AspNetCore.Authorization;
using System.Text.Json;


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

        [Authorize]
        [HttpGet("user/{userId}")]
        public IActionResult GetByUser(int userId)
        {
            try
            {
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
                return StatusCode(500, $"Claude API error: {res.StatusCode}");

            var doc = JsonDocument.Parse(text);
            var content = doc.RootElement
                .GetProperty("content")[0]
                .GetProperty("text")
                .GetString();

            var result = JsonDocument.Parse(content!);
            return Ok(result.RootElement);
        }
    }
}
