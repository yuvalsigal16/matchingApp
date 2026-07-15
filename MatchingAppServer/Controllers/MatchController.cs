using Microsoft.AspNetCore.Mvc;
using MatchingAppServer.BL;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;
namespace MatchingAppServer.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class MatchController : ControllerBase
    {
        Match bl = new Match();

        // שולף את UserID של המשתמש המחובר מה-JWT.
        private int GetCurrentUserId()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim == null)
                throw new UnauthorizedAccessException("No user ID in token");
            return int.Parse(userIdClaim.Value);
        }


        // APPROVE REQUEST → creates match
        [Authorize]
        [HttpPost("approve/{requestID}")]
        public IActionResult Approve(int requestID)
        {
            try
            {
                // בדיקת בעלות: אפשר לאשר רק בקשה שממתינה *אליי* (ToUserID == המשתמש המחובר).
                int uid = GetCurrentUserId();
                if (!new MatchRequest().GetPending(uid).Any(r => r.RequestID == requestID && r.ToUserID == uid))
                    return Forbid();

                int matchID = bl.Approve(requestID);
                return Ok(matchID);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        // GET MATCHES BY USER
        [Authorize]
        [HttpGet("user/{userID}")]
        public IActionResult GetByUser(int userID)
        {
            try
            {
                // מחזיר רק את ההתאמות של המשתמש המחובר (userID מה-JWT, מונע IDOR).
                return Ok(bl.GetByUserID(GetCurrentUserId()));
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        // CLOSE MATCH
        [Authorize]
        [HttpPut("close/{matchID}")]
        public IActionResult Close(int matchID)
        {
            try
            {
                // בדיקת בעלות: רק משתתף ב-Match יכול לסגור אותו.
                int uid = GetCurrentUserId();
                if (!bl.GetByUserID(uid).Any(m => m.MatchID == matchID))
                    return Forbid();

                int result = bl.Close(matchID);

                if (result > 0)
                    return Ok("Closed");

                return NotFound();
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        // MARK JOURNEY STARTED — "יצאנו לדרך" (מסמן JourneyStarted=1, לא נוגע ב-Status)
        [Authorize]
        [HttpPut("journey/{matchID}")]
        public IActionResult MarkJourneyStarted(int matchID)
        {
            try
            {
                // בדיקת בעלות: רק משתתף ב-Match יכול לסמן "יצאנו לדרך".
                int uid = GetCurrentUserId();
                if (!bl.GetByUserID(uid).Any(m => m.MatchID == matchID))
                    return Forbid();

                int result = bl.MarkJourneyStarted(matchID);

                if (result > 0)
                    return Ok("JourneyStarted");

                return NotFound();
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

    }
}
