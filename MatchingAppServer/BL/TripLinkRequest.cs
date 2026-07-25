using MatchingAppServer.DAL;

namespace MatchingAppServer.BL
{
    // בקשת קישור-טיול: הפיכת התאמה כללית (TripID NULL) לשותפות טיול, בהסכמת הצד השני.
    // מבנה זהה ל-MatchRequest: properties + מתודות עסקיות באותה מחלקה, DAL פנימי,
    // ו-Notification.Create בכל פעולה. אינו נוגע ב-Match/MatchRequest/Notification הקיימים.
    public class TripLinkRequest
    {
        public int RequestID { get; set; }
        public int MatchID { get; set; }
        public int TripID { get; set; }
        public int RequestedByUserID { get; set; }
        public string Status { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }

        private readonly TripLinkRequestDAL dal = new();

        // CREATE — משתמש מבקש לקשר טיול לצ'אט. יוצר התראה לצד השני.
        // requesterID מגיע מה-JWT (בקונטרולר), לעולם לא מהלקוח.
        public int CreateRequest(int matchID, int tripID, int requesterID)
        {
            int requestID = dal.Create(matchID, tripID, requesterID);

            // הצד השני בהתאמה = יעד ההתראה. נגזר מההתאמות של המבקש (מקור-אמת בשרת).
            int otherUserID = GetOtherParticipant(matchID, requesterID);
            if (otherUserID > 0)
            {
                new Notification().Create(
                    userID: otherUserID,
                    type: "TripLinkRequest",
                    title: "בקשה להפוך את השיחה לטיול משותף",
                    body: "מישהו רוצה להפוך את השיחה שלכם למרחב תכנון של טיול",
                    relatedID: requestID
                );
            }

            return requestID;
        }

        // APPROVE — הצד השני מאשר. מחזיר MatchID, וב-out את TripID (לתשובת הקונטרולר).
        // שולח התראה למבקש המקורי שהבקשה אושרה.
        public int ApproveRequest(int requestID, int approverID, out int tripID)
        {
            // מזהה המבקש (להתראה) — נשלף לפני האישור, בעוד הבקשה Pending.
            TripLinkRequest req = dal.GetById(requestID);

            int matchID = dal.Approve(requestID, approverID, out tripID);

            if (matchID > 0 && req != null)
            {
                new Notification().Create(
                    userID: req.RequestedByUserID,
                    type: "TripLinkApproved",
                    title: "הבקשה שלך אושרה",
                    body: "השיחה שלכם הפכה לטיול משותף — אפשר להתחיל לתכנן",
                    relatedID: matchID   // ניווט לצ'אט (שהפך לצ'אט-טיול), לא למסך אישור
                );
            }

            return matchID;
        }

        // REJECT — הצד השני דוחה. מחזיר MatchID. שולח התראה למבקש המקורי.
        public int RejectRequest(int requestID, int rejecterID)
        {
            TripLinkRequest req = dal.GetById(requestID);

            int matchID = dal.Reject(requestID, rejecterID);

            if (matchID > 0 && req != null)
            {
                new Notification().Create(
                    userID: req.RequestedByUserID,
                    type: "TripLinkRejected",
                    title: "הבקשה שלך נדחתה",
                    body: "השותף בחר להשאיר את השיחה כרגיל",
                    relatedID: matchID   // ניווט לצ'אט, לא למסך אישור מיושן
                );
            }

            return matchID;
        }

        // GET BY ID — לשימוש ה-pre-check בקונטרולר.
        public TripLinkRequest GetById(int requestID)
        {
            return dal.GetById(requestID);
        }

        // הצד השני בהתאמה — נגזר מההתאמות של המשתמש (Match.GetByUserID הקיים, null-safe).
        // מחזיר 0 אם המשתמש אינו צד בהתאמה (לא אמור לקרות אחרי ה-pre-check).
        private static int GetOtherParticipant(int matchID, int userID)
        {
            var match = new Match().GetByUserID(userID).FirstOrDefault(m => m.MatchID == matchID);
            if (match == null) return 0;
            return match.User1ID == userID ? match.User2ID : match.User1ID;
        }
    }
}
