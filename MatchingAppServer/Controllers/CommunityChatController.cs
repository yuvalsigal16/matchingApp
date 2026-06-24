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
                if (msg == null)
                    return BadRequest("Message is null");

                int messageId = msgBL.SendMessage(msg);

                return Ok(new
                {
                    MessageID = messageId,
                    Status = "Message sent successfully"
                });
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
                var messages = msgBL.GetMessagesByChatID(chatID);

                if (messages == null || messages.Count == 0)
                    return NotFound("No messages found");

                return Ok(messages);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }
    }
}
