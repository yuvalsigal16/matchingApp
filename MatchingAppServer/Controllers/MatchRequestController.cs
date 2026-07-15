using MatchingAppServer.BL;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace MatchingAppServer.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class MatchRequestController : ControllerBase
    {
        MatchRequest bl = new MatchRequest();

        // שולף את UserID של המשתמש המחובר מה-JWT.
        private int GetCurrentUserId()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim == null)
                throw new UnauthorizedAccessException("No user ID in token");
            return int.Parse(userIdClaim.Value);
        }

        // SEND REQUEST - TripID אופציונלי (לבקשות צ'אט חופשיות בלי טיול)
        [Authorize]
        [HttpPost]
        public IActionResult Send(int fromUserID, int toUserID, int? tripID = null)
        {
            try
            {
                // השולח נקבע מה-JWT — לא ניתן לשלוח בקשה בשם משתמש אחר.
                return Ok(bl.Send(GetCurrentUserId(), toUserID, tripID));
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        // APPROVE - אישור בקשה. יוצר Match, מחזיר MatchID, ושולח התראה לשולח
        [Authorize]
        [HttpPut("approve/{requestID}")]
        public IActionResult Approve(int requestID)
        {
            try
            {
                // בדיקת בעלות: אפשר לאשר רק בקשה שממתינה אליי (ToUserID == המשתמש המחובר).
                int uid = GetCurrentUserId();
                if (!bl.GetPending(uid).Any(r => r.RequestID == requestID && r.ToUserID == uid))
                    return Forbid();

                int matchID = bl.Approve(requestID);

                if (matchID > 0)
                    return Ok(new { matchID });

                return NotFound();
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        // REJECT
        [Authorize]
        [HttpPut("reject/{requestID}")]
        public IActionResult Reject(int requestID)
        {
            try
            {
                // בדיקת בעלות: אפשר לדחות רק בקשה שממתינה אליי (ToUserID == המשתמש המחובר).
                int uid = GetCurrentUserId();
                if (!bl.GetPending(uid).Any(r => r.RequestID == requestID && r.ToUserID == uid))
                    return Forbid();

                int result = bl.Reject(requestID);

                if (result > 0)
                    return Ok("Rejected");

                return NotFound();
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        // CANCEL
        [Authorize]
        [HttpPut("cancel/{requestID}")]
        public IActionResult Cancel(int requestID)
        {
            try
            {
                // בדיקת בעלות: אפשר לבטל רק בקשה שאני שלחתי (FromUserID == המשתמש המחובר).
                int uid = GetCurrentUserId();
                if (!bl.GetPending(uid).Any(r => r.RequestID == requestID && r.FromUserID == uid))
                    return Forbid();

                int result = bl.Cancel(requestID);

                if (result > 0)
                    return Ok("Cancelled");

                return NotFound();
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        // GET PENDING - מחזיר גם בקשות נכנסות וגם יוצאות, מועשרות בפרטי המשתמש השני
        [Authorize]
        [HttpGet("pending/{userID}")]
        public IActionResult GetPending(int userID)
        {
            try
            {
                // מחזיר רק את הבקשות של המשתמש המחובר (userID מה-JWT, מונע IDOR).
                return Ok(bl.GetPending(GetCurrentUserId()));
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

    }
}
