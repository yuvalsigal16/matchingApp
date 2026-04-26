using MatchingAppServer.BL;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MatchingAppServer.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class MatchChatController : ControllerBase
    {
        private readonly MatchChat chatBL = new ();
        private readonly MatchMessage msgBL = new();

        // GET CHAT
        [Authorize]
        [HttpGet("{matchID}")]
        public IActionResult GetChat(int matchID)
        {
            try
            {
                return Ok(chatBL.GetByMatchID(matchID));
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        // SEND MESSAGE
        [Authorize]
        [HttpPost("send")]
        public IActionResult Send([FromBody] MatchMessage msg)
        {
            try
            {
                return Ok(msgBL.Send(msg));
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        // GET MESSAGES
        [Authorize]
        [HttpGet("messages/{chatID}")]
        public IActionResult GetMessages(int chatID)
        {
            try
            {
                return Ok(msgBL.GetByChatID(chatID));
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }
    }
}
