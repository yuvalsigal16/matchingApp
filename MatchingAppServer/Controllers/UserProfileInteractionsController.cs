using MatchingAppServer.BL;
using Microsoft.AspNetCore.Mvc;

namespace MatchingAppServer.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class UserProfileInteractionsController : ControllerBase
    {
        UserProfileInteraction bl = new UserProfileInteraction();

        // LOG interaction (query string, כמו שאר הקונטרולרים הפשוטים).
        // POST /api/UserProfileInteractions?fromUserID=1&toUserID=2&interactionType=View
        [HttpPost]
        public IActionResult Add(int fromUserID, int toUserID, string interactionType)
        {
            try
            {
                bl.Add(fromUserID, toUserID, interactionType);
                return Ok(new { message = "Interaction logged" });
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        // GET engagement pairs — הבסיס למנוע ההתנהגותי בקליינט.
        // GET /api/UserProfileInteractions/pairs
        [HttpGet("pairs")]
        public IActionResult GetPairs()
        {
            try
            {
                return Ok(bl.GetEngagementPairs());
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }
    }
}
