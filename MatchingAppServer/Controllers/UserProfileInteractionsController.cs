using MatchingAppServer.BL;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;

namespace MatchingAppServer.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class UserProfileInteractionsController : ControllerBase
    {
        UserProfileInteraction bl = new UserProfileInteraction();

        // שולף את UserID של המשתמש המחובר מה-JWT (מונע IDOR — מתעלמים ממזהה שמגיע מהלקוח).
        private int GetCurrentUserId()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim == null)
                throw new UnauthorizedAccessException("No user ID in token");
            return int.Parse(userIdClaim.Value);
        }

        // LOG interaction (query string, כמו שאר הקונטרולרים הפשוטים).
        // POST /api/UserProfileInteractions?fromUserID=1&toUserID=2&interactionType=View
        [HttpPost]
        public IActionResult Add(int fromUserID, int toUserID, string interactionType)
        {
            try
            {
                bl.Add(GetCurrentUserId(), toUserID, interactionType);
                return Ok(new { message = "Interaction logged" });
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        // GET engagement pairs — הבסיס למנוע ההתנהגותי בקליינט.
        // GET /api/UserProfileInteractions/pairs
        [HttpGet("pairs")]
        public IActionResult GetPairs()
        {
            try
            {
                return Ok(bl.GetEngagementPairs());
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }
    }
}
