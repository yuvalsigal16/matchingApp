using MatchingAppServer.BL;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MatchingAppServer.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class NotificationController : ControllerBase
    {
        Notification bl = new Notification();

        // GET BY USER
        [Authorize]
        [HttpGet("{userID}")]
        public IActionResult GetByUserID(int userID)
        {
            try
            {
                return Ok(bl.GetByUserID(userID));
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
