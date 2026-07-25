using Microsoft.AspNetCore.Mvc;
using MatchingAppServer.BL;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;

namespace MatchingAppServer.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class UserInterestController : ControllerBase
    {
        UserInterest bl = new UserInterest();

        // שולף את UserID של המשתמש המחובר מה-JWT (מונע IDOR — מתעלמים ממזהה שמגיע מהלקוח).
        private int GetCurrentUserId()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim == null)
                throw new UnauthorizedAccessException("No user ID in token");
            return int.Parse(userIdClaim.Value);
        }

        [HttpPost]
        public IActionResult Add(int userId, int interestId)
        {
            try
            {
                return Ok(bl.Add(GetCurrentUserId(), interestId));
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
                return Ok(bl.Delete(GetCurrentUserId(), interestId));
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
                return Ok(bl.GetByUserId(GetCurrentUserId()));
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }
    }
}
