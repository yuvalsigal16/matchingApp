using MatchingAppServer.BL;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace MatchingAppServer.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize] // חובה להיות מחובר (טוקן JWT תקין)
    public class CommunityMemberController : ControllerBase
    {
        CommunityMember bl = new CommunityMember();

        // שולף את ה-UserID מתוך הטוקן (לא סומכים על ערכים מהקליינט)
        private int GetCurrentUserId()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim == null)
                throw new UnauthorizedAccessException("No user ID in token");
            return int.Parse(userIdClaim.Value);
        }

        [HttpPost]
        public IActionResult Add(int communityID, int userID)
        {
            try
            {
                int me = GetCurrentUserId();
                // מצטרפים רק בשם עצמך — מניעת הוספת משתמשים אחרים (IDOR)
                if (userID != me)
                    return StatusCode(403, "You can only join as yourself");

                return Ok(bl.Add(communityID, userID));
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [HttpDelete]
        public IActionResult Remove(int communityID, int userID)
        {
            try
            {
                int me = GetCurrentUserId();
                // עוזבים רק בשם עצמך — מניעת הסרת משתמשים אחרים (IDOR)
                if (userID != me)
                    return StatusCode(403, "You can only leave as yourself");

                return Ok(bl.Remove(communityID, userID));
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [HttpGet("{communityID}")]
        public IActionResult GetMembers(int communityID)
        {
            try
            {
                int me = GetCurrentUserId();
                // רק חבר בקהילה רשאי לראות את רשימת החברים
                if (!bl.IsMember(communityID, me))
                    return StatusCode(403, "You are not a member of this community");

                return Ok(bl.GetMembers(communityID));
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

    }
}
