using MatchingAppServer.BL;
using Microsoft.AspNetCore.Mvc;

namespace MatchingAppServer.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class CommunityMemberController : ControllerBase
    {
        CommunityMember bl = new CommunityMember();

        [HttpPost]
        public IActionResult Add(int communityID, int userID)
        {
            try
            {
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
                return Ok(bl.GetMembers(communityID));
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

    }
}
