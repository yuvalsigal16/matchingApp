using MatchingAppServer.BL;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace MatchingAppServer.Controllers
{
    // בקשות קישור-טיול (Consent flow). מבנה זהה ל-MatchRequestController:
    // BL ב-new (לא DI), UserID מה-JWT בלבד, pre-check בעלות + Forbid, try/catch → BadRequest.
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class TripLinkRequestController : ControllerBase
    {
        TripLinkRequest bl = new TripLinkRequest();
        Match matchBl = new Match();

        // שולף את UserID של המשתמש המחובר מה-JWT (מונע התחזות למשתמש אחר).
        private int GetCurrentUserId()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim == null)
                throw new UnauthorizedAccessException("No user ID in token");
            return int.Parse(userIdClaim.Value);
        }

        // האם המשתמש המחובר הוא צד בהתאמה (pre-check הרשאה).
        private bool IsParticipant(int matchID, int userID)
        {
            return matchBl.GetByUserID(userID).Any(m => m.MatchID == matchID);
        }

        // CREATE — משתמש A מבקש להפוך התאמה כללית לשותפות טיול.
        // matchID + tripID כ-query params (עקבי עם MatchRequestController.Send).
        [HttpPost]
        public IActionResult Create(int matchID, int tripID)
        {
            try
            {
                // המבקש נקבע מה-JWT; חייב להיות צד בהתאמה (ה-SP מאמת שוב, כולל בעלות הטיול).
                int uid = GetCurrentUserId();
                if (!IsParticipant(matchID, uid))
                    return Forbid();

                int requestID = bl.CreateRequest(matchID, tripID, uid);
                return Ok(new { requestID });
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        // APPROVE — הצד השני מאשר. מעדכן Matches.TripID (אטומי ב-SP) ומחזיר matchID+tripID.
        [HttpPut("approve/{requestID}")]
        public IActionResult Approve(int requestID)
        {
            try
            {
                int uid = GetCurrentUserId();

                // pre-check: הבקשה קיימת, המאשר צד בהתאמה ואינו המבקש (ה-SP מאמת שוב).
                var req = bl.GetById(requestID);
                if (req == null)
                    return NotFound();
                if (uid == req.RequestedByUserID || !IsParticipant(req.MatchID, uid))
                    return Forbid();

                int matchID = bl.ApproveRequest(requestID, uid, out int tripID);
                if (matchID > 0)
                    return Ok(new { matchID, tripID });

                return NotFound();
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        // REJECT — הצד השני דוחה. Matches.TripID נשאר NULL.
        [HttpPut("reject/{requestID}")]
        public IActionResult Reject(int requestID)
        {
            try
            {
                int uid = GetCurrentUserId();

                var req = bl.GetById(requestID);
                if (req == null)
                    return NotFound();
                if (uid == req.RequestedByUserID || !IsParticipant(req.MatchID, uid))
                    return Forbid();

                int matchID = bl.RejectRequest(requestID, uid);
                if (matchID > 0)
                    return Ok("Rejected");

                return NotFound();
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        // GET — פרטי בקשה בודדת, למסך האישור אצל הצד השני.
        // רק המאשר (הצד השני בהתאמה, לא המבקש) רשאי לקרוא; אחרת 403. לא נמצא → 404.
        [HttpGet("{requestID}")]
        public IActionResult GetById(int requestID)
        {
            try
            {
                int uid = GetCurrentUserId();

                var req = bl.GetById(requestID);
                if (req == null)
                    return NotFound();
                if (uid == req.RequestedByUserID || !IsParticipant(req.MatchID, uid))
                    return Forbid();

                return Ok(new
                {
                    requestID = req.RequestID,
                    matchID = req.MatchID,
                    tripID = req.TripID,
                    requestedByUserID = req.RequestedByUserID,
                    status = req.Status,
                    createdAt = req.CreatedAt,
                });
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }
    }
}
