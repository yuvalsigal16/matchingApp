using MatchingAppServer.BL;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace MatchingAppServer.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class NotificationController : ControllerBase
    {
        Notification bl = new Notification();

        // שולף את UserID של המשתמש המחובר מה-JWT.
        private int GetCurrentUserId()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim == null)
                throw new UnauthorizedAccessException("No user ID in token");
            return int.Parse(userIdClaim.Value);
        }

        // GET BY USER
        [Authorize]
        [HttpGet("{userID}")]
        public IActionResult GetByUserID(int userID)
        {
            try
            {
                // מחזיר רק את ההתראות של המשתמש המחובר (userID מה-JWT, מונע IDOR).
                return Ok(bl.GetByUserID(GetCurrentUserId()));
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        // MARK AS READ
        [Authorize]
        [HttpPut("read/{notificationID}")]
        public IActionResult MarkRead(int notificationID)
        {
            try
            {
                // בדיקת בעלות: אפשר לסמן כנקראה רק התראה של המשתמש המחובר.
                int uid = GetCurrentUserId();
                if (!bl.GetByUserID(uid).Any(n => n.NotificationID == notificationID))
                    return Forbid();

                int result = bl.MarkRead(notificationID);

                if (result > 0)
                    return Ok("Marked as read");

                return NotFound();
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }
    }
}
