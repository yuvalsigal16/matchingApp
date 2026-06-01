using MatchingAppServer.DAL;

namespace MatchingAppServer.BL
{
    public class MatchRequest
    {
        public int RequestID { get; set; }
        public int FromUserID { get; set; }
        public int ToUserID { get; set; }
        public int? TripID { get; set; }   // ★ nullable - תומך בבקשת צ'אט חופשית
        public string Status { get; set; }
        public DateTime RequestDate { get; set; }

        // שדות מועשרים מהפרופיל - מאפשרים לצד הלקוח להציג שם ותמונה
        // בלי קריאות נוספות. NULL אם למשתמש אין פרופיל.
        public string FromFirstName { get; set; }
        public string FromLastName { get; set; }
        public string FromProfileImage { get; set; }
        public DateTime? FromBirthDate { get; set; }

        public string ToFirstName { get; set; }
        public string ToLastName { get; set; }
        public string ToProfileImage { get; set; }
        public DateTime? ToBirthDate { get; set; }

        private readonly MatchRequestDAL dal = new();

        // SEND - tripID אופציונלי
        public int Send(int fromUserID, int toUserID, int? tripID)
        {
            int requestID = dal.Send(fromUserID, toUserID, tripID);

            // יצירת התראה בצד הנמען - "מישהו שלח לך בקשת שיחה"
            new Notification().Create(
                userID: toUserID,
                type: "RequestReceived",
                title: "בקשה חדשה לשיחה",
                body: "התקבלה אצלך בקשה חדשה לפתיחת שיחה",
                relatedID: requestID
            );

            return requestID;
        }

        // APPROVE - מאשר את הבקשה ויוצר רשומת Match. מחזיר MatchID.
        // שולח גם התראה ל-FromUser שהבקשה אושרה.
        public int Approve(int requestID)
        {
            int matchID = dal.Approve(requestID, out int fromUserID);

            if (matchID > 0)
            {
                new Notification().Create(
                    userID: fromUserID,
                    type: "RequestApproved",
                    title: "הבקשה שלך אושרה",
                    body: "המשתמש אישר את בקשתך - אפשר להתחיל לדבר",
                    relatedID: matchID
                );
            }

            return matchID;
        }

        // REJECT - דוחה את הבקשה ושולח התראה ל-FromUser
        public int Reject(int requestID)
        {
            int rows = dal.Reject(requestID, out int fromUserID);

            if (rows > 0 && fromUserID > 0)
            {
                new Notification().Create(
                    userID: fromUserID,
                    type: "RequestRejected",
                    title: "הבקשה שלך נדחתה",
                    body: "המשתמש דחה את בקשת השיחה",
                    relatedID: requestID
                );
            }

            return rows;
        }

        // CANCEL - ביטול בקשה ע"י השולח עצמו
        public int Cancel(int requestID)
        {
            return dal.Cancel(requestID);
        }

        // GET PENDING - מחזיר בקשות נכנסות+יוצאות שעדיין Pending, עם פרטי הפרופיל
        public List<MatchRequest> GetPending(int userID)
        {
            return dal.GetPending(userID);
        }
    }
}
