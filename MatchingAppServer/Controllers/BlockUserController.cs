using MatchingAppServer.BL;
using MatchingAppServer.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims; // מאפשר לגשת ל-Claims (תוכן) של הטוקן JWT

namespace MatchingAppServer.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class BlockUserController : ControllerBase
    {
        BlockUser bl = new BlockUser();

        // מתודת עזר פרטית - שולפת את UserID של המשתמש המחובר מהטוקן
        // כך לא צריך לכתוב את אותו קוד בכל מתודה
        private int GetCurrentUserId()
        {
            // User.FindFirst מוצא את ה-Claim הראשון מסוג NameIdentifier
            // בזמן שהטוקן נוצר ב-JwtService.GenerateToken שמנו שם את ה-UserID
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);

            // אם אין claim - סימן שהטוקן לא תקין או שאין משתמש מחובר
            if (userIdClaim == null)
                throw new UnauthorizedAccessException("No user ID in token");

            // המרה של הערך ממחרוזת למספר (כי UserID הוא int)
            return int.Parse(userIdClaim.Value);
        }

        [Authorize] // חובה להיות מחובר (טוקן תקין) כדי לקרוא לפעולה הזו
        [HttpPost("block")]
        public IActionResult Block([FromBody] BlockRequest req)
        {
            try
            {
                // שליפת המשתמש החוסם מהטוקן - לא מה-body!
                // כך אי אפשר "להתחזות" למשתמש אחר ולחסום בשמו
                int userId = GetCurrentUserId();

                // קריאה ל-BL עם UserID אמיתי מהטוקן + BlockedUserId שמגיע מה-body
                bl.Block(userId, req.BlockedUserId);

                return Ok(); // הצלחה - 200
            }
            catch (UnauthorizedAccessException)
            {
                // אם הטוקן לא תקין - מחזירים 401 (לא מורשה)
                return Unauthorized();
            }
            catch (Exception ex)
            {
                // כל שגיאה אחרת (למשל "לא ניתן לחסום את עצמך") - 400
                return BadRequest(ex.Message);
            }
        }

        [Authorize] // חובה להיות מחובר
        [HttpPost("unblock")]
        public IActionResult Unblock([FromBody] BlockRequest req)
        {
            try
            {
                // שליפת המשתמש המבקש ביטול חסימה מהטוקן
                int userId = GetCurrentUserId();

                // ביטול החסימה של UserID (מהטוקן) על BlockedUserId (מה-body)
                bl.UnblockUser(userId, req.BlockedUserId);

                return Ok();
            }
            catch (UnauthorizedAccessException)
            {
                return Unauthorized();
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [Authorize] // חובה להיות מחובר
        [HttpGet] // הסרנו את ה-{userId} מה-URL כי לא צריך אותו יותר - לוקחים מהטוקן
        public IActionResult GetBlocked()
        {
            try
            {
                // שליפת UserID מהטוקן - כך המשתמש רואה רק את הרשימה של עצמו
                // ולא יכול לראות רשימות חסומים של משתמשים אחרים (פרטיות!)
                int userId = GetCurrentUserId();

                // החזרת רשימת החסומים של המשתמש המחובר
                return Ok(bl.GetBlockedUsers(userId));
            }
            catch (UnauthorizedAccessException)
            {
                return Unauthorized();
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

    }
}