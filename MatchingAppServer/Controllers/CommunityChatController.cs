using MatchingAppServer.BL;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace MatchingAppServer.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize] // חובה להיות מחובר (טוקן JWT תקין) לכל פעולות הצ'אט הקבוצתי
    public class CommunityChatController : ControllerBase
    {
        CommunityChat chatBL = new CommunityChat();
        CommunityMessage msgBL = new CommunityMessage();
        CommunityMember memberBL = new CommunityMember();

        // שולף את ה-UserID מתוך הטוקן (לא סומכים על ערכים מהקליינט)
        private int GetCurrentUserId()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim == null)
                throw new UnauthorizedAccessException("No user ID in token");
            return int.Parse(userIdClaim.Value);
        }

        [HttpGet("{communityID}")]
        public IActionResult GetChat(int communityID)
        {
            try
            {
                int me = GetCurrentUserId();
                if (!memberBL.IsMember(communityID, me))
                    return StatusCode(403, "You are not a member of this community");

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

                int me = GetCurrentUserId();

                // איתור הקהילה של הצ'אט ובדיקת חברות לפני שליחה
                var chat = chatBL.GetByChatID(msg.CommunityChatID);
                if (chat == null)
                    return NotFound("Community chat not found");
                if (!memberBL.IsMember(chat.CommunityID, me))
                    return StatusCode(403, "You are not a member of this community");

                // לא סומכים על senderUserID מהקליינט — קובעים אותו מהטוקן (מניעת התחזות)
                msg.SenderUserID = me;

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
                int me = GetCurrentUserId();

                // איתור הקהילה של הצ'אט ובדיקת חברות לפני קריאת הודעות
                var chat = chatBL.GetByChatID(chatID);
                if (chat == null)
                    return NotFound("Community chat not found");
                if (!memberBL.IsMember(chat.CommunityID, me))
                    return StatusCode(403, "You are not a member of this community");

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
