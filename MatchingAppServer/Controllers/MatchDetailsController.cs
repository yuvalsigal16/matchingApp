using MatchingAppServer.BL;
using Microsoft.AspNetCore.Mvc;

namespace MatchingAppServer.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class MatchDetailsController : ControllerBase
    {
        [HttpGet("user/{userId}")]
        public IActionResult GetUserMatches(int userId)
        {
            try
            {
                MatchDetails model = new MatchDetails();
                var result = model.GetUserMatches(userId);

                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }
    }
}
