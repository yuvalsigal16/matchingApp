using MatchingAppServer.BL;
using Microsoft.AspNetCore.Mvc;

namespace MatchingAppServer.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class CommunityChatController : ControllerBase
    {
        CommunityChat chatBL = new CommunityChat();
        CommunityMessage msgBL = new CommunityMessage();

        [HttpGet("{communityID}")]
        public IActionResult GetChat(int communityID)
        {
            try
            {
                return Ok(chatBL.GetByCommunityID(communityID));
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [HttpPost("send")]
        public IActionResult Send([FromBody] CommunityMessage msg)
        {
            try
            {
                return Ok(msgBL.SendMessage(msg));
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [HttpGet("messages/{chatID}")]
        public IActionResult GetMessages(int chatID)
        {
            try
            {
                return Ok(msgBL.GetMessagesByChatID(chatID));
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }
    }
}
