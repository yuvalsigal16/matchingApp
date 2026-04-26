using Microsoft.AspNetCore.Mvc;
using MatchingAppServer.BL;

namespace MatchingAppServer.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class UserInterestController : ControllerBase
    {
        UserInterest bl = new UserInterest();

        [HttpPost]
        public IActionResult Add(int userId, int interestId)
        {
            try
            {
                return Ok(bl.Add(userId, interestId));
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [HttpDelete]
        public IActionResult Delete(int userId, int interestId)
        {
            try
            {
                return Ok(bl.Delete(userId, interestId));
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [HttpGet("{userId}")]
        public IActionResult GetByUserId(int userId)
        {
            try
            {
                return Ok(bl.GetByUserId(userId));
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }
    }
}
