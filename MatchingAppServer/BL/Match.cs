using MatchingAppServer.DAL;

namespace MatchingAppServer.BL
{
   public class Match
    {
        public int MatchID { get; set; }
        public int RequestID { get; set; }
        public int TripID { get; set; }
        public int User1ID { get; set; }
        public int User2ID { get; set; }
        public DateTime CreatedAt { get; set; }
        public string Status { get; set; }

        private readonly MatchDAL dal = new();

        // APPROVE (creates match + chat)
        public int Approve(int requestID)
        {
            return dal.Approve(requestID);
        }

        // GET MATCHES BY USER
        public List<Match> GetByUserID(int userID)
        {
            return dal.GetByUserID(userID);
        }

        // CLOSE MATCH
        public int Close(int matchID)
        {
            return dal.Close(matchID);
        }

        // MARK JOURNEY STARTED — "יצאנו לדרך"
        public int MarkJourneyStarted(int matchID)
        {
            return dal.MarkJourneyStarted(matchID);
        }
    }
}
