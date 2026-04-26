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

        // SEND REQUEST
        [Authorize]
        [HttpPost]
        public IActionResult Send(int fromUserID, int toUserID, int tripID)
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

        // GET PENDING
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
