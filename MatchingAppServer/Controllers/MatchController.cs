using Microsoft.AspNetCore.Mvc;
using MatchingAppServer.BL;
using Microsoft.AspNetCore.Authorization;
namespace MatchingAppServer.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class MatchController : ControllerBase
    {
        Match bl = new Match();


        // APPROVE REQUEST → creates match
        [Authorize]
        [HttpPost("approve/{requestID}")]
        public IActionResult Approve(int requestID)
        {
            try
            {
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
                return Ok(bl.GetByUserID(userID));
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

    }
}
