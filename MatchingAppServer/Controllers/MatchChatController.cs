using MatchingAppServer.BL;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

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
        // סדר: sender מה-JWT → שליפת משתתפים → authorization → שמירה → Notification+Push.
        // לא שומרים הודעה לפני בדיקת הרשאה.
        [Authorize]
        [HttpPost("send")]
        public IActionResult Send([FromBody] MatchMessage msg)
        {
            try
            {
                // 1. ה-sender נלקח מה-JWT בלבד (לא מ-msg.SenderUserID שמגיע מהלקוח).
                int senderId = GetCurrentUserId();

                // 2. שליפת משתתפי הצ'אט מהשרת לפי ChatID.
                Match chat = chatBL.GetParticipantsByChatID(msg.ChatID);
                if (chat == null)
                    return NotFound("Chat not found");

                // 3. Authorization: ה-sender חייב להיות אחד משני המשתתפים.
                if (senderId != chat.User1ID && senderId != chat.User2ID)
                    return StatusCode(403, "You are not a participant of this chat");

                // 4. רק אחרי authorization מוצלח — שמירת ההודעה (DB-first). ה-sender מה-JWT.
                msg.SenderUserID = senderId;
                int messageId = msgBL.Send(msg);

                // 5. אחרי הצלחת השמירה — Notification (DB) + Push לצד השני בלבד.
                int receiverId = chat.User1ID == senderId ? chat.User2ID : chat.User1ID;
                new Notification().Create(
                    receiverId,
                    "NewMessage",
                    "הודעה חדשה",
                    "קיבלת הודעה חדשה בצ'אט", // body כללי — בלי תוכן ההודעה
                    relatedID: chat.MatchID
                );

                return Ok(messageId);
            }
            catch (UnauthorizedAccessException)
            {
                return Unauthorized();
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
                // הרשאה: הודעות הצ'אט נחשפות רק לאחד משני משתתפי הצ'אט (מזהה מה-JWT).
                int me = GetCurrentUserId();
                var chat = chatBL.GetParticipantsByChatID(chatID);
                if (chat == null || (chat.User1ID != me && chat.User2ID != me))
                    return Forbid();

                return Ok(msgBL.GetByChatID(chatID));
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        // שולף את UserID של המשתמש המחובר מה-JWT (אותו דפוס כמו BlockUserController).
        private int GetCurrentUserId()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim == null)
                throw new UnauthorizedAccessException("No user ID in token");
            return int.Parse(userIdClaim.Value);
        }
    }
}
