using MatchingAppServer.BL;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace MatchingAppServer.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class MatchDetailsController : ControllerBase
    {
        // שולף את UserID של המשתמש המחובר מה-JWT.
        private int GetCurrentUserId()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim == null)
                throw new UnauthorizedAccessException("No user ID in token");
            return int.Parse(userIdClaim.Value);
        }

        // GET MATCHES BY USER — דורש טוקן; מחזיר רק את ההתאמות של המשתמש המחובר (מונע IDOR).
        [Authorize]
        [HttpGet("user/{userId}")]
        public IActionResult GetUserMatches(int userId)
        {
            try
            {
                MatchDetails model = new MatchDetails();
                var result = model.GetUserMatches(GetCurrentUserId());

                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }
    }
}
