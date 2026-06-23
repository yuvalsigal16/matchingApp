using MatchingAppServer.DAL;

namespace MatchingAppServer.BL
{
    // אינטראקציה בין משתמשים (צפייה/לייק/בקשת צ'אט) — הבסיס למנוע ההתנהגותי.
    // Weight מאוכלס רק בתוצאות GetEngagementPairs (זוגות מסוכמים לפי משקל).
    public class UserProfileInteraction
    {
        public int FromUserID { get; set; }
        public int ToUserID { get; set; }
        public string InteractionType { get; set; }
        public int Weight { get; set; }

        private readonly UserProfileInteractionsDAL dal = new UserProfileInteractionsDAL();

        // רישום אינטראקציה (View / Like / ChatRequest).
        public int Add(int fromUserID, int toUserID, string interactionType)
        {
            return dal.Add(fromUserID, toUserID, interactionType);
        }

        // זוגות "מי התעניין במי" עם משקל — מאינטראקציות + בקשות התאמה.
        public List<UserProfileInteraction> GetEngagementPairs()
        {
            return dal.GetEngagementPairs();
        }
    }
}
