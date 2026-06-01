using MatchingAppServer.BL;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MatchingAppServer.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class MatchRequestController : ControllerBase
    {
        MatchRequest bl = new MatchRequest();

        // SEND REQUEST - TripID אופציונלי (לבקשות צ'אט חופשיות בלי טיול)
        [Authorize]
        [HttpPost]
        public IActionResult Send(int fromUserID, int toUserID, int? tripID = null)
        {
            try
            {
                return Ok(bl.Send(fromUserID, toUserID, tripID));
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
                return Ok(bl.GetPending(userID));
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

    }
}
