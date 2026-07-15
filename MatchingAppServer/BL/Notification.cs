using MatchingAppServer.DAL;
using MatchingAppServer.Services;

namespace MatchingAppServer.BL
{
    public class Notification
    {
        public int NotificationID { get; set; }
        public int UserID { get; set; }
        public string Type { get; set; }       // 'RequestReceived' | 'RequestApproved' | 'RequestRejected'
        public string Title { get; set; }
        public string Body { get; set; }
        public int? RelatedID { get; set; }    // בד"כ RequestID / MatchID
        public bool IsRead { get; set; }
        public DateTime CreatedAt { get; set; }

        private readonly NotificationDAL dal = new();

        // CREATE - יוצר התראה ב-DB ושולח push (אם יש token)
        public int Create(int userID, string type, string title, string body = null, int? relatedID = null)
        {
            int notificationID = dal.Create(userID, type, title, body, relatedID);

            // שליחת Push notification במקביל - לא חוסם את התגובה אם נכשל
            try
            {
                string token = new User().GetExpoPushToken(userID);
                Console.WriteLine($"[Push] Notification.Create userID={userID} type={type} tokenFound={!string.IsNullOrEmpty(token)}");
                if (!string.IsNullOrEmpty(token))
                {
                    // מיסוך ה-token בלוג — לא מדפיסים אותו במלואו (מידע רגיש).
                    string tokenPrefix = token.Length > 24 ? token.Substring(0, 24) + "...]" : token;
                    Console.WriteLine($"[Push] Sending push to userID={userID}, tokenPrefix={tokenPrefix}");
                    _ = ExpoPushService.SendAsync(token, title, body, new { type, relatedID });
                }
                else
                {
                    Console.WriteLine($"[Push] No push token for userID={userID} — skipping send");
                }
            }
            catch (Exception ex)
            {
                // לא מפילים בקשה רק כי push נכשל — אבל כן רושמים ללוג
                Console.WriteLine($"[Push] Notification.Create push error: {ex.Message}");
            }

            return notificationID;
        }

        // GET BY USER
        public List<Notification> GetByUserID(int userID)
        {
            return dal.GetByUserID(userID);
        }

        // MARK READ
        public int MarkRead(int notificationID)
        {
            return dal.MarkRead(notificationID);
        }
    }
}
