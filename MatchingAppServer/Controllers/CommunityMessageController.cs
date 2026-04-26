using MatchingAppServer.BL;
using MatchingAppServer.DAL;
using Microsoft.AspNetCore.Mvc;

namespace MatchingAppServer.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class CommunityMessageController : ControllerBase
    {
        CommunityMessage messageBl = new CommunityMessage();

        // POST: api/CommunityMessage/send
        [HttpPost("send")]
        public IActionResult SendMessage([FromBody] CommunityMessage msg)
        {
            try
            {
                if (msg == null)
                    return BadRequest("Message is null");

                int messageId = messageBl.SendMessage(msg);

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

        // GET: api/CommunityMessage/chat/5
        [HttpGet("chat/{chatId}")]
        public IActionResult GetMessagesByChatID(int chatId)
        {
            try
            {
                var messages = messageBl.GetMessagesByChatID(chatId);

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
